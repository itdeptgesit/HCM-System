/**
 * Employee Data Change Request Service
 * Handles approval workflow for changes made to employee data by regular employees or HR Staff.
 * Approvals must be reviewed and decided by the HR Manager or Admin.
 */

import { supabase } from './supabaseClient';
import { trackActivity } from './auditLogger';

export interface EmployeeDataChangeRequest {
  id: string;
  employeeId: number | string;
  employeeName: string;
  employeeCode?: string;
  department?: string;
  company?: string;
  requestedById: string | number;
  requestedByName: string;
  requestedByRole?: string;
  source: 'self_service' | 'hr_data_manager';
  status: 'Pending' | 'Approved' | 'Rejected';
  originalData: Record<string, any>;
  proposedChanges: Record<string, any>;
  changedFields: string[];
  reviewNotes?: string;
  reviewedById?: string | number;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'gesit_employee_data_change_requests';

// Readable label dictionary for employee fields
export const EMPLOYEE_FIELD_LABELS: Record<string, string> = {
  full_name: 'Nama Lengkap',
  nickname: 'Nama Panggilan',
  phone: 'Nomor Telepon',
  email: 'Email',
  address: 'Alamat KTP',
  residential_address: 'Alamat Domisili',
  birth_place: 'Tempat Lahir',
  date_of_birth: 'Tanggal Lahir',
  gender: 'Jenis Kelamin',
  marital_status: 'Status Pernikahan',
  religion: 'Agama',
  blood_type: 'Golongan Darah',
  nik: 'Nomor KTP (NIK)',
  npwp: 'NPWP',
  bank_name: 'Nama Bank',
  bank_account_name: 'Nama Pemilik Rekening',
  bank_account_number: 'Nomor Rekening Bank',
  bpjs_tk_number: 'No BPJS Ketenagakerjaan',
  bpjs_health_number: 'No BPJS Kesehatan',
  company: 'Perusahaan / Entitas',
  branch: 'Lokasi Kerja / Branch',
  department: 'Departemen',
  job_title: 'Jabatan / Posisi',
  job_level: 'Job Level',
  grade_class: 'Golongan / Grade Class',
  employee_code: 'Nomor Induk Karyawan (NIK Perusahaan)',
  join_date: 'Tanggal Masuk',
  employment_type: 'Status Kepegawaian',
  contract_type: 'Tipe Kontrak',
  contract_start_date: 'Mulai Kontrak',
  contract_end_date: 'Selesai Kontrak',
  pkwt_number: 'Nomor PKWT / SK',
  avatar_url: 'Foto Profil',
  ktp_file_url: 'File Dokumen KTP',
  ijazah_file_url: 'File Dokumen Ijazah',
  sk_file_url: 'File Dokumen SK',
  bpjs_file_url: 'File Dokumen BPJS',
  last_education: 'Pendidikan Terakhir',
  institution_name: 'Institusi / Universitas',
  major: 'Jurusan',
  graduation_year: 'Tahun Kelulusan',
  education_start_year: 'Tahun Mulai Pendidikan',
  gpa: 'IPK / Nilai',
  diploma_number: 'Nomor Ijazah',
  work_schedule_type: 'Tipe Shift / Jadwal',
  custom_work_start: 'Jam Masuk Khusus',
  custom_work_end: 'Jam Pulang Khusus',
  custom_grace_period_minutes: 'Toleransi Terlambat (Menit)'
};

/**
 * Cek apakah seorang user adalah Approver (HR Manager / Admin / Super Admin)
 * yang berhak menyetujui atau langsung mengedit data tanpa approval.
 */
export const isHRManagerOrAdmin = (user: any): boolean => {
  if (!user) return false;
  const roleLower = String(user.role || '').toLowerCase().trim();
  const jobTitleLower = String(user.jobTitle || user.job_title || '').toLowerCase().trim();
  const emailLower = String(user.email || '').toLowerCase().trim();

  // Super Admin & Admin
  if (roleLower === 'super admin' || roleLower === 'super_admin' || roleLower === 'admin') return true;

  // HR Manager role or specific title (e.g. Mesrama Gultom / Office Manager)
  if (roleLower === 'hr manager' || roleLower === 'manager hr') return true;
  if (jobTitleLower.includes('hr manager') || jobTitleLower.includes('vp of hr') || emailLower === 'rara@gesit.co.id') return true;

  return false;
};

/**
 * Cek apakah perubahan yang dilakukan oleh user memerlukan approval HR Manager.
 * - Admin, Super Admin, dan HR Manager TIDAK memerlukan approval (langsung tersimpan).
 * - HR Staff dan Karyawan Mandiri WAJIB melalui approval HR Manager.
 */
export const checkRequiresApproval = (user: any): boolean => {
  return !isHRManagerOrAdmin(user);
};

// Helper: ambil dari localStorage
const getLocalRequests = (): EmployeeDataChangeRequest[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Helper: simpan ke localStorage
const saveLocalRequests = (data: EmployeeDataChangeRequest[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Gagal menyimpan ke localStorage:', err);
  }
};

/**
 * Mengambil semua daftar pengajuan perubahan data karyawan
 */
export const fetchEmployeeChangeRequests = async (filters?: {
  employeeId?: string | number;
  status?: 'Pending' | 'Approved' | 'Rejected';
}): Promise<EmployeeDataChangeRequest[]> => {
  try {
    let query = supabase
      .from('employee_data_change_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Supabase fetch change requests error, using localStorage fallback:', error.message);
      let local = getLocalRequests();
      if (filters?.employeeId) local = local.filter(r => String(r.employeeId) === String(filters.employeeId));
      if (filters?.status) local = local.filter(r => r.status === filters.status);
      return local;
    }

    const mapped: EmployeeDataChangeRequest[] = (data || []).map((row: any) => ({
      id: String(row.id),
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      employeeCode: row.employee_code,
      department: row.department,
      company: row.company,
      requestedById: row.requested_by_id,
      requestedByName: row.requested_by_name,
      requestedByRole: row.requested_by_role,
      source: row.source || 'profile',
      status: row.status || 'Pending',
      originalData: row.original_data || {},
      proposedChanges: row.proposed_changes || {},
      changedFields: row.changed_fields || [],
      reviewNotes: row.review_notes,
      reviewedById: row.reviewed_by_id,
      reviewedByName: row.reviewed_by_name,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Cache to local storage
    saveLocalRequests(mapped);
    return mapped;
  } catch (err) {
    console.warn('Exception fetch change requests, using local fallback:', err);
    let local = getLocalRequests();
    if (filters?.employeeId) local = local.filter(r => String(r.employeeId) === String(filters.employeeId));
    if (filters?.status) local = local.filter(r => r.status === filters.status);
    return local;
  }
};

/**
 * Mengajukan permohonan perubahan data karyawan
 */
export const createEmployeeChangeRequest = async (params: {
  employee: any;
  requestedBy: any;
  source: 'self_service' | 'hr_data_manager';
  originalData: Record<string, any>;
  proposedChanges: Record<string, any>;
}): Promise<{ success: boolean; data?: EmployeeDataChangeRequest; error?: string }> => {
  try {
    // Cari field mana saja yang benar-benar berbeda
    const changedFields: string[] = [];
    const sanitizedOriginal: Record<string, any> = {};
    const sanitizedProposed: Record<string, any> = {};

    Object.keys(params.proposedChanges).forEach(key => {
      const oldVal = params.originalData[key] ?? null;
      const newVal = params.proposedChanges[key] ?? null;

      // Bandingkan setelah trim string jika tipe string
      const strOld = typeof oldVal === 'string' ? oldVal.trim() : oldVal;
      const strNew = typeof newVal === 'string' ? newVal.trim() : newVal;

      if (strOld !== strNew && !(strOld === '' && strNew === null) && !(strOld === null && strNew === '')) {
        changedFields.push(key);
        sanitizedOriginal[key] = oldVal;
        sanitizedProposed[key] = newVal;
      }
    });

    if (changedFields.length === 0) {
      return { success: false, error: 'Tidak ada perubahan data yang terdeteksi.' };
    }

    const newRecord: EmployeeDataChangeRequest = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: params.employee.id,
      employeeName: params.employee.fullName || params.employee.full_name || 'Employee',
      employeeCode: params.employee.employeeCode || params.employee.employee_code || '',
      department: params.employee.department || '',
      company: params.employee.company || 'The Gesit Companies',
      requestedById: String(params.requestedBy?.id || 'unknown'),
      requestedByName: params.requestedBy?.fullName || params.requestedBy?.name || params.requestedBy?.username || 'Staff',
      requestedByRole: params.requestedBy?.role || 'Employee',
      source: params.source,
      status: 'Pending',
      originalData: sanitizedOriginal,
      proposedChanges: sanitizedProposed,
      changedFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Simpan ke Supabase
    try {
      const { data, error } = await supabase
        .from('employee_data_change_requests')
        .insert([{
          id: newRecord.id,
          employee_id: newRecord.employeeId,
          employee_name: newRecord.employeeName,
          employee_code: newRecord.employeeCode,
          department: newRecord.department,
          company: newRecord.company,
          requested_by_id: newRecord.requestedById,
          requested_by_name: newRecord.requestedByName,
          requested_by_role: newRecord.requestedByRole,
          source: newRecord.source,
          status: 'Pending',
          original_data: newRecord.originalData,
          proposed_changes: newRecord.proposedChanges,
          changed_fields: newRecord.changedFields
        }])
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert change request error, saving locally:', error.message);
      }
    } catch (dbErr) {
      console.warn('Supabase insert change request exception, fallback to local storage:', dbErr);
    }

    // Selalu simpan juga ke local storage
    const locals = getLocalRequests();
    saveLocalRequests([newRecord, ...locals.filter(r => r.id !== newRecord.id)]);

    // Catat log aktivitas & audit trail
    trackActivity({
      userId: params.requestedBy?.id,
      userName: params.requestedBy?.fullName || 'User',
      userRole: params.requestedBy?.role || 'Employee',
      userEmail: params.requestedBy?.email || '',
      action: 'Pengajuan Perubahan Data',
      module: 'Data Karyawan',
      details: `Mengajukan perubahan data untuk ${newRecord.employeeName} (${changedFields.length} field: ${changedFields.map(f => EMPLOYEE_FIELD_LABELS[f] || f).join(', ')})`,
      metadata: {
        requestId: newRecord.id,
        employeeId: newRecord.employeeId,
        source: newRecord.source,
        changedFields
      }
    }).catch(console.error);

    return { success: true, data: newRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membuat permohonan perubahan data' };
  }
};

/**
 * Menyetujui (Approve) pengajuan perubahan data karyawan oleh HR Manager.
 * Menerapkan perubahan langsung ke tabel user_accounts.
 */
export const approveEmployeeChangeRequest = async (
  request: EmployeeDataChangeRequest,
  approverUser: any,
  notes?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const approverName = approverUser?.fullName || approverUser?.name || approverUser?.username || 'HR Manager';
    const approverId = String(approverUser?.id || '');
    const nowIso = new Date().toISOString();

    // 1. Terapkan perubahan ke user_accounts
    const updatePayload = {
      ...request.proposedChanges,
      updated_at: nowIso
    };

    // Resilient update with column fallback
    const executeApply = async (payload: any, retries = 5): Promise<void> => {
      const { error: applyErr } = await supabase
        .from('user_accounts')
        .update(payload)
        .eq('id', request.employeeId);

      if (applyErr) {
        const match = applyErr.message?.match(/Could not find the '([^']+)' column of 'user_accounts'/i);
        if (match && match[1] && retries > 0) {
          const missingCol = match[1];
          const cleaned = { ...payload };
          delete cleaned[missingCol];
          return executeApply(cleaned, retries - 1);
        }
        throw applyErr;
      }
    };

    await executeApply(updatePayload);

    // 2. Update status pengajuan di tabel employee_data_change_requests
    try {
      await supabase
        .from('employee_data_change_requests')
        .update({
          status: 'Approved',
          review_notes: notes || 'Disetujui oleh HR Manager',
          reviewed_by_id: approverId,
          reviewed_by_name: approverName,
          reviewed_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', request.id);
    } catch (e) {
      console.warn('Update status change request error:', e);
    }

    // 3. Update status di local storage
    const locals = getLocalRequests();
    const updatedLocals = locals.map(r => r.id === request.id ? {
      ...r,
      status: 'Approved' as const,
      reviewNotes: notes || 'Disetujui oleh HR Manager',
      reviewedById: approverId,
      reviewedByName: approverName,
      reviewedAt: nowIso,
      updatedAt: nowIso
    } : r);
    saveLocalRequests(updatedLocals);

    // 4. Catat aktivitas audit trail
    trackActivity({
      userId: approverUser?.id,
      userName: approverName,
      userRole: approverUser?.role || 'HR Manager',
      userEmail: approverUser?.email || '',
      action: 'Approval Perubahan Data Karyawan',
      module: 'Data Karyawan',
      details: `Menyetujui permohonan perubahan data untuk ${request.employeeName} (${request.changedFields.length} field: ${request.changedFields.map(f => EMPLOYEE_FIELD_LABELS[f] || f).join(', ')}). Catatan: ${notes || '-'}`,
      metadata: {
        requestId: request.id,
        employeeId: request.employeeId,
        changedFields: request.changedFields
      }
    }).catch(console.error);

    return { success: true };
  } catch (err: any) {
    console.error('Approve change request error:', err);
    return { success: false, error: err.message || 'Gagal menyetujui perubahan data' };
  }
};

/**
 * Menolak (Reject) pengajuan perubahan data karyawan oleh HR Manager.
 * Data di user_accounts tidak diubah.
 */
export const rejectEmployeeChangeRequest = async (
  request: EmployeeDataChangeRequest,
  approverUser: any,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const approverName = approverUser?.fullName || approverUser?.name || approverUser?.username || 'HR Manager';
    const approverId = String(approverUser?.id || '');
    const nowIso = new Date().toISOString();

    // 1. Update status di Supabase
    try {
      await supabase
        .from('employee_data_change_requests')
        .update({
          status: 'Rejected',
          review_notes: rejectionReason || 'Ditolak oleh HR Manager',
          reviewed_by_id: approverId,
          reviewed_by_name: approverName,
          reviewed_at: nowIso,
          updated_at: nowIso
        })
        .eq('id', request.id);
    } catch (e) {
      console.warn('Update status reject error:', e);
    }

    // 2. Update status di local storage
    const locals = getLocalRequests();
    const updatedLocals = locals.map(r => r.id === request.id ? {
      ...r,
      status: 'Rejected' as const,
      reviewNotes: rejectionReason || 'Ditolak oleh HR Manager',
      reviewedById: approverId,
      reviewedByName: approverName,
      reviewedAt: nowIso,
      updatedAt: nowIso
    } : r);
    saveLocalRequests(updatedLocals);

    // 3. Catat aktivitas audit trail
    trackActivity({
      userId: approverUser?.id,
      userName: approverName,
      userRole: approverUser?.role || 'HR Manager',
      userEmail: approverUser?.email || '',
      action: 'Penolakan Perubahan Data Karyawan',
      module: 'Data Karyawan',
      details: `Menolak permohonan perubahan data untuk ${request.employeeName}. Alasan: ${rejectionReason}`,
      metadata: {
        requestId: request.id,
        employeeId: request.employeeId,
        rejectionReason
      }
    }).catch(console.error);

    return { success: true };
  } catch (err: any) {
    console.error('Reject change request error:', err);
    return { success: false, error: err.message || 'Gagal menolak perubahan data' };
  }
};
