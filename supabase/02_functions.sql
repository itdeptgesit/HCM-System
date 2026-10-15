-- Run after 01_schema.sql. Both applications use these same atomic operations.
begin;

create or replace function public.workforce_approval_chain(p_user_id text)
returns table(level_number integer, approver_id text)
language sql stable security definer set search_path=public as $$
  select slot.level_number, slot.approver_id from public.user_accounts u
  cross join lateral (
    select u.attendance_hr_id is not null or u.attendance_manager_id is not null or u.attendance_vp_id is not null as detailed
  ) mode
  cross join lateral (values
    (1,coalesce(u.attendance_supervisor_id,u.supervisor_id)::text),
    (2,(case when mode.detailed then u.attendance_hr_id else u.manager_id end)::text),
    (3,(case when mode.detailed then coalesce(u.attendance_manager_id,u.manager_id) else u.vp_id end)::text),
    (4,(case when mode.detailed then coalesce(u.attendance_vp_id,u.vp_id) end)::text)
  ) slot(level_number,approver_id)
  where u.id::text=p_user_id and slot.approver_id is not null order by slot.level_number;
$$;

create or replace function public.initialize_workforce_request() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_level integer;
begin
  select level_number into v_level from public.workforce_approval_chain(new.user_id) limit 1;
  new.status := 'pending';
  new.current_approval_level := coalesce(v_level,1);
  new.approval_status := case when coalesce(v_level,1)=1 then 'pending' else 'pending_level_'||v_level end;
  new.approved_by := null; new.approved_at := null; new.rejection_reason := null;
  return new;
end;
$$;
do $$ declare t text; begin
  foreach t in array array['leave_requests','overtime_requests','reimbursements'] loop
    execute format('drop trigger if exists initialize_workforce_request on public.%I',t);
    execute format('create trigger initialize_workforce_request before insert on public.%I for each row execute function public.initialize_workforce_request()',t);
  end loop;
end; $$;

