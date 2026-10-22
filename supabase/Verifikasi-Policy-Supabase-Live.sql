-- ==============================================================================
-- VERIFIKASI POLICY SUPABASE (LIVE) — READ ONLY
-- File: supabase/Verifikasi-Policy-Supabase-Live.sql
--
-- Jalankan seluruh isi file di Supabase SQL Editor, sebelum dan sesudah
-- menjalankan supabase/21_harden_attendance_policies.sql.
--
-- Tidak ada perintah INSERT/UPDATE/DELETE/ALTER di sini. Satu-satunya blok yang
-- mengubah state adalah Q7, dan itu di dalam transaksi yang diakhiri ROLLBACK.
--
-- Ganti 'GANTI_DENGAN_EMAIL_KARYAWAN@gesit.co.id' pada Q7 dengan email akun
-- karyawan biasa (bukan HR, bukan atasan) yang benar-benar ada di user_accounts.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- Q1. Semua policy pada attendance_records
-- Harapan setelah hardening: tidak ada policy dengan qual/with_check berisi
-- `true` polos, dan tidak ada `attendance_update_own` / `attendance_insert_own`.
-- ------------------------------------------------------------------------------
select
  policyname,
  cmd,
  roles,
  qual        as using_expression,
  with_check  as check_expression
from pg_policies
where schemaname = 'public' and tablename = 'attendance_records'
order by cmd, policyname;


-- ------------------------------------------------------------------------------
-- Q2. Semua policy pada office_locations
-- Harapan: SELECT untuk authenticated, dan tulis hanya lewat is_hr_admin().
-- ------------------------------------------------------------------------------
select
  policyname,
  cmd,
  roles,
  qual        as using_expression,
  with_check  as check_expression
from pg_policies
where schemaname = 'public' and tablename = 'office_locations'
order by cmd, policyname;


-- ------------------------------------------------------------------------------
-- Q3. Policy "terbuka" pada tabel sensitif
-- Harapan: kosong. Baris di sini berarti seluruh karyawan (atau anon) bisa
-- membaca/menulis tabel tersebut tanpa batas.
-- ------------------------------------------------------------------------------
select
  tablename,
  policyname,
  cmd,
  roles,
  qual        as using_expression,
  with_check  as check_expression
from pg_policies
where schemaname = 'public'
  and tablename in (
    'attendance_records',
    'office_locations',
    'attendance_requests',
    'attendance_correction_requests',
    'approval_records',
    'employee_appointments',
    'employee_contract_history',
    'user_accounts'
  )
  and (
    qual in ('true', 'true::boolean')
    or with_check in ('true', 'true::boolean')
  )
order by tablename, policyname;


-- ------------------------------------------------------------------------------
-- Q4. Status public/private bucket foto
-- Temuan audit: bucket foto absensi dan dokumen medis berstatus public = true.
-- ------------------------------------------------------------------------------
select id, name, public, file_size_limit, created_at
from storage.buckets
where id in ('attendance-selfies', 'medical-docs')
order by id;


-- ------------------------------------------------------------------------------
-- Q5. Policy pada storage.objects untuk kedua bucket tersebut
-- Harapan setelah hardening: tidak ada policy dengan roles = {anon} dan cmd ALL.
-- ------------------------------------------------------------------------------
select
  policyname,
  cmd,
  roles,
  qual        as using_expression,
  with_check  as check_expression
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and coalesce(qual, '') like any (array['%attendance-selfies%', '%medical-docs%'])
order by policyname;


-- ------------------------------------------------------------------------------
-- Q6. Mode keamanan RPC clock-in / clock-out
-- prosecdef = true berarti SECURITY DEFINER (yang dibutuhkan setelah policy
-- tulis karyawan dicabut). false = fungsi bergantung pada RLS pemanggil.
-- ------------------------------------------------------------------------------
select
  p.oid::regprocedure                                   as fungsi,
  p.prosecdef                                           as security_definer,
  pg_get_userbyid(p.proowner)                           as owner,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as bisa_dipanggil_karyawan,
  has_function_privilege('anon', p.oid, 'EXECUTE')           as bisa_dipanggil_anon
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('clock_in_attendance', 'clock_out_attendance')
order by p.proname, p.oid::regprocedure::text;


