-- Both apps share these tables. Install after the existing schema/functions.
-- This queues future request transitions only; it never emails existing history.
begin;

create table if not exists public.workforce_email_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false
);
insert into public.workforce_email_settings(id) values(true) on conflict do nothing;

create table if not exists public.workforce_email_outbox (
  id uuid primary key default gen_random_uuid(),
  request_table text not null check (request_table in ('leave_requests','attendance_correction_requests','attendance_requests')),
  request_id text not null,
  event_number integer not null,
  request_state text not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','blocked','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  recipient_email text,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(request_table,request_id,event_number)
);
create index if not exists workforce_email_due on public.workforce_email_outbox(available_at)
  where status in ('pending','processing');

alter table public.workforce_email_settings enable row level security;
alter table public.workforce_email_outbox enable row level security;
revoke all on public.workforce_email_settings, public.workforce_email_outbox from public, anon, authenticated;
grant select, update on public.workforce_email_settings to service_role;
grant select, update on public.workforce_email_outbox to service_role;

-- Use the same canonical stage for legacy statuses and current RPC updates.
-- JSON supports attendance tables that do not yet have approval_status columns.
create or replace function public.workforce_email_state(p_row jsonb)
returns text language plpgsql stable security definer set search_path=public as $$
declare
  v_status text := lower(coalesce(p_row->>'status','pending'));
  v_approval text := lower(coalesce(p_row->>'approval_status',''));
  v_level integer;
begin
  if v_status in ('approved','rejected','cancelled','paid') then return v_status; end if;
  if v_status not like 'pending%' then return v_status; end if;
  v_level := case v_status
    when 'pending_line_1' then 1 when 'pending_line_2' then 2
    when 'pending_senior' then 3 when 'pending_office' then 4
    else null end;
  if v_level is null and v_status ~ '^pending_level_[1-4]$' then
    v_level := right(v_status,1)::integer;
  end if;
  if v_level is null and v_approval ~ '^pending_level_[1-4]$' then
    v_level := right(v_approval,1)::integer;
  end if;
  if v_level is null and p_row->>'current_approval_level' ~ '^[1-4]$' then
    v_level := (p_row->>'current_approval_level')::integer;
  end if;
  if v_level is null then
    select min(level_number) into v_level from public.workforce_approval_chain(p_row->>'user_id');
  end if;
  return 'pending_level_'||coalesce(v_level,1);
end;
$$;

create or replace function public.queue_workforce_email()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_state text; v_number integer;
begin
  v_state := public.workforce_email_state(to_jsonb(new));
  if tg_op='UPDATE' then
    if v_state=public.workforce_email_state(to_jsonb(old)) then return new; end if;
  end if;
  if v_state not in ('approved','rejected') and v_state not like 'pending_level_%' then return new; end if;
  -- The source request's row lock serializes events for this request.
  select coalesce(max(event_number),0)+1 into v_number from public.workforce_email_outbox
    where request_table=tg_table_name and request_id=new.id::text;
  insert into public.workforce_email_outbox(request_table,request_id,event_number,request_state)
    values(tg_table_name,new.id::text,v_number,v_state);
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['leave_requests','attendance_correction_requests','attendance_requests'] loop
    execute format('drop trigger if exists workforce_email_transition on public.%I',t);
    execute format('create trigger workforce_email_transition after insert or update on public.%I for each row execute function public.queue_workforce_email()',t);
  end loop;
end; $$;

create or replace function public.claim_workforce_emails(p_limit integer default 5)
returns setof public.workforce_email_outbox
language plpgsql security definer set search_path=public as $$
begin
  if not exists(select 1 from public.workforce_email_settings where id and enabled) then return; end if;
  update public.workforce_email_outbox set status='failed',last_error='DELIVERY_ATTEMPTS_EXHAUSTED',lease_token=null,lease_until=null
    where status='processing' and lease_until<now() and attempts>=5;
  return query
    with due as (
      select id from public.workforce_email_outbox
      where attempts<5 and ((status='pending' and available_at<=now()) or (status='processing' and lease_until<now()))
      order by available_at,created_at,id
      for update skip locked limit greatest(1,least(coalesce(p_limit,5),5))
    )
    update public.workforce_email_outbox o
      set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
      from due where o.id=due.id returning o.*;
end;
$$;