create or replace function public.review_workforce_request(
  p_request_type text, p_request_id uuid, p_decision text, p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_table text; v_request jsonb; v_result jsonb; v_actor public.user_accounts;
  v_level integer; v_next integer; v_assignee text; v_admin boolean; v_final boolean;
  v_status text; v_approval text; v_name text; v_balance public.leave_balance_periods; v_days numeric;
  v_stamp_column text; v_stamp_at text;
begin
  if p_request_type not in ('leave','overtime','reimbursement') then raise exception 'INVALID_REQUEST_TYPE'; end if;
  if p_decision not in ('approved','rejected','paid') then raise exception 'INVALID_DECISION'; end if;
  select * into v_actor from public.user_accounts where id::text=public.current_account_id();
  if v_actor.id is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  v_admin := lower(v_actor.role) in ('admin','super admin','super_admin');
  v_name := coalesce(nullif(v_actor.full_name,''),v_actor.email);
  v_table := case p_request_type when 'leave' then 'leave_requests' when 'overtime' then 'overtime_requests' else 'reimbursements' end;
  execute format('select to_jsonb(r) from public.%I r where id=$1 for update',v_table) into v_request using p_request_id;
  if v_request is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_request->>'user_id'=v_actor.id::text then raise exception 'CANNOT_REVIEW_OWN_REQUEST'; end if;

  if p_decision='paid' then
    if p_request_type<>'reimbursement' or v_request->>'status'<>'approved' or not public.is_hr_admin() then raise exception 'PAYMENT_NOT_AUTHORIZED_OR_NOT_APPROVED'; end if;
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

create or replace function public.approve_leave_request_with_balance(p_request_id uuid)
returns public.leave_requests language plpgsql security definer set search_path=public as $$
declare v_row public.leave_requests;
begin
  perform public.review_workforce_request('leave',p_request_id,'approved',null);
  select * into v_row from public.leave_requests where id=p_request_id;
  return v_row;
end; $$;

create or replace function public.get_my_leave_balance(p_as_of date default current_date)
returns table(period_id bigint,period_kind text,period_start date,period_end date,employment_type text,
  entitlement_days numeric,carry_forward_days numeric,collective_leave_days numeric,used_days numeric,
  expired_days numeric,remaining_days numeric,status text)
language sql stable security definer set search_path=public as $$
  select b.id,b.period_kind,b.period_start,b.period_end,b.employment_type,b.entitlement_days,b.carry_forward_days,
    b.collective_leave_days,b.used_days,b.expired_days,
    greatest(0,b.entitlement_days+b.carry_forward_days-b.collective_leave_days-b.used_days-b.expired_days),b.status
  from public.leave_balance_periods b where b.user_id::text=public.current_account_id()
    and b.status='active' and b.period_start<=p_as_of and b.period_end>=p_as_of order by b.period_start desc;
$$;
create sequence if not exists public.employee_code_sequence;
create or replace function public.next_employee_code(p_join_date date default current_date) returns text
language plpgsql security definer set search_path=public as $$
declare v_code text;
begin
  if not public.is_hr_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  loop
    v_code := to_char(coalesce(p_join_date,current_date),'YYMM')||lpad(nextval('public.employee_code_sequence')::text,4,'0');
    exit when not exists(select 1 from public.user_accounts where employee_code=v_code);
  end loop;
  return v_code;
end; $$;
create or replace function public.get_my_national_id() returns text
language sql stable security definer set search_path=public as $$
  select nik from public.user_accounts where id::text=public.current_account_id();
$$;

create or replace function public.distance_meters(lat1 double precision,lon1 double precision,lat2 double precision,lon2 double precision)
returns double precision language sql immutable as $$
  select 6371000*2*asin(least(1,sqrt(power(sin(radians(lat2-lat1)/2),2)+cos(radians(lat1))*cos(radians(lat2))*power(sin(radians(lon2-lon1)/2),2))));
$$;
create or replace function public.validate_attendance_date(p_date date) returns void language plpgsql stable as $$
begin
  if p_date is null or p_date<>(now() at time zone 'Asia/Jakarta')::date then raise exception 'INVALID_ATTENDANCE_DATE'; end if;
end; $$;

create or replace function public.clock_in_attendance(p_date date,p_lat double precision,p_lng double precision,
  p_status text default 'present',p_notes text default null,p_photo_url text default null,p_work_mode text default 'wfo')
returns public.attendance_records language plpgsql security definer set search_path=public as $$
declare 
  v_user text := public.current_account_id(); 
  v_office public.office_locations; 
  v_row public.attendance_records; 
  v_distance double precision; 
  v_schedule record; 
  v_sch_json jsonb;
  v_status text := 'present';
  v_is_flex boolean;
  v_cutoff time;
begin
  perform public.validate_attendance_date(p_date);
  if v_user is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
  if p_work_mode not in ('wfo','wfh','dinas','client') then raise exception 'INVALID_WORK_MODE'; end if;
  if length(coalesce(p_notes,''))>500 or length(coalesce(p_photo_url,''))>2000000 then raise exception 'ATTENDANCE_INPUT_TOO_LARGE'; end if;
  if p_work_mode='wfh' and exists(select 1 from public.attendance_settings where not allow_wfh) then raise exception 'WFH_DISABLED'; end if;
  select * into v_office from public.office_locations where is_active order by public.distance_meters(p_lat,p_lng,latitude,longitude) limit 1;
  if v_office.id is not null then v_distance := public.distance_meters(p_lat,p_lng,v_office.latitude,v_office.longitude); end if;
  if p_work_mode='wfo' then
    if v_office.id is null then raise exception 'NO_ACTIVE_OFFICE'; end if;
    if v_distance>v_office.radius_meters then raise exception 'OUTSIDE_OFFICE_RADIUS'; end if;
  elsif nullif(trim(p_notes),'') is null then raise exception 'WORK_MODE_NOTE_REQUIRED'; end if;
  
  select * into v_schedule from public.attendance_schedules where is_active order by created_at limit 1;
  if v_schedule is not null then
    v_sch_json := to_jsonb(v_schedule);
    v_is_flex := coalesce((v_sch_json->>'is_flexible')::boolean, true);
    if v_is_flex then
      v_cutoff := coalesce((v_sch_json->>'flex_end')::time, '10:00:00'::time);
    else
      v_cutoff := (coalesce((v_sch_json->>'work_start')::time, '08:00:00'::time) + 
                   make_interval(mins => coalesce((v_sch_json->>'grace_period_minutes')::integer, 15)))::time;
    end if;
    if (now() at time zone 'Asia/Jakarta')::time > v_cutoff then
      v_status := 'late';
    else
      v_status := 'present';
    end if;
  else
    v_status := 'present';
  end if;

  insert into public.attendance_records(user_id,date,clock_in,clock_in_lat,clock_in_lng,status,notes,photo_url,work_mode,clock_in_office_id,clock_in_office_name,clock_in_distance_meters)
    values(v_user,p_date,now(),p_lat,p_lng,v_status,p_notes,p_photo_url,p_work_mode,v_office.id,v_office.name,v_distance) returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'ATTENDANCE_ALREADY_EXISTS';
end; $$;

create or replace function public.clock_out_attendance(p_date date,p_lat double precision,p_lng double precision)
returns public.attendance_records language plpgsql security definer set search_path=public as $$
declare v_user text := public.current_account_id(); v_office public.office_locations; v_row public.attendance_records; v_distance double precision;
begin
  perform public.validate_attendance_date(p_date);
  if v_user is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
  select * into v_row from public.attendance_records where user_id=v_user and date=p_date for update;
  if v_row.id is null or v_row.clock_in is null or v_row.clock_out is not null then raise exception 'CLOCK_IN_NOT_FOUND_OR_ALREADY_OUT'; end if;
  select * into v_office from public.office_locations where is_active order by public.distance_meters(p_lat,p_lng,latitude,longitude) limit 1;
  if v_office.id is not null then v_distance := public.distance_meters(p_lat,p_lng,v_office.latitude,v_office.longitude); end if;
  if v_row.work_mode='wfo' and (v_office.id is null or v_distance>v_office.radius_meters) then raise exception 'OUTSIDE_OFFICE_RADIUS'; end if;
  update public.attendance_records set clock_out=now(),clock_out_lat=p_lat,clock_out_lng=p_lng,
    clock_out_office_id=v_office.id,clock_out_office_name=v_office.name,clock_out_distance_meters=v_distance,
    total_work_minutes=greatest(0,floor(extract(epoch from(now()-clock_in))/60)::integer),updated_at=now()
    where id=v_row.id returning * into v_row;
  return v_row;
end; $$;

create or replace function public.submit_attendance_correction_request(p_attendance_date date,p_clock_in timestamptz,p_clock_out timestamptz,p_reason text)
returns public.attendance_correction_requests language plpgsql security definer set search_path=public as $$
declare v_user text := public.current_account_id(); v_setting public.attendance_request_settings; v_row public.attendance_correction_requests; v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_user is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  select * into v_setting from public.attendance_request_settings where id=true;
  if not coalesce(v_setting.enabled,false) then raise exception 'ATTENDANCE_REQUEST_DISABLED'; end if;
  if p_attendance_date is null or p_attendance_date>v_today then raise exception 'ATTENDANCE_DATE_IN_FUTURE'; end if;
  if p_clock_in is null and p_clock_out is null then raise exception 'ATTENDANCE_TIME_REQUIRED'; end if;
  if p_clock_out<p_clock_in then raise exception 'CLOCK_ORDER_INVALID'; end if;
  if (p_clock_in is not null and (p_clock_in at time zone 'Asia/Jakarta')::date<>p_attendance_date)
    or (p_clock_out is not null and (p_clock_out at time zone 'Asia/Jakarta')::date<>p_attendance_date) then raise exception 'CLOCK_DATE_INVALID'; end if;
  if v_setting.period_type='weekly' and p_attendance_date<v_today-6 then raise exception 'ATTENDANCE_REQUEST_PERIOD_EXPIRED'; end if;
  if v_setting.period_type='monthly' and date_trunc('month',p_attendance_date)<>date_trunc('month',v_today) then raise exception 'ATTENDANCE_REQUEST_PERIOD_EXPIRED'; end if;
  if v_setting.period_type='custom' and p_attendance_date<v_today-(v_setting.period_days-1) then raise exception 'ATTENDANCE_REQUEST_PERIOD_EXPIRED'; end if;
  if exists(select 1 from public.attendance_records where user_id=v_user and date=p_attendance_date) then raise exception 'ATTENDANCE_ALREADY_EXISTS'; end if;
  insert into public.attendance_correction_requests(user_id,attendance_date,clock_in_time,clock_out_time,reason)
    values(v_user,p_attendance_date,p_clock_in,p_clock_out,trim(p_reason)) returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'ATTENDANCE_CORRECTION_ALREADY_EXISTS';
end; $$;

create or replace function public.review_attendance_correction_request(p_request_id uuid,p_status text,p_reviewer_note text default null)
returns public.attendance_correction_requests language plpgsql security definer set search_path=public as $$
declare v_row public.attendance_correction_requests; v_reviewer text := public.current_account_id();
begin
  if not public.is_hr_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('approved','rejected') then raise exception 'INVALID_REVIEW_STATUS'; end if;
  select * into v_row from public.attendance_correction_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_row.status<>'pending' then raise exception 'REQUEST_ALREADY_REVIEWED'; end if;
  if v_row.user_id=v_reviewer then raise exception 'CANNOT_REVIEW_OWN_REQUEST'; end if;
  if p_status='approved' then
    insert into public.attendance_records(user_id,date,clock_in,clock_out,status,notes,total_work_minutes,approved_by,approved_at)
    values(v_row.user_id,v_row.attendance_date,v_row.clock_in_time,v_row.clock_out_time,'present','Request absen disetujui: '||v_row.reason,
      coalesce(greatest(0,round(extract(epoch from(v_row.clock_out_time-v_row.clock_in_time))/60)::integer),0),v_reviewer,now());
  end if;
  update public.attendance_correction_requests set status=p_status,reviewer_id=v_reviewer,reviewed_at=now(),reviewer_note=p_reviewer_note where id=p_request_id returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'ATTENDANCE_ALREADY_EXISTS';
end; $$;

create or replace function public.submit_outside_radius_attendance(p_date date,p_lat double precision,p_lng double precision,p_photo_url text,p_reason text)
returns public.attendance_requests language plpgsql security definer set search_path=public as $$
declare v_user text := public.current_account_id(); v_row public.attendance_requests;
begin
  perform public.validate_attendance_date(p_date);
  if v_user is null then raise exception 'USER_ACCOUNT_NOT_FOUND'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_COORDINATES'; end if;
  if nullif(trim(p_reason),'') is null or length(p_reason)>500 then raise exception 'ATTENDANCE_REQUEST_REASON_REQUIRED'; end if;
  if length(coalesce(p_photo_url,''))>2000000 then raise exception 'ATTENDANCE_PHOTO_TOO_LARGE'; end if;
  if exists(select 1 from public.attendance_records where user_id=v_user and date=p_date) then raise exception 'ATTENDANCE_ALREADY_EXISTS'; end if;
  insert into public.attendance_requests(user_id,request_date,latitude,longitude,photo_url,reason)
    values(v_user,p_date,p_lat,p_lng,p_photo_url,trim(p_reason)) returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'ATTENDANCE_REQUEST_ALREADY_EXISTS';
end; $$;
create or replace function public.review_outside_radius_attendance(p_request_id uuid,p_status text,p_reviewer_note text default null)
returns public.attendance_requests language plpgsql security definer set search_path=public as $$
declare v_row public.attendance_requests; v_reviewer text := public.current_account_id();
begin
  if not public.is_hr_admin() then raise exception 'NOT_AUTHORIZED'; end if;
  if p_status not in ('approved','rejected') then raise exception 'INVALID_REVIEW_STATUS'; end if;
  select * into v_row from public.attendance_requests where id=p_request_id for update;
  if v_row.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if v_row.status<>'pending' then raise exception 'REQUEST_ALREADY_REVIEWED'; end if;
  if v_row.user_id=v_reviewer then raise exception 'CANNOT_REVIEW_OWN_REQUEST'; end if;
  if p_status='approved' then
    insert into public.attendance_records(user_id,date,clock_in,clock_in_lat,clock_in_lng,photo_url,status,notes,approved_by,approved_at)
      values(v_row.user_id,v_row.request_date,v_row.requested_at,v_row.latitude,v_row.longitude,v_row.photo_url,'present',v_row.reason,v_reviewer,now());
  end if;
  update public.attendance_requests set status=p_status,reviewer_id=v_reviewer,reviewed_at=now(),reviewer_note=p_reviewer_note where id=p_request_id returning * into v_row;
  return v_row;
exception when unique_violation then raise exception 'ATTENDANCE_ALREADY_EXISTS';
end; $$;

-- No RPC runs as anonymous; triggers use only server-calculated initial states.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('workforce_approval_chain','initialize_workforce_request','review_workforce_request',
      'approve_leave_request_with_balance','get_my_leave_balance','next_employee_code','get_my_national_id','clock_in_attendance',
      'clock_out_attendance','submit_attendance_correction_request','review_attendance_correction_request','submit_outside_radius_attendance','review_outside_radius_attendance') loop
    execute format('revoke all on function %s from public,anon',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end; $$;
notify pgrst,'reload schema';
commit;
