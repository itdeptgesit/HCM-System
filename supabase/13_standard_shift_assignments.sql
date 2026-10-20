-- Jalankan manual di Supabase SQL Editor pada database bersama app-hr/app-absen.
-- Menambah pilihan shift yang belum tersedia dan memindahkan tujuh karyawan
-- dari jam khusus ke master shift. Tidak mengganti fungsi RPC atau log presensi.
begin;

do $$
declare
  v_assignment record;
  v_count integer;
begin
  -- Cocokkan ID dan NIK, bukan nama parsial, agar tidak mengenai karyawan lain.
  for v_assignment in
    select * from (values
      (27, '12020029', 'Retno Widiyati'),
      (28, '93100003', 'Pratiwi'),
      (31, '23080361', 'Sariana'),
      (32, '24090376', 'Abdul Wahid Ramdoni'),
      (29, '6020017', 'Andri Widiyanto'),
      (71, '13110063', 'Ahmad Yunus'),
      (35, '26060389', 'Julhan Sabani')
    ) as assignments(user_id, employee_code, full_name)
  loop
    select count(*) into v_count
    from public.user_accounts u
    where u.id = v_assignment.user_id
      and u.employee_code = v_assignment.employee_code;

    if v_count <> 1 then
      raise exception 'SHIFT_EMPLOYEE_MISMATCH: % (NIK %)',
        v_assignment.full_name, v_assignment.employee_code;
    end if;
  end loop;
end;
$$;

-- Gunakan kembali master aktif berdasarkan jam, bukan nama shift yang bisa berbeda.
insert into public.attendance_schedules (
  name, work_start, work_end, grace_period_minutes,
  is_flexible, flex_start, flex_end, required_work_hours, is_active
)
select s.name, s.work_start, s.work_end, 15,
  false, s.work_start, s.work_start, 9, true
from (values
  ('Shift Pagi 1', time '07:00', time '16:00'),
  ('Shift Pagi 2', time '08:00', time '17:00'),
  ('Shift Pagi 3', time '09:00', time '18:00'),
  ('Middle Shift', time '10:00', time '19:00')
) as s(name, work_start, work_end)
where not exists (
  select 1 from public.attendance_schedules existing
  where existing.work_start = s.work_start
    and existing.work_end = s.work_end
    and existing.is_flexible = false
    and existing.is_active = true
);

update public.user_accounts u
set work_schedule_type = 'shift',
    schedule_id = (
      select s.id from public.attendance_schedules s
      where s.work_start = assignments.work_start
        and s.work_end = assignments.work_end
        and s.is_flexible = false
        and s.is_active = true
      order by s.id
      limit 1
    ),
    custom_work_start = null,
    custom_work_end = null
from (values
  (27, '12020029', time '08:00', time '17:00'),
  (28, '93100003', time '09:00', time '18:00'),
  (31, '23080361', time '07:00', time '16:00'),
  (32, '24090376', time '10:00', time '19:00'),
  (29, '6020017', time '08:00', time '17:00'),
  (71, '13110063', time '08:00', time '17:00'),
  (35, '26060389', time '08:00', time '17:00')
) as assignments(user_id, employee_code, work_start, work_end)
where u.id = assignments.user_id and u.employee_code = assignments.employee_code;

-- Hasil pemeriksaan: tujuh baris, seluruhnya work_schedule_type = shift.
select u.full_name, u.employee_code, u.work_schedule_type,
       s.name as shift, s.work_start, s.work_end
from public.user_accounts u
join public.attendance_schedules s on s.id = u.schedule_id
where u.id in (27, 28, 31, 32, 29, 71, 35)
order by s.work_start, u.full_name;

commit;
