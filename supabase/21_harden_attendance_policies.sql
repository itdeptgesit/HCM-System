-- ==============================================================================
-- FASE 0 — HARDENING POLICY ABSENSI
-- File: supabase/21_harden_attendance_policies.sql
--
-- PRASYARAT: jalankan dulu supabase/Verifikasi-Policy-Supabase-Live.sql dan
-- simpan hasilnya. File ini menutup empat temuan audit:
--   1. Karyawan bisa SELECT absensi pending milik karyawan lain (GPS + foto).
--   2. Karyawan bisa INSERT/UPDATE catatan absensinya sendiri lewat API,
--      melewati geofence dan approval.
--   3. Tabel office_locations bisa diubah siapa saja (policy legacy).
--   4. Policy storage legacy memberi anon akses FOR ALL ke foto absensi.
--
-- CATATAN PENTING
-- - Bucket TIDAK dijadikan privat di file ini. Aplikasi (app-hr & app-absen)
--   menyimpan URL publik di kolom foto dan menampilkannya langsung lewat
--   <img src>. Mengubah bucket jadi privat akan mematikan semua bukti foto
--   yang sudah tersimpan. Langkah itu butuh migrasi aplikasi ke signed URL
--   dan dikerjakan terpisah. Yang ditutup di sini: tulis/hapus/timpa oleh anon.
-- - Jalankan di staging lebih dulu. Bagian 3 mengubah RPC clock-in/out menjadi
--   SECURITY DEFINER; tanpa itu, menghapus policy INSERT/UPDATE akan
--   mematikan absensi.
-- - Semua perubahan dalam satu transaksi. Batalkan dengan ROLLBACK bila
--   hasil verifikasi tidak sesuai.
-- ==============================================================================

begin;

-- ------------------------------------------------------------------------------
-- 0. PREFLIGHT — gagal cepat dengan pesan yang jelas
-- ------------------------------------------------------------------------------
do $$
declare
  v_col text;
begin
  if to_regclass('public.attendance_records') is null then
    raise exception 'attendance_records tidak ada. Jalankan supabase/01_schema.sql lebih dulu.';
  end if;

  foreach v_col in array array[
    'groups', 'role', 'status', 'employment_status',
    'supervisor_id', 'manager_id', 'vp_id',
    'attendance_supervisor_id', 'attendance_hr_id',
    'attendance_manager_id', 'attendance_vp_id'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'user_accounts' and column_name = v_col
    ) then
      raise exception 'Kolom user_accounts.% tidak ada. Jalankan supabase/01_schema.sql lebih dulu.', v_col;
    end if;
  end loop;
end $$;

-- Helper kanonik. Sudah dibuat oleh 01_schema.sql; create or replace membuat
-- file ini tetap bisa dijalankan mandiri di database yang belum memilikinya.
create or replace function public.current_account_id() returns text
language sql stable security definer set search_path = public as $$
  select id::text from public.user_accounts
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and lower(coalesce(status, 'active')) not in ('inactive', 'suspended', 'resigned', 'terminated')
    and lower(coalesce(employment_status, 'active')) not in ('inactive', 'suspended', 'resigned', 'terminated')
  limit 1;
$$;

create or replace function public.is_hr_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.user_accounts
    where id::text = public.current_account_id()
      and (
        lower(coalesce(role, '')) in ('admin', 'super admin', 'super_admin', 'hr', 'hr manager', 'hr staff', 'office_management')
        or coalesce(groups, '{}'::text[]) && array['hr', 'hrd', 'it_management', 'csl_admin']
      )
  );
$$;

revoke all on function public.current_account_id(), public.is_hr_admin() from public, anon;
grant execute on function public.current_account_id(), public.is_hr_admin() to authenticated;

-- ------------------------------------------------------------------------------
-- 1. BACA ABSENSI — sendiri, HR, atau atasan pada rantai approval
-- ------------------------------------------------------------------------------
-- attendance_select_approvers memakai `approval_status <> 'approved'`, sehingga
-- SEMUA karyawan bisa membaca absensi pending milik siapa pun. Policy itu
-- diganti dengan pembatasan berdasarkan rantai approval.
drop policy if exists attendance_select_approvers on public.attendance_records;
drop policy if exists attendance_select_own on public.attendance_records;
drop policy if exists "Public full access attendance_records" on public.attendance_records;

create policy attendance_select_own on public.attendance_records
for select to authenticated
using (user_id::text = public.current_account_id());

create policy attendance_select_scope on public.attendance_records
for select to authenticated
using (
  public.is_hr_admin()
  or exists (
    select 1
    from public.user_accounts u
    where u.id::text = attendance_records.user_id::text
      and public.current_account_id() = any (array[
        u.supervisor_id::text,
        u.manager_id::text,
        u.vp_id::text,
        u.attendance_supervisor_id::text,
        u.attendance_hr_id::text,
        u.attendance_manager_id::text,
        u.attendance_vp_id::text
      ])
  )
);

-- ------------------------------------------------------------------------------
-- 2. TULIS ABSENSI — hanya HR dan approver; karyawan lewat RPC
-- ------------------------------------------------------------------------------
drop policy if exists attendance_insert_own on public.attendance_records;
drop policy if exists attendance_update_own on public.attendance_records;
drop policy if exists attendance_write_hr on public.attendance_records;
drop policy if exists attendance_update_approver on public.attendance_records;
drop policy if exists attendance_insert_approver on public.attendance_records;

create policy attendance_write_hr on public.attendance_records
for all to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