-- ------------------------------------------------------------------------------
-- Q7. UJI AKSES NYATA sebagai karyawan biasa (di dalam transaksi + ROLLBACK)
-- Mengganti role menjadi `authenticated` dengan JWT tiruan, lalu menghitung
-- berapa baris absensi karyawan LAIN yang bisa dibaca.
--
-- Harapan setelah hardening: baris_karyawan_lain = 0.
-- Bila > 0, masih ada policy SELECT yang membocorkan data (termasuk GPS & foto).
-- ------------------------------------------------------------------------------
begin;

select set_config(
  'app.probe_user_id',
  (select id::text from public.user_accounts
   where lower(email) = lower('GANTI_DENGAN_EMAIL_KARYAWAN@gesit.co.id')
   limit 1),
  true
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'email', 'GANTI_DENGAN_EMAIL_KARYAWAN@gesit.co.id',
    'role', 'authenticated',
    'sub', current_setting('app.probe_user_id', true)
  )::text,
  true
);

set local role authenticated;

select
  current_setting('app.probe_user_id', true) as id_karyawan_uji,
  count(*) filter (where user_id::text = current_setting('app.probe_user_id', true)) as baris_milik_sendiri,
  count(*) filter (where user_id::text <> current_setting('app.probe_user_id', true)) as baris_karyawan_lain,
  count(*) filter (
    where user_id::text <> current_setting('app.probe_user_id', true)
      and (to_jsonb(attendance_records) ? 'photo_url' or to_jsonb(attendance_records) ? 'check_in_photo_url')
  ) as baris_lain_dengan_foto
from public.attendance_records;

reset role;
rollback;


-- ------------------------------------------------------------------------------
-- Q8. Ringkasan eksposur data absensi
-- Dipakai untuk mengukur besar masalah sebelum/sesudah perbaikan, dan untuk
-- menilai apakah kolom audit (verification_status) sudah ada di database live.
-- ------------------------------------------------------------------------------
select
  count(*)                                                        as total_baris,
  count(*) filter (where coalesce(
    to_jsonb(attendance_records) ->> 'photo_url',
    to_jsonb(attendance_records) ->> 'check_in_photo_url'
  ) is not null)                                                  as baris_dengan_foto,
  count(*) filter (where to_jsonb(attendance_records) ? 'verification_status'
    and to_jsonb(attendance_records) ->> 'verification_status' <> 'normal')
                                                                  as baris_perlu_review,
  count(*) filter (where to_jsonb(attendance_records) ? 'approval_status'
    and to_jsonb(attendance_records) ->> 'approval_status' <> 'approved')
                                                                  as baris_belum_approved,
  count(*) filter (where date >= current_date - interval '30 days') as baris_30_hari_terakhir
from public.attendance_records;


-- ==============================================================================
-- CARA MEMBACA HASIL
-- Q1/Q2 : pastikan hanya policy yang diharapkan yang muncul.
-- Q3    : harus 0 baris. Bila ada, catat nama tabel + policy untuk dibersihkan.
-- Q4    : public = true berarti file bisa dibaca siapa pun yang punya URL.
--         Perbaikannya butuh perubahan aplikasi (signed URL), bukan sekadar ALTER.
-- Q5    : tidak boleh ada policy `{anon}` dengan cmd ALL.
-- Q6    : security_definer harus true untuk clock-in dan clock-out.
-- Q7    : baris_karyawan_lain harus 0.
-- Q8    : angka dasar untuk laporan sebelum/sesudah.
-- ==============================================================================
