# Notifikasi pengajuan dari email HR

Pengirim tetap: **hr-admin@gesit.co.id** (nama tampilan: GESIT HR). Fitur belum aktif hanya dengan deploy kode.
Konfigurasi Google Drive dan akun login Supabase tidak perlu diubah.

## Perilaku

- Pengajuan cuti, request/koreksi absen, dan live attendance **di luar lokasi** masuk ke antrean dari trigger database, termasuk pengajuan dari `app-absen`.
- Email permintaan persetujuan hanya ke approver pada tahap aktif dari `workforce_approval_chain`. Tahap berikutnya mendapat email setelah status/tahap berpindah.
- Keputusan final approved/rejected dikirim ke karyawan pemohon, bukan ke seluruh approver sekaligus.
- Clock-in/out biasa, lembur, reimbursement, dan data historis tidak diikutkan.
- Notifikasi membaca status yang sudah disimpan. Fitur ini tidak mengganti RPC, aturan kewenangan, atau urutan approval yang sudah berjalan.
- Email berformat kartu: logo GESIT, judul pengajuan, sapaan, rincian (jenis cuti, tanggal, durasi, alasan, sisa saldo cuti bila tersedia), tombol Setujui/Tolak, dan tautan ke aplikasi. Foto, koordinat, lampiran, serta berkas medis tidak disertakan.
- **Cuti dapat diputuskan langsung dari email.** Tombol membuka halaman konfirmasi di Edge Function (tanpa login), lalu keputusan disimpan setelah tombol Setujui/Tolak ditekan. Tautan ditandatangani (HMAC), berlaku 7 hari, hanya untuk satu tahap, dan diverifikasi ulang ke database saat dibuka/ditekan sehingga tidak bisa dipakai setelah pengajuan diproses, dialihkan, atau kedaluwarsa.
- Request/koreksi absen dan live attendance **belum** bisa diputuskan dari email; tombolnya membuka halaman persetujuan aplikasi dan tetap wajib login. Alasannya keputusan absen menulis ke rekap presensi sehingga perlu diuji terpisah.
- Jangan meneruskan email persetujuan: siapa pun yang memegang tautan dapat mengambil keputusan untuk tahap itu sampai pengajuan diproses.
- Logo diambil dari `{HR_APP_URL}/image/logo.png`. Pastikan file `public/image/logo.png` ikut ter-deploy dan dapat diakses publik tanpa login; bila tidak, gambar tidak tampil tetapi teks email tetap terbaca.

## 1. Pasang antrean database

Pada proyek Supabase yang dipakai **kedua aplikasi**, jalankan `14_workforce_email_notifications.sql` lewat SQL Editor setelah schema dan fungsi approval yang sudah ada. Tidak perlu menjalankan ulang migrasi lama.

SQL ini hanya menambahkan tabel/fungsi/trigger notifikasi. Tidak memigrasikan atau mengubah pengajuan lama dan tidak mengaktifkan pengiriman. Perubahan pengajuan baru dan enqueue berada dalam transaksi yang sama. Kegagalan Gmail tidak membatalkan pengajuan.

File ini aman dijalankan ulang. Setelah pembaruan template email (jenis cuti, durasi, alasan, saldo), jalankan ulang `14_...sql` agar fungsi `prepare_workforce_email` mengirim data tambahan itu, lalu deploy ulang function-nya.

Setelah `14_...sql`, jalankan juga `16_workforce_email_approval.sql` (urutan: 14 → 16 → 15). File ini menambah kolom penerima, fungsi keputusan cuti dari email, dan membungkus ulang `review_workforce_request` agar logika approval aplikasi tetap satu sumber. Aman dijalankan ulang, tidak mengubah pengajuan lama, dan tidak mengaktifkan pengiriman.

## 2. Izin Gmail dari akun HR

Akun pengirim harus merupakan mailbox Google Workspace aktif milik `hr-admin@gesit.co.id`, bukan Google Group maupun alias dari mailbox lain. Implementasi ini memverifikasi identitas OAuth tepat alamat tersebut; token akun IT atau alamat lain ditolak. Jika sebelumnya pernah otorisasi dengan akun lain, cabut aksesnya di **myaccount.google.com → Data & privacy → Third-party apps** milik akun tersebut, lalu ulangi langkah 4–6 dengan akun `hr-admin`.

Gunakan OAuth terpisah dari service account Google Drive:

1. Pada Google Cloud project milik organisasi, aktifkan **Gmail API** di **APIs & Services > Library**.
2. Di **Google Auth Platform**, lengkapi Branding dan gunakan **Audience: Internal** untuk Workspace perusahaan. Kebijakan organisasi mungkin memerlukan persetujuan admin untuk aplikasi/scope Gmail. Jangan memakai konfigurasi External/Testing sebagai koneksi produksi karena refresh token dapat kedaluwarsa.
3. Buat OAuth client jenis **Web application**. Tambahkan authorized redirect URI berikut tepat tanpa trailing slash:
   `https://developers.google.com/oauthplayground`
