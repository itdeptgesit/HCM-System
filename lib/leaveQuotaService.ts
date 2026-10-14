import { supabase } from './supabaseClient';
import { UserAccount } from '../types';

/**
 * Ketentuan Resmi Pasal 22:
 * Izin Meninggalkan Pekerjaan dengan Mendapat Upah (Cuti Khusus Berbayar)
 */
export interface Article22SpecialLeave {
  id: string;
  label: string;
  maxDays: number;
  articleClause: string;
  deductsAnnualLeave: boolean;
  description: string;
}

export const ARTICLE_22_LEAVE_TYPES: Article22SpecialLeave[] = [
  {
    id: 'marriage_self',
    label: 'Pernikahan Pekerja Sendiri',
    maxDays: 3,
    articleClause: 'Pasal 22 Ayat 1 (a)',
    deductsAnnualLeave: false,
    description: 'Izin meninggalkan pekerjaan dengan tetap mendapat upah selama 3 (tiga) hari kerja.'
  },
  {
    id: 'marriage_child',
    label: 'Pernikahan Anak Pekerja',
    maxDays: 2,
    articleClause: 'Pasal 22 Ayat 1 (b)',
    deductsAnnualLeave: false,
    description: 'Izin meninggalkan pekerjaan dengan tetap mendapat upah selama 2 (dua) hari kerja.'
  },
  {
    id: 'circumcision_baptism',
    label: 'Khitanan / Pembaptisan Anak Pekerja',
    maxDays: 2,
    articleClause: 'Pasal 22 Ayat 1 (c)',
    deductsAnnualLeave: false,
    description: 'Izin meninggalkan pekerjaan dengan tetap mendapat upah selama 2 (dua) hari kerja.'
  },
  {
    id: 'family_bereavement',
    label: 'Keluarga Pekerja Meninggal Dunia',
    maxDays: 2,
    articleClause: 'Pasal 22 Ayat 1 (d)',
    deductsAnnualLeave: false,
    description: 'Izin meninggalkan pekerjaan karena suami/istri/orang tua/mertua/anak/menantu meninggal dunia selama 2 (dua) hari kerja.'
  },
  {
    id: 'wife_maternity',
    label: 'Istri Pekerja Melahirkan / Keguguran',
    maxDays: 3,
    articleClause: 'Pasal 22 Ayat 1 (e)',
    deductsAnnualLeave: false,
    description: 'Izin meninggalkan pekerjaan saat istri melahirkan atau mengalami keguguran kandungan selama 3 (tiga) hari kerja.'
  }
];

export interface LeaveAdjustmentRecord {
  id?: number | string;
  userId: string | number;
  year: number;
  adjustmentDays: number; // bisa positif (+) atau negatif (-)
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
}

export type LeaveQuotaAdjustment = LeaveAdjustmentRecord;

export interface LeaveQuotaSummary {
  userId: string;
  fullName: string;
  employeeCode: string;
  department: string;
  contractType: 'PKWTT' | 'PKWT' | 'Probation' | 'Magang';
  joinDate: string | null;
  tenureYears: number;
  tenureMonths: number;
  isEligible: boolean;
  eligibilityNote: string;
  year: number;
  baseQuota: number;              // Hak cuti tahunan dasar (12 hari atau prorata)
  proratedQuota: number;          // Hasil prorata (12 - bulan join untuk PKWTT tahun pertama, atau durasi kontrak untuk PKWT)
  carryForwardQuota: number;      // Saldo tahun lalu yang dibawa ke tahun ini
  carryForwardExpired: boolean;   // true jika sudah lewat 30 Juni (expired otomatis)
  collectiveLeaveDeduction: number;// Potongan cuti bersama
  leaveTakenDays: number;         // Cuti tahunan terpakai (status approved)
  totalAdjustmentDays: number;    // Akumulasi penyesuaian manual oleh tim HR
  remainingBalance: number;       // Sisa saldo cuti aktif saat ini
  adjustments: LeaveAdjustmentRecord[];
}

/**
 * Default potongan cuti bersama tahun berjalan (SKB 3 Menteri)
 */
export const DEFAULT_COLLECTIVE_LEAVE_DAYS = 4;

/**
 * Mengambil riwayat penyesuaian kuota cuti dari tabel user_activity_logs di Supabase
 */
export async function fetchLeaveAdjustments(userId?: string | number, year = new Date().getFullYear()): Promise<LeaveAdjustmentRecord[]> {
  try {
    let query = supabase
      .from('user_activity_logs')
      .select('*')
      .eq('action', 'LEAVE_QUOTA_ADJUSTMENT')
      .order('id', { ascending: false });

    if (userId) {
      query = query.eq('user_id', Number(userId) || String(userId));
    }

    const { data, error } = await query;
    if (error || !data) return [];

    const adjustments: LeaveAdjustmentRecord[] = [];
    for (const log of data) {
      try {
        const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        if (!parsed) continue;
        if (parsed.year && Number(parsed.year) !== year) continue;

        adjustments.push({
          id: log.id,
          userId: log.user_id,
          year: parsed.year || year,
          adjustmentDays: Number(parsed.adjustment_days || parsed.adjustmentDays || 0),
          reason: parsed.reason || 'Penyesuaian kuota oleh HR',
          adjustedBy: parsed.adjusted_by || parsed.adjustedBy || 'Tim HR',
          adjustedAt: parsed.adjusted_at || parsed.adjustedAt || log.created_at
        });
      } catch {
        // Abaikan jika details bukan JSON valid
      }
    }
    return adjustments;
  } catch (err) {
    console.error('Error fetching leave adjustments:', err);
    return [];
  }
}

