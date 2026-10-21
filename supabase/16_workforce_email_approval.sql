-- Run after 14_workforce_email_notifications.sql.
-- Lets an approver decide a LEAVE request from the email link, without a login.
-- The email token is verified by the Edge Function and re-validated here against
-- the live approval chain, so a stale, forwarded or reused link cannot decide a
-- request that has already moved on.
begin;

alter table public.workforce_email_outbox
  add column if not exists recipient_account_id text;

-- Same review logic as review_workforce_request, but the acting account is an
-- explicit argument so a trusted server can act for the emailed approver.
create or replace function public.review_workforce_request_as(
  p_actor_id text, p_request_type text, p_request_id uuid, p_decision text, p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_table text; v_request jsonb; v_result jsonb; v_actor public.user_accounts;
  v_level integer; v_next integer; v_assignee text; v_admin boolean; v_hr boolean; v_final boolean;
  v_status text; v_approval text; v_name text; v_balance public.leave_balance_periods; v_days numeric;
  v_stamp_column text; v_stamp_at text;
begin
  if p_request_type not in ('leave','overtime','reimbursement') then raise exception 'INVALID_REQUEST_TYPE'; end if;
  if p_decision not in ('approved','rejected','paid') then raise exception 'INVALID_DECISION'; end if;
  select * into v_actor from public.user_accounts where id::text=p_actor_id;
  if v_actor.id is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  v_admin := lower(coalesce(v_actor.role,'')) in ('admin','super admin','super_admin');
  v_hr := v_admin
    or lower(coalesce(v_actor.role,'')) in ('hr','hr manager','hr staff','office_management')
    or coalesce(v_actor.groups,'{}') && array['hr','hrd','it_management','csl_admin'];
  v_name := coalesce(nullif(v_actor.full_name,''),v_actor.email);
  v_table := case p_request_type when 'leave' then 'leave_requests' when 'overtime' then 'overtime_requests' else 'reimbursements' end;
  execute format('select to_jsonb(r) from public.%I r where id=$1 for update',v_table) into v_request using p_request_id;
  if v_request is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request->>'user_id'=v_actor.id::text then raise exception 'CANNOT_REVIEW_OWN_REQUEST'; end if;

  if p_decision='paid' then
    if p_request_type<>'reimbursement' or v_request->>'status'<>'approved' or not v_hr then raise exception 'PAYMENT_NOT_AUTHORIZED_OR_NOT_APPROVED'; end if;
    execute format('update public.%I r set status=''paid'',updated_at=now() where id=$1 returning to_jsonb(r)',v_table) into v_result using p_request_id;
    return v_result;
  end if;
  if v_request->>'status' not like 'pending%' then raise exception 'REQUEST_ALREADY_REVIEWED'; end if;
  v_level := case v_request->>'status'
    when 'pending_line_2' then 2 when 'pending_senior' then 3 when 'pending_office' then 4
    else coalesce((v_request->>'current_approval_level')::integer,1) end;
  select approver_id into v_assignee from public.workforce_approval_chain(v_request->>'user_id') where level_number=v_level;
  if not v_admin and v_assignee is distinct from v_actor.id::text then raise exception 'NOT_DESIGNATED_APPROVER'; end if;
  select level_number into v_next from public.workforce_approval_chain(v_request->>'user_id') where level_number>v_level order by level_number limit 1;
  v_final := p_decision='rejected' or v_next is null;
  v_status := case when v_final then p_decision else 'pending' end;
  v_approval := case when v_final then p_decision else 'pending_level_'||v_next end;

  -- Only annual leave consumes the annual ledger; the row lock prevents double deduction.
  if p_request_type='leave' and p_decision='approved' and v_final and v_request->>'leave_type'='annual' then
    v_days := (v_request->>'end_date')::date-(v_request->>'start_date')::date+1;
    select * into v_balance from public.leave_balance_periods
      where user_id=(v_request->>'user_id')::bigint and status='active'
        and period_start<=(v_request->>'start_date')::date and period_end>=(v_request->>'end_date')::date
      order by period_start desc limit 1 for update;
    if v_balance.id is null then raise exception 'LEAVE_BALANCE_PERIOD_NOT_FOUND'; end if;
    if greatest(0,v_balance.entitlement_days+v_balance.carry_forward_days-v_balance.collective_leave_days-v_balance.used_days-v_balance.expired_days)<v_days then raise exception 'INSUFFICIENT_LEAVE_BALANCE'; end if;
    update public.leave_balance_periods set used_days=used_days+v_days,updated_at=now() where id=v_balance.id;
  end if;
  v_stamp_column := case v_level when 1 then 'line1_approved_by' when 2 then 'line2_approved_by' when 3 then 'senior_approved_by' else 'office_approved_by' end;
  v_stamp_at := replace(v_stamp_column,'_by','_at');
  execute format('update public.%I r set status=$2,approval_status=$3,current_approval_level=$4,approved_by=$5,approved_at=now(),rejection_reason=case when $2=''rejected'' then $6 else null end,%I=$5,%I=now(),updated_at=now() where id=$1 returning to_jsonb(r)',v_table,v_stamp_column,v_stamp_at)
    into v_result using p_request_id,v_status,v_approval,coalesce(v_next,v_level),v_name,nullif(trim(p_notes),'');
  insert into public.approval_records(request_type,request_id,level_number,approver_id,approver_name,status,notes)
    values(p_request_type,p_request_id,v_level,v_actor.id::text,v_name,p_decision,p_notes);
  return v_result;
end;
$$;

-- The session-based entry point stays the public API used by the application.
create or replace function public.review_workforce_request(
  p_request_type text, p_request_id uuid, p_decision text, p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  return public.review_workforce_request_as(public.current_account_id(),p_request_type,p_request_id,p_decision,p_notes);
end;
$$;

-- Only the email worker calls this. Every claim is checked against live data:
-- the stage must still be the one named in the email, and the approver must
-- still be the assignee for that stage.
create or replace function public.decide_leave_via_email(
  p_request_id uuid, p_approver_id text, p_expected_state text, p_decision text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_row public.leave_requests; v_state text; v_level integer; v_assignee text;
begin
  if p_decision not in ('approved','rejected') then raise exception 'INVALID_DECISION'; end if;
  if not exists(
    select 1 from public.user_accounts u where u.id::text=p_approver_id
      and lower(coalesce(u.status,'active')) not in ('inactive','suspended','resigned','terminated','nonaktif')
      and lower(coalesce(u.employment_status,'active')) not in ('inactive','suspended','resigned','terminated','nonaktif')
  ) then raise exception 'APPROVER_NOT_ACTIVE'; end if;
  select * into v_row from public.leave_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  v_state := public.workforce_email_state(to_jsonb(v_row));
  if v_state is distinct from p_expected_state then raise exception 'REQUEST_STATE_CHANGED'; end if;
  if v_state not like 'pending_level_%' then raise exception 'REQUEST_ALREADY_REVIEWED'; end if;
  v_level := right(v_state,1)::integer;
  select approver_id into v_assignee from public.workforce_approval_chain(v_row.user_id) where level_number=v_level;
  if v_assignee is distinct from p_approver_id then raise exception 'NOT_DESIGNATED_APPROVER'; end if;
  return public.review_workforce_request_as(p_approver_id,'leave',p_request_id,p_decision,'Diputuskan melalui tautan email');
end;
$$;

revoke all on function public.review_workforce_request_as(text,text,uuid,text,text) from public,anon,authenticated;
revoke all on function public.decide_leave_via_email(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.review_workforce_request_as(text,text,uuid,text,text) to service_role;
grant execute on function public.decide_leave_via_email(uuid,text,text,text) to service_role;
notify pgrst,'reload schema';
commit;
