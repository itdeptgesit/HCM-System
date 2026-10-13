/**
 * HR Policy Service
 * Mengimplementasikan Kebijakan Resmi SDM:
 * 1. SK Bantuan Kacamata & Lensa (Plafon Golongan & Frekuensi Klaim)
 * 2. Ketentuan Cuti Tahunan (PKWTT vs PKWT, Prorata, Refill, Carry Forward, Expired 30 Juni)
 */

export interface GlassesPolicyTier {
  golongan: string;
  titles: string[];
  maxFrame: number | 'actual';
  maxLens: number | 'actual';
  frameFrequencyYears: number; // 3 tahun
  lensFrequencyYears: number;  // 1 tahun
  minTenureYears: number;      // 1 tahun
}

export const GLASSES_POLICY_TIERS: GlassesPolicyTier[] = [
  {
    golongan: 'Staff / Operator',
    titles: ['staff', 'operator', 'administrasi', 'teknisi', 'driver', 'kurir', 'office boy', 'security', 'helper'],
    maxFrame: 500000,
    maxLens: 250000,
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  },
  {
    golongan: 'Supervisor / Assistant Manager',
    titles: ['supervisor', 'spv', 'assistant manager', 'asst manager', 'asst. manager', 'lead', 'team lead'],
    maxFrame: 1000000,
    maxLens: 500000,
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  },
  {
    golongan: 'Manager',
    titles: ['manager', 'mgr', 'head of', 'kepala bagian'],
    maxFrame: 1500000,
    maxLens: 750000,
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  },
  {
    golongan: 'Deputy VP / GM',
    titles: ['deputy vp', 'deputy vice president', 'gm', 'general manager', 'deputy general manager', 'vice general manager'],
    maxFrame: 2000000,
    maxLens: 1000000,
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  },
  {
    golongan: 'VP (Vice President)',
    titles: ['vp', 'vice president', 'senior vice president', 'svp', 'executive vice president', 'evp'],
    maxFrame: 2500000,
    maxLens: 1250000,
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  },
  {
    golongan: 'BOD / BOC',
    titles: ['direktur', 'director', 'bod', 'boc', 'komisaris', 'commissioner', 'president director', 'presiden direktur', 'managing director'],
    maxFrame: 'actual',
    maxLens: 'actual',
    frameFrequencyYears: 3,
    lensFrequencyYears: 1,
    minTenureYears: 1
  }
];

/**
 * Mencari tier golongan bantuan kacamata berdasarkan job title atau role
 */
export function getGlassesPolicyTier(jobTitle?: string | null, role?: string | null): GlassesPolicyTier {
  const normTitle = (jobTitle || '').toLowerCase().trim();
  const normRole = (role || '').toLowerCase().trim();

  // 1. Cek BOD / BOC
  if (
    normTitle.includes('direktur') || normTitle.includes('director') ||
    normTitle.includes('komisaris') || normTitle.includes('commissioner') ||
    normRole.includes('bod') || normRole.includes('boc')
  ) {
    return GLASSES_POLICY_TIERS[5];
  }

  // 2. Cek VP
  if (
    (normTitle.includes('vp') || normTitle.includes('vice president')) &&
    !normTitle.includes('deputy') && !normTitle.includes('assistant')
  ) {
    return GLASSES_POLICY_TIERS[4];
  }

  // 3. Cek Deputy VP / GM
  if (
    normTitle.includes('deputy') || normTitle.includes('gm') ||
    normTitle.includes('general manager')
  ) {
    return GLASSES_POLICY_TIERS[3];
  }

  // 4. Cek Manager
  if (
    normTitle.includes('manager') && !normTitle.includes('assistant') && !normTitle.includes('asst')
  ) {
    return GLASSES_POLICY_TIERS[2];
  }

  // 5. Cek Supervisor / Assistant Manager
  if (
    normTitle.includes('supervisor') || normTitle.includes('spv') ||
    normTitle.includes('assistant manager') || normTitle.includes('asst manager') || normTitle.includes('asst.') ||
    normTitle.includes('lead')
  ) {
    return GLASSES_POLICY_TIERS[1];
  }

  // Default: Staff / Operator
  return GLASSES_POLICY_TIERS[0];
}

/**
 * Validasi Kelayakan Klaim Kacamata / Lensa berdasarkan Masa Kerja dan Riwayat Klaim
 */
export interface GlassesClaimValidation {
  isEligible: boolean;
  tier: GlassesPolicyTier;
  tenureYears: number;
  tenureMonths: number;
  maxFrameAmount: number | 'actual';
  maxLensAmount: number | 'actual';
  reasons: string[];
  warnings: string[];
}

