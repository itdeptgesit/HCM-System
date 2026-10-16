/**
 * Warning Letter (Catatan SP) Service for GESIT HCM
 * Handles Supabase sync with automatic localStorage fallback if table is pending migration.
 */

import { supabase } from './supabaseClient';
import { WarningLetterRecord, WarningLetterLevel, WarningViolationCategory } from '../types';

const STORAGE_KEY = 'gesit_employee_warning_letters';

// Initial realistic seed records for The Gesit Companies
export const SEED_WARNING_LETTERS: WarningLetterRecord[] = [
  {
    id: 1,
    letterNumber: '003/SP-1/HR-GESIT/VIII/2026',
    employeeId: 30,
    employeeCode: '22050350',
    employeeName: 'Muhammad Susilo',
    company: 'PT Gesit Alumas',
    department: 'HR & Logistics',
    jobTitle: 'Staff Logistik & Operasional',
    spLevel: 'SP 1',
    violationCategory: 'Kedisiplinan & Presensi',
    incidentDate: '2026-08-10',
    issuedDate: '2026-08-12',
    validFrom: '2026-08-12',
    validUntil: '2027-02-12',
    chronology: 'Karyawan tidak hadir bekerja tanpa keterangan sah (mangkir / alpha) selama 3 (tiga) hari berturut-turut pada tanggal 05, 06, dan 07 Agustus 2026, serta tidak dapat dihubungi oleh atasan langsung dan HR.',
    consequences: '1. Pemotongan uang kehadiran sesuai hari mangkir.\n2. Pembinaan berkala setiap 2 minggu bersama atasan langsung.\n3. Apabila terjadi pelanggaran kembali dalam kurun waktu 6 bulan, status akan ditingkatkan ke SP 2.',
    issuerName: 'Kadek Hananda Cherry',
    issuerTitle: 'HR Staff & Personnel',
    witnessName: 'Bambang Santoso (Supervisor Logistik)',
    status: 'Aktif',
    notes: 'Karyawan telah menandatangani surat penerimaan sanksi pada 12 Agustus 2026.',
    createdAt: '2026-08-12T09:30:00Z',
    updatedAt: '2026-08-12T09:30:00Z'
  },
  {
    id: 2,
    letterNumber: '001/ST/HR-GESIT/IX/2026',
    employeeId: 35,
    employeeCode: '26060389',
    employeeName: 'Julhan Sabani',
    company: 'PT Gesit Alumas',
    department: 'HR & Logistics',
    jobTitle: 'Operator Gudang',
    spLevel: 'Surat Teguran',
    violationCategory: 'Pelanggaran SOP & Tata Tertib',
    incidentDate: '2026-09-02',
    issuedDate: '2026-09-03',
    validFrom: '2026-09-03',
    validUntil: '2026-12-03',
    chronology: 'Tidak menggunakan Alat Pelindung Diri (APD) safety helmet & safety boots saat berada di area bongkar muat material berat gudang, melanggar Standar K3 Perusahaan.',
    consequences: 'Diberikan teguran tertulis dan kewajiban mengulang induksi keselamatan kerja (K3) internal selama 1 sesi.',
    issuerName: 'Kadek Hananda Cherry',
    issuerTitle: 'HR Staff & Personnel',
    witnessName: 'Dedi Kurniawan (Koordinator K3)',
    status: 'Aktif',
    notes: 'Karyawan berjanji mematuhi SOP K3 dan telah menerima perlengkapan APD baru.',
    createdAt: '2026-09-03T11:15:00Z',
    updatedAt: '2026-09-03T11:15:00Z'
  },
  {
    id: 3,
    letterNumber: '005/SP-2/HR-GESIT/II/2026',
    employeeId: 104,
    employeeCode: '21040188',
    employeeName: 'Ahmad Fauzi',
    company: 'PT Gesit Perkasa',
    department: 'Operations',
    jobTitle: 'Field Technician',
    spLevel: 'SP 2',
    violationCategory: 'Kinerja & Target',
    incidentDate: '2026-02-14',
    issuedDate: '2026-02-16',
    validFrom: '2026-02-16',
    validUntil: '2026-08-16',
    chronology: 'Kelalaian dalam pemeliharaan berkala unit mesin pendingin central yang mengakibatkan operasional terhenti selama 6 jam kerja, setelah sebelumnya menerima SP 1 pada September 2025.',
    consequences: 'Penundaan evaluasi berkala dan pengawasan harian lembar kerja oleh Project Manager.',
    issuerName: 'Rian Hidayat',
    issuerTitle: 'HR & GA Manager',
    witnessName: 'Hendro Prasetyo (Operations Manager)',
    status: 'Selesai',
    notes: 'Masa berlaku telah selesai pada 16 Agustus 2026 tanpa adanya pelanggaran baru. Status diarsipkan sebagai Selesai.',
    createdAt: '2026-02-16T10:00:00Z',
    updatedAt: '2026-08-17T08:00:00Z'
  }
];