/**
 * Menyimpan penyesuaian kuota cuti oleh tim HR ke user_activity_logs Supabase
 */
export async function saveLeaveAdjustment(params: {
  userId: string | number;
  userName: string;
  year: number;
  adjustmentDays: number;
  reason: string;
  adminName: string;
  adminEmail?: string;
  adminRole?: string;
}): Promise<boolean> {
  try {
    const payload = {
      year: params.year,
      adjustment_days: params.adjustmentDays,
      reason: params.reason,
      adjusted_by: params.adminName,
      adjusted_at: new Date().toISOString()
    };

    const detailsStr = JSON.stringify(payload);

    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: Number(params.userId) || null,
      action: 'LEAVE_QUOTA_ADJUSTMENT',
      details: detailsStr
    });

    if (error) {
      console.error('Failed to save leave adjustment:', error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error('Error saving leave adjustment:', err);
    throw err;
  }
}

/**
 * Menghitung hari kerja antara dua tanggal (tidak termasuk Sabtu & Minggu)
 */
export function calculateWorkingDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // bukan Minggu (0) dan bukan Sabtu (6)
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

/**
 * Menghitung Kuota dan Saldo Cuti Karyawan secara komprehensif
 * berdasarkan Ketentuan Resmi Tabel Cuti (Gambar 1)
 */