4. Buka [Google OAuth Playground](https://developers.google.com/oauthplayground/). Di pengaturan, aktifkan **Use your own OAuth credentials**, masukkan Client ID/Client Secret client tersebut, pilih **Access type: Offline** dan **Force prompt: Consent Screen**.
5. Authorize scopes berikut, dengan akun **hr-admin@gesit.co.id**:

   ```text
   openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send
   ```

6. Pada Step 2, pilih **Exchange authorization code for tokens**. Simpan **refresh token**, bukan access token sementara, langsung ke Supabase Secrets. Client ID, Client Secret, dan refresh token adalah tiga nilai yang berbeda. Playground tanpa **own credentials** mencabut refresh token setelah 24 jam.

Scope pengiriman tidak memberikan akses membaca kotak masuk. Scope identitas dipakai agar aplikasi tidak diam-diam mengirim dengan akun yang salah. Jangan mengirim credential, token, password, atau tangkapan layar yang menampilkannya ke chat/git.

## 3. Isi Supabase Secrets

Masukkan di **Edge Functions > Secrets**. Contoh nama tersedia di `functions/send-workforce-emails/.env.example`; semua nilai hanya untuk backend, tidak boleh memakai awalan `VITE_`.

| Nama | Isi |
| --- | --- |
| `GMAIL_OAUTH_CLIENT_ID` | Client ID Google dari langkah 2 |
| `GMAIL_OAUTH_CLIENT_SECRET` | Client Secret Google dari langkah 2 |
| `GMAIL_OAUTH_REFRESH_TOKEN` | Refresh token dari mailbox `hr-admin@gesit.co.id` |
| `HR_APP_URL` | URL HTTPS aplikasi HR yang benar, bukan URL Supabase/aplikasi absen |
| `HR_EMAIL_WORKER_SECRET` | Secret acak minimal 32 karakter, berbeda dari semua API key |

Untuk membuat worker secret, jalankan **sendiri di terminal lokal**, lalu simpan hasilnya, jangan tempel ke chat:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` memakai secrets server bawaan Edge Functions. Pengirim email sudah ditetapkan di kode; tidak perlu mengubah SMTP Supabase Auth. SMTP Auth untuk login/reset password berbeda dari notifikasi pengajuan ini.

## 4. Deploy dan jadwalkan worker

Dari root `app-hr`, pilih/link proyek Supabase yang benar lalu deploy:

```powershell
supabase functions deploy send-workforce-emails
```

`config.toml` mematikan JWT gateway hanya untuk function ini. Endpoint tetap menolak pemanggil tanpa header rahasia `x-email-worker-secret`; anon key atau sesi karyawan tidak memberikan izin mengirim email. Endpoint tidak menerima alamat penerima/pengirim dari request body.

Function yang sama juga melayani halaman konfirmasi approval cuti dari tautan `?t=...`. Halaman itu hanya bisa dibuka dengan tautan bertanda tangan; `GET` tidak mengubah data, keputusan baru disimpan lewat `POST` dari tombol di halaman. Tanda tangan memakai `HR_EMAIL_WORKER_SECRET` yang sama, jadi merotasi secret akan membatalkan tautan email yang belum dipakai. Halaman memakai `SUPABASE_URL` dan service role bawaan function, tidak perlu secret tambahan.

Aktifkan **Cron (pg_cron)** dan **pg_net** melalui Supabase dashboard. Di **Vault**, simpan dua secret berikut lewat UI agar nilainya tidak ditulis ke riwayat SQL:

| Nama secret Vault | Isi |
| --- | --- |
| `workforce_email_project_url` | URL proyek, bentuk `https://PROJECT_REF.supabase.co` |
| `workforce_email_worker_secret` | Nilai yang sama persis dengan `HR_EMAIL_WORKER_SECRET` |

Jalankan `15_schedule_workforce_emails.sql`. Job bernama `gesit-workforce-emails` memanggil worker setiap menit, maksimal lima email per batch. Pengiriman masih nonaktif sampai langkah 5. Jika worker secret dirotasi, perbarui baik Edge Functions Secrets maupun Vault.

## 5. Aktifkan dan uji dengan pengajuan nyata terbatas

Periksa antrean terlebih dahulu. Agar antrean yang terkumpul selama setup **tidak tiba-tiba mengirim email**, aktivasi awal berikut melewati notifikasi pra-go-live, tanpa menghapus/mengubah pengajuannya:

```sql
begin;
update public.workforce_email_outbox
set status='skipped',last_error='BEFORE_EMAIL_GO_LIVE'
where status in ('pending','blocked','failed') and sent_at is null;
update public.workforce_email_settings set enabled=true where id=true;
commit;
```

Lalu uji dengan karyawan dan approver yang sudah disepakati:

1. Ajukan satu cuti baru. Hanya approver tahap pertama yang menerima email dari HR.
2. Setujui dari halaman konfirmasi email (atau dari aplikasi). Approver berikutnya menerima email, bukan semua atasan sekaligus.
3. Selesaikan approval atau tolak. Karyawan menerima hasil final. Coba klik ulang tautan lama: harus tampil "sudah diproses", bukan keputusan kedua.
4. Ulangi untuk request/koreksi absen dan pengajuan di luar lokasi. Clock-in/out normal tidak mengirim email.
5. Pastikan tautan approval mengarah ke `https://PROJECT_REF.supabase.co/functions/v1/send-workforce-emails`, sedangkan tautan "Lihat di aplikasi" mengarah ke domain HR yang benar.

Keberhasilan Gmail API berarti Gmail menerima pesan untuk dikirim, bukan jaminan email masuk inbox; periksa spam, kebijakan organisasi, dan email log Workspace jika diperlukan.

## Monitoring, retry, dan penghentian

Antrean hanya dapat dibaca/diproses server/service role. HR/admin proyek dapat memeriksanya di SQL Editor:

```sql
select id,request_table,request_id,request_state,status,attempts,last_error,created_at,sent_at
from public.workforce_email_outbox order by created_at desc limit 50;
```

- `sent`: Gmail menerima email dan message ID dicatat.
- `skipped`: tahap sudah lewat, pengajuan dihapus/dibatalkan, atau notifikasi pra-go-live dilewati.
- `blocked`: approver/email belum diisi, email tidak valid, akun tidak aktif, atau approver adalah pemohon sendiri. Tidak ada fallback kirim massal ke HR.
- `pending`: menunggu jadwal atau retry. Kegagalan jaringan/rate-limit/server dicoba sampai lima attempt dengan jeda bertambah; kegagalan permanen menjadi `failed`.
- `processing`: diklaim worker. Lease sepuluh menit mencegah worker lain mengirim pekerjaan yang sama bersamaan. Worker memeriksa ulang status dan approver sebelum mengirim.

Jika token HR dicabut/kedaluwarsa atau identitas akun salah, worker berhenti sebelum mengklaim pekerjaan. Hubungkan ulang OAuth dan perbarui refresh token. Jika Gmail mencapai kuota harian, tunggu kuota pulih; pesan yang sudah `failed` harus dicoba ulang oleh admin, bukan dengan mengirim ulang pengajuannya.

Setelah memperbaiki penyebab `blocked`/`failed`, retry **satu ID yang telah diperiksa**, bukan seluruh tabel:

```sql
update public.workforce_email_outbox
set status='pending',attempts=0,available_at=now(),last_error=null,lease_token=null,lease_until=null
where id='GANTI_DENGAN_UUID_EVENT'::uuid and status in ('blocked','failed');
```

Untuk menghentikan pengiriman tanpa mematikan pengajuan:

```sql
update public.workforce_email_settings set enabled=false where id=true;
```

Pesan yang sudah sedang dikirim ke Google mungkin tetap terkirim saat fitur dinonaktifkan. Pengiriman bersifat **at-least-once**: bila Gmail sudah menerima pesan tetapi jaringan/acknowledgement database gagal, retry bisa menghasilkan email duplikat. Message-ID dibuat stabil, tetapi ini bukan jaminan exactly-once dari Gmail.

## Pemeriksaan lokal

```powershell
node --test tests/workforce-email-worker.mjs
node --test tests/workforce-email-action.mjs
# Install @electric-sql/pglite di lokasi QA, lalu arahkan PGLITE_MODULE ke package itu:
node --test tests/workforce-email-outbox.mjs
deno check supabase/functions/send-workforce-emails/index.ts
deno lint --rules-exclude=no-import-prefix supabase/functions/send-workforce-emails```

SQL test menjalankan PostgreSQL embedded (PGlite) dan fungsi hierarchy dari repo. Worker test menggunakan Google API tiruan; tidak mengirim email nyata dan tidak membuktikan credential/deployment produksi sudah aktif. Jadwal pg_cron/pg_net tetap perlu diverifikasi pada proyek Supabase tujuan.

Referensi: [Gmail send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send), [OAuth offline](https://developers.google.com/identity/protocols/oauth2/web-server#offline), [OAuth Playground](https://developers.google.com/oauthplayground/), [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions).
