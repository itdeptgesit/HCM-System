-- 21_live_attendance_email_approval.sql
-- Memungkinkan persetujuan/penolakan Live Attendance (Absen di Luar Radius) langsung melalui tautan email (1-click auto approve).
begin;

create or replace function public.decide_attendance_via_email(
  p_request_id bigint,
  p_approver_id text,
  p_expected_state text,
  p_decision text
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_row public.attendance_requests;
  v_state text;
  v_level integer;
  v_next integer;
  v_assignee text;
  v_approver public.user_accounts;
  v_approver_name text;
  v_is_admin boolean;
  v_is_auth boolean := false;
  v_existing_rec public.attendance_records;
  v_result jsonb;
  v_final boolean;
  v_status text;
  v_approval text;
  v_stamp_column text;
  v_stamp_at text;
begin
  if p_decision not in ('approved','rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_approver from public.user_accounts where id::text=p_approver_id;
  if v_approver.id is null
    or lower(coalesce(v_approver.status,'active')) in ('inactive','suspended','resigned','terminated','nonaktif')
    or lower(coalesce(v_approver.employment_status,'active')) in ('inactive','suspended','resigned','terminated','nonaktif')
  then
    raise exception 'APPROVER_NOT_ACTIVE';
  end if;

  v_approver_name := coalesce(nullif(v_approver.full_name,''), v_approver.email);
  v_is_admin := lower(coalesce(v_approver.role,'')) in ('admin','super admin','super_admin');

  select * into v_row from public.attendance_requests where id=p_request_id for update;
  if v_row.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  v_state := public.workforce_email_state(to_jsonb(v_row));
  if v_state is distinct from p_expected_state then
    raise exception 'REQUEST_STATE_CHANGED';
  end if;
  if v_state not like 'pending_level_%' then
    raise exception 'REQUEST_ALREADY_REVIEWED';
  end if;

  v_level := right(v_state,1)::integer;

  -- Cek hak wewenang approver
  select approver_id into v_assignee from public.workforce_approval_chain(v_row.user_id::text) where level_number=v_level;
  if v_assignee = p_approver_id or v_is_admin then
    v_is_auth := true;
  elsif lower(coalesce(v_approver.role,'')) in ('hr','hr manager','hr staff','office_management')
    or coalesce(v_approver.groups,'{}') && array['hr','hrd','it_management','csl_admin'] then
    v_is_auth := true;
  elsif exists (
    select 1 from public.user_accounts u
    where u.id::text = v_row.user_id::text
      and p_approver_id in (u.supervisor_id::text, u.attendance_supervisor_id::text, u.manager_id::text, u.attendance_manager_id::text, u.vp_id::text, u.attendance_vp_id::text, u.attendance_hr_id::text)
  ) then
    v_is_auth := true;
  end if;

  if not v_is_auth then
    raise exception 'NOT_DESIGNATED_APPROVER';
  end if;

  select level_number into v_next from public.workforce_approval_chain(v_row.user_id::text) where level_number>v_level order by level_number limit 1;
  v_final := p_decision='rejected' or v_next is null;
  v_status := case when v_final then p_decision else 'pending' end;
  v_approval := case when v_final then p_decision else 'pending_level_'||v_next end;

  v_stamp_column := case v_level when 1 then 'line1_approved_by' when 2 then 'line2_approved_by' when 3 then 'senior_approved_by' else 'office_approved_by' end;
  v_stamp_at := replace(v_stamp_column,'_by','_at');

  -- Update attendance_requests
  execute format(
    'update public.attendance_requests set status=$1, approval_status=$2, current_approval_level=$3, reviewer_id=$4, reviewer_note=$5, approved_by=$6, approved_at=now(), reviewed_at=now(), %I=$6, %I=now(), updated_at=now() where id=$7 returning to_jsonb(attendance_requests.*)',
    v_stamp_column, v_stamp_at
  ) into v_result using v_status, v_approval, coalesce(v_next, v_level), p_approver_id, 'Diputuskan melalui tautan email', v_approver_name, p_request_id;

  -- Jika status final tercapai, sinkronisasi ke attendance_records
  if v_final then
    select * into v_existing_rec
    from public.attendance_records
    where user_id::text = v_row.user_id::text
      and date = coalesce(v_row.request_date, v_row.start_date)
    for update;

    if p_decision = 'approved' then
      if v_existing_rec.id is not null then
        update public.attendance_records
        set clock_in = coalesce(clock_in, v_row.requested_at),
            clock_in_lat = coalesce(clock_in_lat, v_row.latitude),
            clock_in_lng = coalesce(clock_in_lng, v_row.longitude),
            photo_url = coalesce(photo_url, v_row.photo_url),
            work_mode = coalesce(v_row.type, 'dinas'),
            status = 'present',
            approval_status = 'approved',
            approved_by = v_approver_name,
            approved_at = now(),
            line1_approved_by = coalesce(line1_approved_by, v_approver_name),
            line1_approved_at = coalesce(line1_approved_at, now()),
            notes = trim(coalesce(notes, '') || ' [Dinas Luar Disetujui: ' || coalesce(v_row.reason, '') || ']'),
            updated_at = now()
        where id = v_existing_rec.id;
      else
        insert into public.attendance_records (
          user_id, date, clock_in, clock_in_lat, clock_in_lng,
          photo_url, work_mode, status, approval_status, notes,
          approved_by, approved_at, line1_approved_by, line1_approved_at
        ) values (
          v_row.user_id, coalesce(v_row.request_date, v_row.start_date), v_row.requested_at, v_row.latitude, v_row.longitude,
          v_row.photo_url, coalesce(v_row.type, 'dinas'), 'present', 'approved', 'Dinas Luar Disetujui: ' || coalesce(v_row.reason, ''),
          v_approver_name, now(), v_approver_name, now()
        );
      end if;
    elsif p_decision = 'rejected' then
      if v_existing_rec.id is not null then
        update public.attendance_records
        set approval_status = 'rejected',
            rejection_reason = 'Diputuskan melalui tautan email',
            approved_by = v_approver_name,
            approved_at = now(),
            updated_at = now()
        where id = v_existing_rec.id;
      end if;
    end if;
  end if;

  -- Catat di approval_records ledger
  insert into public.approval_records (
    request_type, request_id, level_number, approver_id, approver_name, status, notes
  ) values (
    'live_attendance', v_row.id, v_level, p_approver_id, v_approver_name, p_decision, 'Diputuskan melalui tautan email'
  );

  return v_result;
end;
$$;

revoke all on function public.decide_attendance_via_email(bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.decide_attendance_via_email(bigint,text,text,text) to service_role;

notify pgrst, 'reload schema';
commit;