function getStoredLocalLetters(): WarningLetterRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse stored warning letters:', e);
  }
  // Initialize default seed
  saveStoredLocalLetters(SEED_WARNING_LETTERS);
  return SEED_WARNING_LETTERS;
}

function saveStoredLocalLetters(records: WarningLetterRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save warning letters to localStorage:', e);
  }
}

// Map db row (snake_case) to client record (camelCase)
function mapDbRowToRecord(row: any): WarningLetterRecord {
  return {
    id: row.id,
    letterNumber: row.letter_number,
    employeeId: row.employee_id,
    employeeCode: row.employee_code,
    employeeName: row.employee_name,
    company: row.company || '',
    department: row.department || '',
    jobTitle: row.job_title || '',
    spLevel: row.sp_level as WarningLetterLevel,
    violationCategory: row.violation_category as WarningViolationCategory,
    incidentDate: row.incident_date,
    issuedDate: row.issued_date,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    chronology: row.chronology || '',
    consequences: row.consequences || '',
    issuerName: row.issuer_name || 'HR Manager',
    issuerTitle: row.issuer_title || 'HR Manager',
    witnessName: row.witness_name || '',
    status: row.status,
    revocationReason: row.revocation_reason || '',
    revokedAt: row.revoked_at || undefined,
    revokedBy: row.revoked_by || undefined,
    attachmentUrl: row.attachment_url || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// Map client record to db row
function mapRecordToDbRow(rec: Partial<WarningLetterRecord>): any {
  const row: any = {};
  if (rec.letterNumber !== undefined) row.letter_number = rec.letterNumber;
  if (rec.employeeId !== undefined) row.employee_id = rec.employeeId;
  if (rec.employeeCode !== undefined) row.employee_code = rec.employeeCode;
  if (rec.employeeName !== undefined) row.employee_name = rec.employeeName;
  if (rec.company !== undefined) row.company = rec.company;
  if (rec.department !== undefined) row.department = rec.department;
  if (rec.jobTitle !== undefined) row.job_title = rec.jobTitle;
  if (rec.spLevel !== undefined) row.sp_level = rec.spLevel;
  if (rec.violationCategory !== undefined) row.violation_category = rec.violationCategory;
  if (rec.incidentDate !== undefined) row.incident_date = rec.incidentDate;
  if (rec.issuedDate !== undefined) row.issued_date = rec.issuedDate;
  if (rec.validFrom !== undefined) row.valid_from = rec.validFrom;
  if (rec.validUntil !== undefined) row.valid_until = rec.validUntil;
  if (rec.chronology !== undefined) row.chronology = rec.chronology;
  if (rec.consequences !== undefined) row.consequences = rec.consequences;
  if (rec.issuerName !== undefined) row.issuer_name = rec.issuerName;
  if (rec.issuerTitle !== undefined) row.issuer_title = rec.issuerTitle;
  if (rec.witnessName !== undefined) row.witness_name = rec.witnessName;
  if (rec.status !== undefined) row.status = rec.status;
  if (rec.revocationReason !== undefined) row.revocation_reason = rec.revocationReason;
  if (rec.revokedAt !== undefined) row.revoked_at = rec.revokedAt;
  if (rec.revokedBy !== undefined) row.revoked_by = rec.revokedBy;
  if (rec.attachmentUrl !== undefined) row.attachment_url = rec.attachmentUrl;
  if (rec.notes !== undefined) row.notes = rec.notes;
  return row;
}

/**
 * Fetch all warning letter records.
 * Queries Supabase first; if table not present, falls back gracefully to localStorage.
 */
export async function getWarningLetters(): Promise<{ data: WarningLetterRecord[]; isLocalOnly: boolean }> {
  try {
    const { data, error } = await supabase
      .from('employee_warning_letters')
      .select('*')
      .order('issued_date', { ascending: false });

    if (error) {
      console.warn('Supabase warning letters table query error, fallback to local storage:', error.message);
      return { data: getStoredLocalLetters(), isLocalOnly: true };
    }

    if (data && data.length >= 0) {
      const mapped = data.map(mapDbRowToRecord);
      // Auto update status if expired
      const today = new Date().toISOString().split('T')[0];
      const withStatusCheck = mapped.map(item => {
        if (item.status === 'Aktif' && item.validUntil < today) {
          return { ...item, status: 'Selesai' as const };
        }
        return item;
      });
      saveStoredLocalLetters(withStatusCheck);
      return { data: withStatusCheck, isLocalOnly: false };
    }
  } catch (err) {
    console.warn('Supabase fetch exception:', err);
  }

  return { data: getStoredLocalLetters(), isLocalOnly: true };
}

/**
 * Create a new warning letter record
 */
export async function createWarningLetter(
  payload: Omit<WarningLetterRecord, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ data: WarningLetterRecord; isLocalOnly: boolean; error?: string }> {
  const now = new Date().toISOString();
  
  // Try Supabase insert
  try {
    const dbRow = mapRecordToDbRow(payload);
    const { data, error } = await supabase
      .from('employee_warning_letters')
      .insert([dbRow])
      .select()
      .single();

    if (!error && data) {
      const record = mapDbRowToRecord(data);
      const current = getStoredLocalLetters();
      saveStoredLocalLetters([record, ...current]);
      return { data: record, isLocalOnly: false };
    }
    if (error) {
      console.warn('Supabase insert failed, saving locally:', error.message);
    }
  } catch (e) {
    console.warn('Supabase insert exception, fallback to local:', e);
  }

  // Local fallback
  const localRecord: WarningLetterRecord = {
    ...payload,
    id: Date.now(),
    createdAt: now,
    updatedAt: now
  };
  const current = getStoredLocalLetters();
  saveStoredLocalLetters([localRecord, ...current]);
  return { data: localRecord, isLocalOnly: true };
}

/**
 * Update an existing warning letter
 */
export async function updateWarningLetter(
  id: string | number,
  updates: Partial<WarningLetterRecord>
): Promise<{ data?: WarningLetterRecord; isLocalOnly: boolean; error?: string }> {
  const now = new Date().toISOString();

  // Try Supabase update
  try {
    const dbRow = mapRecordToDbRow(updates);
    const { data, error } = await supabase
      .from('employee_warning_letters')
      .update(dbRow)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!error && data) {
      const record = mapDbRowToRecord(data);
      const current = getStoredLocalLetters();
      const updated = current.map(item => String(item.id) === String(id) ? record : item);
      saveStoredLocalLetters(updated);
      return { data: record, isLocalOnly: false };
    }
  } catch (e) {
    console.warn('Supabase update exception:', e);
  }

  // Local fallback
  const current = getStoredLocalLetters();
  const existing = current.find(item => String(item.id) === String(id));
  if (!existing) return { error: 'Record tidak ditemukan', isLocalOnly: true };

  const updatedRecord: WarningLetterRecord = {
    ...existing,
    ...updates,
    updatedAt: now
  };
  const updatedList = current.map(item => String(item.id) === String(id) ? updatedRecord : item);
  saveStoredLocalLetters(updatedList);
  return { data: updatedRecord, isLocalOnly: true };
}

/**
 * Revoke/Cancel an active warning letter (e.g. after successful appeal)
 */
export async function revokeWarningLetter(
  id: string | number,
  reason: string,
  revokedBy: string
): Promise<{ data?: WarningLetterRecord; isLocalOnly: boolean; error?: string }> {
  return updateWarningLetter(id, {
    status: 'Dibatalkan',
    revocationReason: reason,
    revokedAt: new Date().toISOString(),
    revokedBy
  });
}

/**
 * Delete a warning letter record
 */
export async function deleteWarningLetter(id: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('employee_warning_letters')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('Supabase delete error:', error.message);
    }
  } catch (e) {
    console.warn('Supabase delete exception:', e);
  }

  // Always sync local
  const current = getStoredLocalLetters();
  saveStoredLocalLetters(current.filter(item => String(item.id) !== String(id)));
  return { success: true };
}

/**
 * Helper to generate next recommended Letter Number (Nomor Surat)
 * e.g. 004/SP-1/HR-GESIT/X/2026
 */
export function generateLetterNumber(
  spLevel: WarningLetterLevel,
  existingRecords: WarningLetterRecord[]
): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const now = new Date();
  const monthRoman = romanMonths[now.getMonth()];
  const year = now.getFullYear();

  let codePrefix = 'ST';
  if (spLevel === 'SP 1') codePrefix = 'SP-1';
  else if (spLevel === 'SP 2') codePrefix = 'SP-2';
  else if (spLevel === 'SP 3') codePrefix = 'SP-3';

  // Count existing this year
  const seq = (existingRecords.length + 1).toString().padStart(3, '0');
  return `${seq}/${codePrefix}/HR-GESIT/${monthRoman}/${year}`;
}
