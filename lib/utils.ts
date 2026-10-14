import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Konversi format tanggal ke format DD/MM/YYYY standar Indonesia
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr || dateStr === '—' || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '—';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '—';

  // Sudah format DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Format DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    return trimmed.replace(/-/g, '/');
  }

  // Format ISO atau YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  // Coba parse dengan Date
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {}

  return trimmed;
}

/**
 * Normalisasi jenis kelamin ke 'Laki-laki' atau 'Perempuan'
 */
export function normalizeGender(g?: string | null): string {
  if (!g) return '';
  const s = String(g).trim().toLowerCase();
  if (s === 'female' || s === 'perempuan' || s === 'wanita' || s.includes('perempuan') || s.includes('female') || s.includes('wanita')) return 'Perempuan';
  if (s === 'male' || s === 'laki-laki' || s === 'laki' || s === 'pria' || s.includes('laki') || s.includes('male') || s.includes('pria')) return 'Laki-laki';
  return String(g).trim();
}

/**
 * Normalisasi agama ke nilai resmi
 */
export function normalizeReligion(r?: string | null): string {
  if (!r) return '';
  const s = String(r).trim().toLowerCase();
  if (s.includes('islam')) return 'Islam';
  if (s.includes('katolik') || s.includes('catholic')) return 'Katolik';
  if (s.includes('kristen') || s.includes('protestan') || s.includes('christian')) return 'Kristen Protestan';
  if (s.includes('hindu')) return 'Hindu';
  if (s.includes('buddh') || s.includes('budh')) return 'Buddha';
  if (s.includes('khonghucu') || s.includes('konghucu') || s.includes('confucian')) return 'Khonghucu';
  if (s.includes('other') || s.includes('lain')) return 'Lainnya';
  return String(r).trim();
}
