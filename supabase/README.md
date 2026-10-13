# Database bersama GESIT People

Database ini dipakai **bersama** oleh `app-hr` dan `app-absen`.

## Instalasi pada proyek Supabase baru

Di **SQL Editor**, jalankan isi file berikut satu per satu sesuai urutan:

1. `01_schema.sql`: tabel karyawan, absensi, pengajuan, ledger cuti, kalender, kantor, kebijakan akses, dan bucket `medical-docs`.
2. `02_functions.sql`: fungsi clock-in/out, approval bertingkat, riwayat approval, saldo cuti, koreksi absensi, dan request di luar radius.
3. Buat akun admin nyata melalui **Authentication > Users > Add user**. Gunakan email perusahaan dan aktifkan konfirmasi email.
4. Ganti `GANTI_DENGAN_EMAIL_ADMIN` di `03_bootstrap_admin.sql` dengan email akun tersebut, lalu jalankan file itu.

Ketiga file ini menggantikan instalasi awal `hr_standalone_schema.sql` dan migrasi historis di `app-absen/supabase/migrations`. **Untuk database baru, cukup gunakan urutan di atas.** Migrasi historis tidak perlu dijalankan setelahnya karena dapat mengganti definisi fungsi terbaru.

SQL tidak memasukkan karyawan, kantor, pengajuan, atau angka laporan contoh. Pengulangan file 01 dan 02 mempertahankan data yang sudah dimasukkan. File ini bukan migrasi untuk memperbaiki bentuk tabel dari schema lama.

## Hubungkan kedua aplikasi

Isi nilai yang sama dari proyek baru pada kedua file:

- `D:\web\app-hr\.env`
- `D:\web\app-absen\.env`

```dotenv
VITE_SUPABASE_URL=https://PROJECT_REF_BARU.supabase.co
VITE_SUPABASE_ANON_KEY=ANON_ATAU_PUBLISHABLE_KEY_PROYEK_BARU
```

Gunakan key client dari Supabase, bukan `service_role`. Restart server development. Untuk deployment, ubah environment di hosting masing-masing aplikasi lalu build/deploy ulang.

## Akun karyawan dari dashboard

Pembuatan/reset password melalui dashboard membutuhkan Edge Function `manage-user`. Sourcenya ada di `supabase/functions/manage-user/index.ts`.

Dari folder `app-hr`, dengan Supabase CLI:

```powershell
supabase login
supabase link --project-ref PROJECT_REF_BARU
supabase functions deploy manage-user
```

Function memvalidasi sesi HR/admin, membuat atau memperbarui akun Supabase Auth, dan mengembalikan UUID akun Auth yang nyata. Function tidak mengganti sesi admin dengan sesi karyawan. Secrets bawaan Supabase (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) dipakai hanya di server function.

`supabase/config.toml` menonaktifkan pemeriksaan JWT gateway khusus function ini; autentikasi tetap divalidasi di function dengan `auth.getUser()` sebelum akses administratif. Jika deploy dilakukan dari dashboard Supabase, gunakan pengaturan yang sama.

Jika menggunakan Google, aktifkan provider di **Authentication > Sign In / Providers > Google** dan daftarkan URL `/login` kedua aplikasi di **Authentication > URL Configuration > Redirect URLs**. Email pengguna Google harus terdaftar di `user_accounts`.

## Isi master data

Setelah admin login ke dashboard:

1. Isi perusahaan, departemen, dan data karyawan beserta email yang sesuai akun Auth.
2. Isi lokasi kantor, koordinat, dan radius di **Absensi > Radius Office**.
3. Atur jadwal kerja dan kalender/cuti bersama.
4. Tentukan approver karyawan pada data karyawan atau Hierarchy Approval.
5. Isi ledger `leave_balance_periods` dari saldo cuti HR yang sudah diverifikasi.

Untuk karyawan PKWTT, contoh struktur ledger (ubah ID dan seluruh angka sesuai data HR):

```sql
insert into public.leave_balance_periods (
  user_id, period_kind, period_start, period_end, employment_type,
  entitlement_days, carry_forward_days, collective_leave_days, used_days, expired_days
) values (
  ID_KARYAWAN, 'calendar_year', '2026-01-01', '2026-12-31', 'PKWTT',
  HAK_CUTI, SISA_TAHUN_LALU, POTONGAN_CUTI_BERSAMA, CUTI_SUDAH_DIPAKAI, CUTI_KEDALUWARSA
);
```

PKWT memakai `period_kind='contract'` dengan tanggal mulai/akhir kontrak dan entitlement sesuai kebijakan HR. Jangan mengisi saldo awal 12 untuk semua orang secara otomatis. Carry-forward yang kedaluwarsa harus dicatat pada `expired_days` oleh HR. Approval final cuti tahunan menolak saldo yang belum dibuat/tidak cukup; cuti selain tahunan tidak memotong ledger tahunan.

## Kontrak data

- `user_accounts.id` adalah ID karyawan kanonis (bigint).
- `auth.users.id` / `user_accounts.auth_id` adalah UUID autentikasi, bukan ID absensi.
- `attendance_records.user_id` dan `*_requests.user_id` menyimpan `user_accounts.id` sebagai teks.
- `attendance_records.id`, ID pengajuan, ID riwayat approval, serta ID kantor memakai UUID.
- `status='pending'` menyatakan pengajuan belum final; `approval_status` dan `current_approval_level` menyatakan tahap yang sedang aktif.
- Keputusan akhir selalu menyelaraskan `status`, `approval_status`, riwayat approval, dan saldo dalam satu transaksi RPC `review_workforce_request`.
- Hierarki lama: supervisor (1), manager (2), VP (3). Jika kolom `attendance_hr_id`, `attendance_manager_id`, atau `attendance_vp_id` digunakan, hierarki detail: supervisor (1), HR (2), manager (3), VP (4). Tahap tanpa approver dilewati.
- Koreksi: `attendance_correction_requests`; absen di luar radius: `attendance_requests`. Keduanya ditinjau dari tab **Request Absen**.
- Tanggal bisnis dan jam laporan mengikuti **Asia/Jakarta (WIB)**.

Untuk memindahkan data lama, pertahankan ID `user_accounts` saat impor; jangan memakai ID tabel `company_employees` sebagai `user_id`. Buat ulang akun Auth di proyek baru lalu hubungkan UUID Auth yang baru berdasarkan email. Setelah impor ID numerik, sesuaikan sequence:

```sql
select setval(pg_get_serial_sequence('public.user_accounts','id'),
  coalesce((select max(id) from public.user_accounts),1),
  exists(select 1 from public.user_accounts));
```

## Pemeriksaan instalasi

```sql
select table_name from information_schema.tables where table_schema='public' order by table_name;
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in (
  'clock_in_attendance','clock_out_attendance','review_workforce_request',
  'get_my_leave_balance','submit_attendance_correction_request',
  'review_attendance_correction_request','review_outside_radius_attendance'
) order by proname;
```

Kemudian uji dengan dua akun berbeda: karyawan melakukan absen/pengajuan, approver meninjau dari HR, lalu karyawan memuat ulang riwayat. Data kosong ditampilkan sebagai kosong dan kegagalan query ditampilkan sebagai error, bukan diganti data demo.
