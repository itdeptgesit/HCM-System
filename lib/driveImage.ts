/**
 * Google Drive tidak bisa dipakai langsung sebagai `src` gambar: link
 * `drive.google.com/file/d/<id>/view` mengembalikan halaman HTML, bukan byte
 * gambar. Helper ini mengubah link Drive (webViewLink, open?id=, atau lh3 yang
 * sudah jadi) menjadi URL thumbnail yang bisa dipakai <img>.
 *
 * URL non-Drive dikembalikan apa adanya supaya data lama (Supabase Storage)
 * tetap tampil selama proses migrasi.
 */
export function toDriveImageUrl(url?: string | null, width = 1024): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (!clean) return null;
  if (clean.startsWith('data:image/')) return clean;

  // Sudah berupa URL lh3/googleusercontent atau thumbnail Drive.
  if (clean.includes('lh3.googleusercontent.com') || clean.includes('drive.google.com/thumbnail')) {
    return clean;
  }

  const match =
    clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);

  if (match?.[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=w${width}`;
  }

  return clean;
}
