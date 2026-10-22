# Migrasi File ke Google Drive

Tujuan: Supabase tidak lagi menyimpan file, hanya URL. Semua unggahan baru
masuk ke Google Drive lewat Edge Function `upload-to-gdrive`.

## Kondisi setelah perubahan

| Asal file | Sebelum | Sesudah |
| --- | --- | --- |
| Web app-hr (SK, berita, dokumen karyawan, avatar) | Drive | Drive (tidak berubah) |
| Mobile: foto absensi masuk/pulang | Supabase `medical-docs` | Drive `Absensi/[KODE] Nama` |
| Mobile: bukti reimbursement | Supabase `medical-docs` | Drive `Reimbursement/[KODE] Nama` |
| Mobile: avatar (fallback) | Supabase `medical-docs` | Drive `Dokumen Karyawan/[KODE] Nama` |

Yang disimpan di database hanya URL:

- Foto gambar: `https://lh3.googleusercontent.com/d/<fileId>=w1024`
- Dokumen non-gambar: `webViewLink` Drive

`lib/driveImage.ts` mengubah link Drive (`/file/d/<id>` atau `?id=<id>`)
menjadi URL thumbnail saat ditampilkan. Data lama yang masih berupa URL
Supabase tetap tampil apa adanya selama migrasi.

## 1. Deploy fungsi & secrets

```powershell
cd D:\web\app-hr
supabase link --project-ref oyhwtleoftbiyabsgjsu
supabase functions deploy upload-to-gdrive
```

Secrets yang wajib ada (set sekali):

```powershell
supabase secrets set GDRIVE_SERVICE_ACCOUNT_JSON="<isi json service account>"
supabase secrets set GDRIVE_FOLDER_ID="<id folder root di Drive>"
# opsional: matikan akses "anyone with link" untuk foto absensi
supabase secrets set GDRIVE_ATTENDANCE_PUBLIC="false"
```

Service account harus diberi akses Editor ke folder root. Gunakan Shared
Drive bila tersedia: service account tidak punya kuota penyimpanan pribadi.

`GDRIVE_ATTENDANCE_PUBLIC` default `true` agar `<img>` di web dan
`Image.network` di mobile bisa langsung membaca foto (setara bucket publik
yang dipakai sebelumnya). Jika diset `false`, file bersifat privat dan
aplikasi butuh proxy/URL bertanda tangan agar foto tetap tampil.

## 2. Keamanan yang ikut diperketat

`upload-to-gdrive` sebelumnya tidak memeriksa pemanggil. Sekarang:

- Wajib sesi login valid + baris `user_accounts` yang cocok.
- Kategori pribadi (`attendance_photo`, `payment_proof`, `foto_profil`, `ktp`,
  `ijazah`, `bpjs`, `sk_karyawan`) hanya boleh untuk diri sendiri; HR boleh
  untuk karyawan lain.
- Kategori perusahaan (`sk_perusahaan`, `news_*`, `internal_hr`) hanya HR.
- Payload dibatasi ±6 MB (base64).
- Aksi `make_public`/`share` hanya HR.

## 3. File lama (tahap development)

File yang sudah terlanjur ada di Supabase Storage **tidak dimigrasi**. Ini
keputusan sadar karena aplikasi masih dalam pengembangan dan datanya masih
data uji.

Konsekuensinya:

- Bucket `medical-docs` dan `attendance-selfies` **jangan ditutup/dikosongkan**
  selama masih ada baris lama yang menunjuk ke sana, atau foto lama akan
  blank. Read publik dibiarkan terbuka untuk sementara.
- `21_harden_attendance_policies.sql` hanya menutup tulis/anon; read tetap
  dibuka. Bagian penutupan read baru dijalankan setelah data uji dibersihkan.

Saat aplikasi mau go-live, pilih salah satu:

1. Hapus data uji lama (baris + objek storage), lalu tutup bucket; atau
2. Migrasikan file lama dulu, baru tutup bucket.

Sampai salah satu dilakukan, tidak ada file baru yang masuk ke Supabase —
hanya sisa data lama.

## 4. Batasan yang perlu diketahui

- **Offline.** Unggah foto tetap butuh internet. Di mobile, absensi offline
  akan berjalan tanpa foto bila unggahan gagal (perilaku sama seperti
  sebelumnya). Perbaikan berikutnya: simpan file di perangkat, unggah saat
  sinkronisasi, lalu lengkapi `photo_url` lewat RPC.
- **Ukuran.** Edge Function bukan jalur untuk file besar; batas aman ±6 MB
  setelah base64. Foto absensi mobile sudah dikompres di perangkat.
- **Kuota Drive.** Kuota mengikuti akun/Shared Drive pemilik folder, bukan
  Supabase.
- **Latensi.** Unggah ke Drive menambah waktu sebelum absensi tercatat.
  Saat ini unggahan dilakukan sebelum RPC `clock_in_attendance`.

## 5. Rollback

Kode lama masih bisa dikembalikan dengan `git revert` pada:
`supabase/functions/upload-to-gdrive/index.ts` dan
`D:\web\app-absen\mobile\lib\services\photo_service.dart`. File yang sudah
terlanjur di Drive tetap aman; URL di database tidak perlu diubah balik.