export function calculateEmployeeLeaveQuota(
  employee: any,
  year = new Date().getFullYear(),
  adjustments: LeaveAdjustmentRecord[] = [],
  leaveRequests: any[] = [],
  collectiveLeaveDeduction = DEFAULT_COLLECTIVE_LEAVE_DAYS
): LeaveQuotaSummary {
  const userId = String(employee.id || '');
  const rawType = String(employee.contract_type || employee.contractType || employee.employment_type || 'PKWTT').toUpperCase();
  
  // Normalisasi contract type ke 4 kategori
  let contractType: 'PKWTT' | 'PKWT' | 'Probation' | 'Magang' = 'PKWT';
  if (rawType.includes('PKWTT') || rawType.includes('TETAP') || rawType.includes('PERMANENT')) {
    contractType = 'PKWTT';
  } else if (rawType.includes('PROBATION') || rawType.includes('PERCOBAAN')) {
    contractType = 'Probation';
  } else if (rawType.includes('MAGANG') || rawType.includes('INTERN')) {
    contractType = 'Magang';
  } else {
    contractType = 'PKWT';
  }

  const joinDateStr = employee.join_date || employee.joinDate || null;
  let tenureYears = 0;
  let tenureMonths = 0;
  let joinYear = year;
  let joinMonth = 1;

  if (joinDateStr) {
    const joinDate = new Date(joinDateStr);
    if (!isNaN(joinDate.getTime())) {
      joinYear = joinDate.getFullYear();
      joinMonth = joinDate.getMonth() + 1; // 1-12
      const now = new Date();
      const diffMs = now.getTime() - joinDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      tenureYears = Number((diffDays / 365.25).toFixed(1));
      tenureMonths = Math.floor(diffDays / 30.44);
    }
  }

  // Cek apakah tanggal saat ini sudah melewati 30 Juni tahun berjalan
  const today = new Date();
  const june30 = new Date(year, 5, 30, 23, 59, 59);
  const isAfterJune30 = today > june30;

  // Filter penyesuaian khusus untuk user ini di tahun berjalan
  const userAdjustments = adjustments.filter(a => String(a.userId) === userId && a.year === year);
  const totalAdjustmentDays = userAdjustments.reduce((acc, curr) => acc + curr.adjustmentDays, 0);

  // Hitung cuti tahunan yang sudah disetujui (approved)
  let leaveTakenDays = 0;
  leaveRequests.forEach(req => {
    if (String(req.user_id) === userId && req.status === 'approved') {
      const lType = String(req.leave_type || '').toLowerCase();
      // Hanya cuti tahunan atau izin yang memotong cuti
      if (lType === 'annual' || lType === 'cuti_tahunan' || lType === 'personal' || lType === 'other') {
        const days = req.total_days || calculateWorkingDays(req.start_date, req.end_date);
        leaveTakenDays += Number(days || 1);
      }
    }
  });

  let isEligible = false;
  let baseQuota = 0;
  let proratedQuota = 0;
  let carryForwardQuota = 0;
  let carryForwardExpired = false;
  let eligibilityNote = '';

  if (contractType === 'PKWTT') {
    // -------------------------------------------------------------
    // KETENTUAN RESMI PKWTT:
    // 1. Hak Cuti 12 hari/tahun setelah melewati 1 tahun masa kerja.
    // 2. Perolehan Cuti: Prorata setelah 1 tahun bekerja dengan formula (12 - bulan join).
    // 3. Refill Saldo: Saldo 12 hari di-refill setiap awal tahun (1 Januari).
    // 4. Carry Forward: Sisa cuti tahun berjalan dapat di-carry forward ke tahun berikutnya
    //    dengan batas max sampai 30 Juni.
    // 5. Expired: Sisa cuti tahun sebelumnya yang masih ada setelah 30 Juni expired otomatis.
    // 6. Cuti Bersama: Memotong Cuti Tahunan.
    // -------------------------------------------------------------
    if (tenureMonths < 12) {
      isEligible = false;
      baseQuota = 0;
      proratedQuota = 0;
      eligibilityNote = `PKWTT belum berhak cuti (Masa kerja: ${tenureMonths} bulan. Berhak setelah 1 tahun bekerja).`;
    } else {
      isEligible = true;
      // Cek apakah baru genap 1 tahun di tahun ini
      const reachedOneYearInCurrentYear = (joinYear + 1) === year;
      if (reachedOneYearInCurrentYear) {
        // Prorata formula (12 - bulan join)
        proratedQuota = Math.max(1, 12 - joinMonth);
        baseQuota = proratedQuota;
        eligibilityNote = `Prorata tahun pertama setelah 1 thn: (12 - ${joinMonth} bln join) = ${proratedQuota} hari.`;
      } else {
        baseQuota = 12;
        proratedQuota = 12;
        eligibilityNote = 'Hak Cuti Tahunan Reguler: 12 hari per tahun (Refill 1 Januari).';
      }

      // Carry forward handling (default asumsi 3 hari sisa tahun lalu jika karyawan lama)
      if (tenureYears >= 2) {
        const estimatedPreviousRemainder = 3;
        if (isAfterJune30) {
          carryForwardQuota = 0;
          carryForwardExpired = true;
        } else {
          carryForwardQuota = estimatedPreviousRemainder;
          carryForwardExpired = false;
        }
      }
    }
  } else if (contractType === 'PKWT') {
    // -------------------------------------------------------------
    // KETENTUAN RESMI PKWT:
    // 1. Perolehan Cuti: Full dari awal masuk (langsung aktif).
    // 2. Hak Cuti Tahunan: Prorata menyesuaikan lama kontrak (misal kontrak 6 bln = 6 hari, 1 hari/bulan).
    // 3. Refill Saldo: Di-refill sesuai periode perpanjangan kontrak.
    // 4. Carry Forward: TIDAK ADA (sisa cuti kontrak sebelumnya tidak dibawa ke kontrak baru).
    // 5. Cuti Bersama: Memotong Cuti Tahunan.
    // -------------------------------------------------------------
    isEligible = true;
    // Estimasi durasi kontrak dari tanggal kontrak jika ada
    let contractMonths = 12;
    if (employee.contract_start_date && employee.contract_end_date) {
      const s = new Date(employee.contract_start_date);
      const e = new Date(employee.contract_end_date);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
        contractMonths = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
      }
    }
    proratedQuota = Math.min(12, contractMonths);
    baseQuota = proratedQuota;
    carryForwardQuota = 0;
    carryForwardExpired = false;
    eligibilityNote = `PKWT aktif dari awal masuk: Prorata ${contractMonths} bln kontrak = ${proratedQuota} hari hak cuti.`;
  } else if (contractType === 'Probation') {
    isEligible = true;
    baseQuota = 3; // 3 bulan masa percobaan
    proratedQuota = 3;
    carryForwardQuota = 0;
    carryForwardExpired = false;
    eligibilityNote = 'Probation: Hak cuti evaluasi 3 hari (1 hari / bulan masa percobaan).';
  } else {
    // Magang
    isEligible = false;
    baseQuota = 0;
    proratedQuota = 0;
    carryForwardQuota = 0;
    carryForwardExpired = false;
    eligibilityNote = 'Magang / Praktik Kerja tidak memiliki kuota cuti tahunan berbayar.';
  }

  // Hitung total sisa saldo cuti
  const validCarryForward = carryForwardExpired ? 0 : carryForwardQuota;
  const grossQuota = baseQuota + validCarryForward + totalAdjustmentDays;
  const deductions = collectiveLeaveDeduction + leaveTakenDays;
  const remainingBalance = Math.max(0, grossQuota - deductions);

  return {
    userId,
    fullName: employee.full_name || employee.fullName || 'Karyawan',
    employeeCode: employee.employee_code || employee.employeeCode || '-',
    department: employee.department || '-',
    contractType,
    joinDate: joinDateStr,
    tenureYears,
    tenureMonths,
    isEligible,
    eligibilityNote,
    year,
    baseQuota,
    proratedQuota,
    carryForwardQuota,
    carryForwardExpired,
    collectiveLeaveDeduction,
    leaveTakenDays,
    totalAdjustmentDays,
    remainingBalance,
    adjustments: userAdjustments
  };
}