export function validateGlassesClaim(
  employee: {
    job_title?: string;
    jobTitle?: string;
    role?: string;
    join_date?: string;
    joinDate?: string;
  },
  claimType: 'frame' | 'lens' | 'both' = 'both',
  lastClaimsHistory: {
    lastFrameClaimDate?: string | null;
    lastLensClaimDate?: string | null;
  } = {}
): GlassesClaimValidation {
  const jobTitle = employee.job_title || employee.jobTitle || '';
  const role = employee.role || '';
  const tier = getGlassesPolicyTier(jobTitle, role);

  const joinDateStr = employee.join_date || employee.joinDate;
  const reasons: string[] = [];
  const warnings: string[] = [];

  let tenureYears = 0;
  let tenureMonths = 0;

  if (joinDateStr) {
    const joinDate = new Date(joinDateStr);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
    tenureYears = Number((diffDays / 365.25).toFixed(1));
    tenureMonths = Math.floor(diffDays / 30.44);
  }

  // Syarat Utama 1: Masa kerja minimal 1 tahun
  if (tenureYears < 1) {
    reasons.push(`Kacamata baru bisa diklaim jika karyawan telah bekerja minimal 1 tahun (Masa kerja saat ini: ${tenureMonths} bulan).`);
  }

  const today = new Date();

  // Syarat 2: Frame 3 tahun sekali
  if (claimType === 'frame' || claimType === 'both') {
    if (lastClaimsHistory.lastFrameClaimDate) {
      const lastDate = new Date(lastClaimsHistory.lastFrameClaimDate);
      const diffYears = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 3) {
        const remainingMonths = Math.ceil((3 - diffYears) * 12);
        reasons.push(`Frame kacamata hanya dapat dicover 3 tahun sekali. Klaim terakhir: ${lastClaimsHistory.lastFrameClaimDate} (Kurang ${remainingMonths} bulan lagi).`);
      }
    }
  }

  // Syarat 3: Lensa 1 tahun sekali
  if (claimType === 'lens' || claimType === 'both') {
    if (lastClaimsHistory.lastLensClaimDate) {
      const lastDate = new Date(lastClaimsHistory.lastLensClaimDate);
      const diffYears = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 1) {
        const remainingMonths = Math.ceil((1 - diffYears) * 12);
        reasons.push(`Lensa kacamata hanya dapat dicover 1 tahun sekali. Klaim terakhir: ${lastClaimsHistory.lastLensClaimDate} (Kurang ${remainingMonths} bulan lagi).`);
      }
    }
  }

  if (tier.maxFrame !== 'actual') {
    warnings.push(`Plafon Frame golongan ${tier.golongan}: Maksimum Rp ${tier.maxFrame.toLocaleString('id-ID')} (Cover 3 tahun sekali).`);
    warnings.push(`Plafon Lensa golongan ${tier.golongan}: Maksimum Rp ${(tier.maxLens as number).toLocaleString('id-ID')} (50% dari kacamata, cover 1 tahun sekali).`);
  } else {
    warnings.push(`Plafon ${tier.golongan}: Berdasarkan bukti kuitansi aktual (based on actual receipt).`);
  }

  return {
    isEligible: reasons.length === 0,
    tier,
    tenureYears,
    tenureMonths,
    maxFrameAmount: tier.maxFrame,
    maxLensAmount: tier.maxLens,
    reasons,
    warnings
  };
}

// ============================================================================
// KEBIJAKAN CUTI TAHUNAN (PKWTT vs PKWT)
// ============================================================================

export interface AnnualLeaveCalculation {
  contractType: 'PKWTT' | 'PKWT';
  isEligible: boolean;
  baseQuota: number;          // Kuota hak cuti tahunan
  proratedQuota: number;      // Kuota prorata tahun berjalan
  carryForwardQuota: number;  // Sisa cuti tahun lalu yang di-carry forward
  carryForwardExpired: boolean; // Apakah sudah lewat 30 Juni
  collectiveLeaveDeductions: number; // Potongan cuti bersama
  remainingBalance: number;   // Saldo cuti aktif saat ini
  formulaNotes: string[];
}

/**
 * Menghitung Hak Cuti Karyawan sesuai Ketentuan Tabel Resmi
 */