-- Re-read the committed request and hierarchy just before delivery. Do not send
-- an old approval task after another approver has already advanced the request.
create or replace function public.prepare_workforce_email(p_id uuid,p_lease_token uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_job public.workforce_email_outbox;
  v_request jsonb; v_recipient jsonb; v_requester jsonb;
  v_recipient_id text; v_state text; v_level integer;
  v_start date; v_days numeric; v_balance numeric;
begin
  select * into v_job from public.workforce_email_outbox
    where id=p_id and status='processing' and lease_token=p_lease_token and lease_until>now() for update;
  if v_job.id is null then return null; end if;
  if not exists(select 1 from public.workforce_email_settings where id and enabled) then
    update public.workforce_email_outbox set status='pending',attempts=greatest(0,attempts-1),lease_token=null,lease_until=null where id=p_id;
    return null;
  end if;
  execute format('select to_jsonb(r) from public.%I r where id::text=$1',v_job.request_table)
    into v_request using v_job.request_id;
  if v_request is not null then v_state := public.workforce_email_state(v_request); end if;
  if v_request is null or v_state is distinct from v_job.request_state or exists(
    select 1 from public.workforce_email_outbox where request_table=v_job.request_table
      and request_id=v_job.request_id and event_number>v_job.event_number
  ) then
    update public.workforce_email_outbox set status='skipped',last_error='SUPERSEDED_OR_DELETED',lease_token=null,lease_until=null where id=p_id;
    return null;
  end if;
  select to_jsonb(u) into v_requester from public.user_accounts u where id::text=v_request->>'user_id';
  if v_state like 'pending_level_%' then
    v_level := right(v_state,1)::integer;
    select approver_id into v_recipient_id from public.workforce_approval_chain(v_request->>'user_id') where level_number=v_level;
    if v_recipient_id=v_request->>'user_id' then v_recipient_id := null; end if;
  else
    v_recipient_id := v_request->>'user_id';
  end if;
  select to_jsonb(u) into v_recipient from public.user_accounts u where id::text=v_recipient_id;
  if v_requester is null or v_recipient is null
    or coalesce(v_recipient->>'email','') !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'
    or lower(coalesce(v_recipient->>'status','active')) in ('inactive','suspended','resigned','terminated','nonaktif')
    or lower(coalesce(v_recipient->>'employment_status','active')) in ('inactive','suspended','resigned','terminated','nonaktif') then
    update public.workforce_email_outbox set status='blocked',last_error='RECIPIENT_MISSING_INVALID_OR_INACTIVE',lease_token=null,lease_until=null where id=p_id;
    return null;
  end if;
  update public.workforce_email_outbox set recipient_email=lower(v_recipient->>'email') where id=p_id;
  -- Duration and balance are best effort: an absent column or balance table must
  -- never block the notification itself.
  v_start := coalesce((v_request->>'start_date')::date,(v_request->>'attendance_date')::date,
    (v_request->>'request_date')::date,(v_request->>'date')::date);
  v_days := coalesce(nullif(v_request->>'total_days','')::numeric,
    case when v_request->>'end_date' is not null and v_start is not null
      then ((v_request->>'end_date')::date - v_start + 1) else 1 end);
  if v_job.request_table='leave_requests' and v_start is not null then
    begin
      select greatest(0,b.entitlement_days+b.carry_forward_days-b.collective_leave_days-b.used_days-b.expired_days)
        into v_balance from public.leave_balance_periods b
        where b.user_id::text=v_request->>'user_id' and b.status='active'
          and b.period_start<=v_start and b.period_end>=v_start
        order by b.period_start desc limit 1;
    exception when others then v_balance := null;
    end;
  end if;
  return jsonb_build_object(
    'id',v_job.id,'request_table',v_job.request_table,'request_id',v_job.request_id,
    'state',v_state,'level',v_level,'recipient_email',lower(v_recipient->>'email'),
    'recipient_name',v_recipient->>'full_name','requester_name',v_requester->>'full_name',
    'start_date',coalesce(v_request->>'start_date',v_request->>'attendance_date',v_request->>'request_date',v_request->>'date'),
    'end_date',v_request->>'end_date',
    'leave_type',v_request->>'leave_type',
    'reason',left(coalesce(v_request->>'reason',''),500),
    'days',v_days,'balance_days',v_balance
  );
end;
$$;

create or replace function public.finish_workforce_email(
  p_id uuid,p_lease_token uuid,p_provider_message_id text default null,p_error text default null,p_retryable boolean default false
) returns boolean language plpgsql security definer set search_path=public as $$
declare v_updated integer;
begin
  if nullif(p_provider_message_id,'') is null and nullif(p_error,'') is null then raise exception 'DELIVERY_RESULT_REQUIRED'; end if;
  update public.workforce_email_outbox set
    status=case when nullif(p_provider_message_id,'') is not null then 'sent' when p_retryable and attempts<5 then 'pending' else 'failed' end,
    provider_message_id=p_provider_message_id,
    sent_at=case when nullif(p_provider_message_id,'') is not null then now() end,
    last_error=left(p_error,500),
    available_at=now()+make_interval(secs=>least(3600,(60*power(2,attempts-1))::integer)),
    lease_token=null,lease_until=null
  where id=p_id and status='processing' and lease_token=p_lease_token and lease_until>now();
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('workforce_email_state','queue_workforce_email','claim_workforce_emails','prepare_workforce_email','finish_workforce_email') loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end; $$;
notify pgrst,'reload schema';
commit;
