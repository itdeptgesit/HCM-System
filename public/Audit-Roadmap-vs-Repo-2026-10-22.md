# Audit Roadmap HCM vs Kode Repo

Tanggal: 22 Oktober 2026
Dokumen yang diaudit: `Roadmap-Implementasi-HCM-dari-Kompetitor.docx`
Cakupan kode: `D:\web\app-hr` dan `D:\web\app-absen` (klaim Fase 1/2/5 ada di repo mobile)

## Ringkasan

Sebagian besar klaim roadmap benar. Yang perlu dikoreksi: dua fase sudah hampir selesai (3 dan 4),
satu fase punya lingkup deteksi yang jauh lebih sempit dari yang ditulis (2), dan satu item
keamanan (bucket privat) bukan sekadar konfigurasi — butuh perubahan di dua aplikasi.

| Fase | Klaim dokumen | Status | Kode |
|---|---|---|---|
| 0 | Policy RLS bocor | Benar, dan lebih parah | `attendance_update_own`, `attendance_select_approvers`, bucket `medical-docs` |
| 1 | IntegrityService belum tersambung | Benar | `app-absen/mobile/lib/services/integrity_service.dart` |
| 2 | `flag_suspicious_attendance()` belum terjadwal | Benar, lingkup sempit | `app-absen/supabase/migrations/202610190001...sql` |
| 3 | Alert kontrak/probation belum ada | Sebagian sudah ada + bug | `LiveHRDashboard.tsx` |
| 4 | Rekap Finance belum ada | Sebagian besar sudah ada | `AttendanceReport.tsx` |
| 5 | Hanya deteksi "tepat 1 wajah" | Benar | `app-absen/mobile/lib/utils/face_check.dart` |
| 6 | Modul aset belum ada | Benar | — |

## Fase 0 — Fondasi keamanan data

### Temuan terkonfirmasi

1. **Karyawan bisa mengubah absensinya sendiri lewat API.**
   Policy `attendance_update_own` memberi `UPDATE` penuh atas baris milik sendiri:
   jam masuk/pulang, koordinat, foto, status. Geofence dan approval dilewati.
   - `app-absen/supabase/migrations/202610130003_attendance_live_schema_repair.sql` (bagian 8)
   - `app-absen/supabase/migrations/202610060004_attendance_rls.sql`

2. **Absensi pending semua karyawan bisa dibaca siapa pun.**
   Policy `attendance_select_approvers` memakai `approval_status <> 'approved'`, sehingga
   setiap akun login dapat membaca baris pending milik siapa pun, termasuk GPS dan URL foto.
   - `app-absen/supabase/migrations/202610210002_live_attendance_approval_workflow.sql`

3. **Tabel lokasi kantor bisa diubah non-admin.**
   `office_locations` punya policy `FOR ALL USING (true)` di schema legacy, sementara
   UI HR menulis langsung dengan anon client (`AttendanceRadius.tsx`).
   - `hr_standalone_schema.sql:545`
   - `app-absen/supabase/migrations/202610060006_office_locations_diagnostic_read.sql`

4. **Foto absensi dan dokumen medis ada di bucket publik dengan akses anon penuh.**
   - `supabase/09_master_fix_all_bugs.sql:361-377`
   - `supabase/FINAL_STORAGE_AND_PERMISSIONS.sql:9-17`
   - Unggahan sebenarnya memakai bucket `medical-docs`, path `attendance/<user_id>_<ts>.jpg`
     (`app-absen/mobile/lib/services/photo_service.dart:85`).

### Yang tidak disebut dokumen

- **`medical-docs` juga publik.** Bucket ini dipakai untuk bukti medis/reimbursement,
  dampaknya lebih besar daripada foto absensi.
- **Schema kanonik tidak membersihkan policy legacy.** `supabase/01_schema.sql` hanya
  menghapus policy bernama `workforce_*`; policy `"Public full access ..."` dari
  `hr_standalone_schema.sql` tetap tertinggal meski schema kanonik dijalankan ulang.
- **Bucket privat bukan toggle.** Aplikasi menyimpan URL publik di kolom foto dan
  menampilkannya lewat `<img src>`; memprivatkan bucket akan mematikan semua bukti foto
  lama. Butuh migrasi ke signed URL di app-hr dan app-absen.
- File `Verifikasi-Policy-Supabase-Live.sql` yang dirujuk dokumen tidak ada. Sudah dibuat.

### Tindakan yang sudah dikerjakan

- `supabase/Verifikasi-Policy-Supabase-Live.sql` — 8 query read-only, termasuk uji akses
  nyata sebagai karyawan biasa (Q7).
- `supabase/21_harden_attendance_policies.sql` — menutup baca pending lintas karyawan,
  mencabut tulis langsung karyawan, mengubah RPC clock-in/out ke `SECURITY DEFINER`,
  membatasi tulis `office_locations` ke HR, dan mencabut anon dari storage.

## Fase 1 — Anti-fraud absensi dasar

- **Benar:** `IntegrityService` ada di `app-absen/mobile/lib/services/integrity_service.dart`
  (mock location, root, akurasi GPS) tetapi tidak dipanggil di mana pun.