create policy attendance_update_approver on public.attendance_records
for update to authenticated
using (
  exists (
    select 1
    from public.user_accounts u
    where u.id::text = attendance_records.user_id::text
      and public.current_account_id() = any (array[
        u.supervisor_id::text,
        u.manager_id::text,
        u.vp_id::text,
        u.attendance_supervisor_id::text,
        u.attendance_hr_id::text,
        u.attendance_manager_id::text,
        u.attendance_vp_id::text
      ])
  )
)
with check (
  exists (
    select 1
    from public.user_accounts u
    where u.id::text = attendance_records.user_id::text
      and public.current_account_id() = any (array[
        u.supervisor_id::text,
        u.manager_id::text,
        u.vp_id::text,
        u.attendance_supervisor_id::text,
        u.attendance_hr_id::text,
        u.attendance_manager_id::text,
        u.attendance_vp_id::text
      ])
  )
);

create policy attendance_insert_approver on public.attendance_records
for insert to authenticated
with check (
  exists (
    select 1
    from public.user_accounts u
    where u.id::text = attendance_records.user_id::text
      and public.current_account_id() = any (array[
        u.supervisor_id::text,
        u.manager_id::text,
        u.vp_id::text,
        u.attendance_supervisor_id::text,
        u.attendance_hr_id::text,
        u.attendance_manager_id::text,
        u.attendance_vp_id::text
      ])
  )
);

-- ------------------------------------------------------------------------------
-- 3. RPC CLOCK-IN/OUT — SECURITY DEFINER agar tetap jalan tanpa policy tulis
-- ------------------------------------------------------------------------------
-- RPC ini saat ini SECURITY INVOKER, jadi ia bergantung pada policy INSERT/UPDATE
-- milik karyawan. Dengan definer, validasi geofence di dalam fungsi tetap menjadi
-- satu-satunya jalur tulis untuk karyawan.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('clock_in_attendance', 'clock_out_attendance')
  loop
    execute format('alter function %s security definer', r.sig);
    execute format('alter function %s set search_path = public', r.sig);
    execute format('revoke all on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
    raise notice 'RPC diubah ke SECURITY DEFINER: %', r.sig;
  end loop;
end $$;

-- ------------------------------------------------------------------------------
-- 4. LOKASI KANTOR — baca semua karyawan, ubah hanya HR
-- ------------------------------------------------------------------------------
drop policy if exists "Public full access office_locations" on public.office_locations;
drop policy if exists office_select_active on public.office_locations;
drop policy if exists office_locations_authenticated_read on public.office_locations;
drop policy if exists workforce_read on public.office_locations;
drop policy if exists workforce_hr_write on public.office_locations;

alter table public.office_locations enable row level security;

create policy office_read on public.office_locations
for select to authenticated
using (true);

create policy office_write_hr on public.office_locations
for all to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

-- ------------------------------------------------------------------------------
-- 5. STORAGE — cabut akses anon FOR ALL pada foto absensi & dokumen medis
-- ------------------------------------------------------------------------------
-- Sebelum: policy "Attendance selfies access" dan "Medical docs access" memberi
-- role anon hak INSERT/UPDATE/DELETE ke seluruh objek di bucket tersebut.
drop policy if exists "Attendance selfies access" on storage.objects;
drop policy if exists "Medical docs access" on storage.objects;
drop policy if exists medical_docs_upload_own on storage.objects;
drop policy if exists attendance_photo_read on storage.objects;
drop policy if exists attendance_photo_write on storage.objects;
drop policy if exists medical_doc_read on storage.objects;
drop policy if exists medical_doc_write on storage.objects;

-- Baca: hanya user login (objek tetap dapat diakses lewat URL publik selama
-- bucket masih public — itu utang teknis yang dicatat di bagian CATATAN).
create policy attendance_photo_read on storage.objects
for select to authenticated
using (bucket_id = 'attendance-selfies');

create policy medical_doc_read on storage.objects
for select to authenticated
using (bucket_id = 'medical-docs');

-- Tulis: hanya ke file milik sendiri. Path unggahan app-absen berbentuk
-- `<folder>/<user_id>_<timestamp>.jpg`, jadi segmen kedua diawali user id.
create policy attendance_photo_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'attendance-selfies'
  and split_part(split_part(name, '/', 2), '_', 1) = public.current_account_id()
);

create policy medical_doc_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'medical-docs'
  and split_part(split_part(name, '/', 2), '_', 1) = public.current_account_id()
);

-- Upsert (`upsert: true` di klien) membutuhkan UPDATE pada baris yang sudah ada,
-- jadi tetap diizinkan selama path-nya masih milik user tersebut.
drop policy if exists attendance_photo_update on storage.objects;
create policy attendance_photo_update on storage.objects
for update to authenticated
using (
  bucket_id in ('attendance-selfies', 'medical-docs')
  and split_part(split_part(name, '/', 2), '_', 1) = public.current_account_id()
)
with check (
  bucket_id in ('attendance-selfies', 'medical-docs')
  and split_part(split_part(name, '/', 2), '_', 1) = public.current_account_id()
);

-- Hapus/timpa hanya HR (atau service role di server).
drop policy if exists attendance_photo_delete on storage.objects;
create policy attendance_photo_delete on storage.objects
for delete to authenticated
using (bucket_id in ('attendance-selfies', 'medical-docs') and public.is_hr_admin());

commit;

-- ==============================================================================
-- SETELAH MENJALANKAN
-- 1. Jalankan ulang supabase/Verifikasi-Policy-Supabase-Live.sql (khususnya Q7).
-- 2. Uji manual: akun karyawan biasa harus GAGAL `update attendance_records`
--    dan GAGAL melihat absensi karyawan lain.
-- 3. Uji absensi masuk/pulang di app-absen (online & offline queue).
-- 4. Uji approval koreksi/dinas luar oleh atasan non-HR.
-- 5. Uji unggah foto absensi baru.
-- ==============================================================================