export function calculateEmployeeAnnualLeave(
  employee: {
    contract_type?: string;
    contractType?: string;
    join_date?: string;
    joinDate?: string;
    contract_duration_months?: number; // Lama kontrak untuk PKWT
    is_retained_from_pkwt?: boolean;   // Pengangkatan PKWT ke PKWTT melanjutkan masa kerja
  },
  currentYear = new Date().getFullYear(),
  collectiveLeaveDaysCount = 8,
  leaveTakenDays = 0,
  carryForwardPreviousYear = 0
): AnnualLeaveCalculation {
  const contractType = (employee.contract_type || employee.contractType || 'PKWTT').toUpperCase().includes('PKWTT') ? 'PKWTT' : 'PKWT';
  const joinDateStr = employee.join_date || employee.joinDate;
  const joinDate = joinDateStr ? new Date(joinDateStr) : new Date();
  const joinYear = joinDate.getFullYear();
  const joinMonth = joinDate.getMonth() + 1; // 1 - 12

  const today = new Date();
  const diffDays = Math.floor((today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
  const tenureYears = diffDays / 365.25;

  const formulaNotes: string[] = [];

  // Tanggal 30 Juni tahun berjalan
  const june30 = new Date(currentYear, 5, 30, 23, 59, 59);
  const isAfterJune30 = today > june30;

  if (contractType === 'PKWTT') {
    // -------------------------------------------------------------
    // KETENTUAN PKWTT:
    // 1. Hak Cuti 12 hari/tahun setelah melewati 1 tahun masa kerja
    // 2. Perolehan Cuti: Prorata setelah 1 tahun bekerja dengan formula (12 - bulan join)
    // 3. Refill: 12 hari setiap 1 Januari
    // 4. Carry Forward: Max sampai 30 Juni, setelah 30 Juni EXPIRED otomatis
    // 5. Cuti Bersama: Memotong Cuti Tahunan
    // -------------------------------------------------------------
    let isEligible = false;
    let baseQuota = 0;
    let proratedQuota = 0;

    if (tenureYears < 1) {
      isEligible = false;
      baseQuota = 0;
      proratedQuota = 0;
      formulaNotes.push('PKWTT baru berhak cuti setelah melewati 1 tahun masa kerja.');
    } else {
      isEligible = true;
      // Jika baru mencapai 1 tahun di tahun ini: Prorata (12 - bulan join)
      const isFirstYearAfterOneYear = (joinYear + 1) === currentYear;
      if (isFirstYearAfterOneYear) {
        proratedQuota = Math.max(0, 12 - joinMonth);
        baseQuota = proratedQuota;
        formulaNotes.push(`Tahun pertama setelah 1 thn masa kerja: Prorata (12 - ${joinMonth} bln join) = ${proratedQuota} hari.`);
      } else {
        baseQuota = 12;
        proratedQuota = 12;
        formulaNotes.push('Hak Cuti Tahunan PKWTT reguler: 12 hari/tahun (di-refill setiap 1 Januari).');
      }
    }

    // Carry Forward handling
    let validCarryForward = carryForwardPreviousYear;
    let carryForwardExpired = false;

    if (validCarryForward > 0) {
      if (isAfterJune30) {
        validCarryForward = 0;
        carryForwardExpired = true;
        formulaNotes.push(`Sisa cuti carry forward tahun lalu expired otomatis per 30 Juni.`);
      } else {
        formulaNotes.push(`Carry forward cuti tahun lalu: ${validCarryForward} hari (berlaku s.d. 30 Juni).`);
      }
    }

    formulaNotes.push(`Cuti Bersama tahun ini memotong ${collectiveLeaveDaysCount} hari dari kuota tahunan.`);

    const totalAvailable = baseQuota + validCarryForward;
    const remainingBalance = Math.max(0, totalAvailable - collectiveLeaveDaysCount - leaveTakenDays);

    return {
      contractType: 'PKWTT',
      isEligible,
      baseQuota,
      proratedQuota,
      carryForwardQuota: validCarryForward,
      carryForwardExpired,
      collectiveLeaveDeductions: collectiveLeaveDaysCount,
      remainingBalance,
      formulaNotes
    };
  } else {
    // -------------------------------------------------------------
    // KETENTUAN PKWT:
    // 1. Perolehan Cuti: Full dari awal masuk (langsung aktif)
    // 2. Hak Cuti Tahunan: Prorata menyesuaikan lama kontrak (misal 6 bln = 6 hari, 1 hari/bulan)
    // 3. Refill: Sesuai periode kontrak
    // 4. Carry Forward: TIDAK ADA (sisa cuti kontrak sebelumnya tidak dibawa ke kontrak baru)
    // 5. Cuti Bersama: Memotong Cuti Tahunan
    // 6. Perpanjangan / Perubahan Status:
    //    - Jika diangkat PKWTT & lanjut masa kerja: sisa cuti dapat dipakai & lanjut ketentuan PKWTT.
    //    - Jika TIDAK lanjut masa kerja: saldo cuti dihapus & masa kerja reset ke 0.
    // -------------------------------------------------------------
    const contractMonths = employee.contract_duration_months || 12;
    // 1 hari per bulan kontrak
    const pkwtQuota = Math.min(12, contractMonths);

    formulaNotes.push(`PKWT aktif dari awal masuk: Prorata ${contractMonths} bulan kontrak = ${pkwtQuota} hari hak cuti.`);
    formulaNotes.push(`Tidak ada carry forward cuti antar kontrak untuk PKWT.`);
    formulaNotes.push(`Cuti Bersama tahun ini memotong ${collectiveLeaveDaysCount} hari dari kuota.`);

    const remainingBalance = Math.max(0, pkwtQuota - collectiveLeaveDaysCount - leaveTakenDays);

    return {
      contractType: 'PKWT',
      isEligible: true,
      baseQuota: pkwtQuota,
      proratedQuota: pkwtQuota,
      carryForwardQuota: 0,
      carryForwardExpired: false,
      collectiveLeaveDeductions: collectiveLeaveDaysCount,
      remainingBalance,
      formulaNotes
    };
  }
}