- **Yang tidak disebut:** `clock_in_attendance` tidak punya parameter integritas perangkat,
  jadi perlu migration + kolom baru, bukan hanya "menyambungkan".
- **`pending_verification` sudah ada** sebagai `verification_status`
  (`normal|pending_verification|flagged`) di migration `202610190001...`. Roadmap
  menyarankannya sebagai status baru; sebaiknya pakai kolom ini.
- **Radius tidak konsisten:** default 50 (`01_schema.sql:62`), fallback `|| 50`
  (`AttendanceRadius.tsx:59,65,802`), default 200 dan fallback 100 di
  `SystemSettings.tsx:104,1129`, preset 50/100/150/200/300/500 di `:1137`.
- **Pengingat 10:00 belum ada.** Yang ada hanya toggle di localStorage
  (`SystemSettings.tsx:1378-1397`, disimpan di `:236`) tanpa job/backend.

## Fase 2 — Deteksi absensi mencurigakan

- **Benar:** `flag_suspicious_attendance()` ada dan tidak terjadwal. Tidak ada
  `cron.schedule` di kedua repo untuk fungsi ini.
- **Lingkup jauh lebih sempit:** fungsi hanya menandai koordinat identik yang dipakai
  lebih dari 3 karyawan pada hari yang sama. Tidak ada deteksi "lokasi melompat",
  "jam tidak wajar", atau "perangkat berganti-ganti" seperti yang dijanjikan dokumen.
- **Antrean review belum ada sama sekali.** Tidak ada kode app-hr yang membaca
  `verification_status`.

## Fase 3 — Notifikasi kontrak & probation

- **Sebagian besar sudah ada:** Action Center "Perlu perhatian HR" dengan baris
  kontrak PKWT dan probation (`LiveHRDashboard.tsx:2208-2320`), dihitung di `:694-711`.
- **Bug yang lebih mendesak:** `isContractExpiringWithin30Days` mengembalikan
  `diffDays >= 0 && diffDays <= 30`, sehingga kontrak/probation yang **sudah lewat**
  hilang dari daftar. Kasus terburuk justru tidak terlihat. **Sudah diperbaiki.**
- **Dua sumber tanggal probation:** dashboard menyimpulkan dari string `contract_type`
  dan `contract_end_date`; tanggal resmi ada di `employee_appointments.probation_end_date`.
  **Sudah disatukan** — dashboard memakai tanggal SK bila tersedia.
- **Belum ada:** alert bertingkat H-30/H-14/H-7, eskalasi merah, dan pencatatan keputusan
  wajib (diangkat tetap / diperpanjang / selesai). Toggle "Alert Masa Kontrak PKWT Habis"
  hanya tersimpan di localStorage dan tidak mengirim apa pun.

## Fase 4 — Rekap absensi siap Finance

- **Hampir selesai:** `AttendanceReport.tsx:199-224` sudah mengekspor hari wajib hadir,
  hadir, terlambat, lupa clock-out, tanpa log, absen, cuti, lembur, per perusahaan,
  plus sheet log harian (`:236-261`).
- **Kurang:** keterlambatan masih jumlah kejadian, bukan menit (`:214`); belum ada kolom
  penanda "data belum lengkap" (hanya tersirat di "Tanpa Log / Mangkir"); belum ada
  ekspor per entitas terpisah atau ekspor terjadwal.

## Fase 5 — Liveness & face matching

- **Benar:** mobile hanya menghitung wajah `== 1` dengan ML Kit
  (`app-absen/mobile/lib/utils/face_check.dart`), tanpa liveness dan tanpa pencocokan
  dengan foto profil.
- **Estimasi 2–3 minggu belum menghitung:** kualitas/enrollment foto profil, tuning
  threshold, dan antrean review manual — yang berarti bergantung pada Fase 2.

## Fase 6 — Inventaris aset

Benar: tidak ada kode inventaris, serah-terima, atau pengembalian aset di repo.

## "Yang Sengaja TIDAK Dibangun"

Sebagian tidak akurat:

- `PayrollManager` menghitung BPJS (3% TK, 1% Kesehatan) dan PPh 21, dan
  `RecruitmentManager` adalah implementasi utuh. Keduanya hanya dialihkan route-nya ke `/`
  (`App.tsx:480-489`). Secara produk benar, secara kode ada dead code yang bisa aktif
  kembali tanpa sengaja, plus kolom `payroll_status`, `tax_status`, `bank_account_number`
  di `user_accounts`.

## Koreksi yang disarankan untuk dokumen roadmap

1. Fase 0: tambahkan `medical-docs`, dan nyatakan bahwa schema kanonik tidak membersihkan
   policy legacy. Pisahkan "bucket privat" ke fase tersendiri karena butuh perubahan aplikasi.
2. Fase 1: sebutkan migration parameter integritas dan pemakaian `verification_status`.
3. Fase 2: tulis ulang lingkup deteksi sesuai yang benar-benar ada di fungsi.
4. Fase 3: perbaikan bug tanggal adalah langkah pertama; satukan sumber tanggal probation.
5. Fase 4: sisakan tiga kolom dan penanda data belum lengkap, bukan membangun ekspor baru.
6. Fase 5: estimasi harus mencakup enrollment foto dan antrean review manual.
