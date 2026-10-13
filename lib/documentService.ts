/**
 * HCM Document Management Service
 * Mengorkestrasi upload dokumen ke Google Drive Restricted dan pencatatan metadata di Supabase hcm_documents.
 */

import { supabase } from './supabaseClient';
import { uploadFileToGoogleDrive, GoogleDriveUploadResult } from './googleDriveUpload';
import { trackActivity } from './auditLogger';
import { HCMDocument, DocumentCategory, DocumentVisibility, DocumentStatus, UserAccount } from '../types';

export interface DocumentUploadParams {
  file: File;
  category: DocumentCategory;
  employeeId?: number | string | null;
  employeeCode?: string;
  employeeName?: string;
  targetEmail?: string;
  visibility?: DocumentVisibility;
  status?: DocumentStatus;
  notes?: string;
  currentUser?: UserAccount | null;
}

export interface DocumentUploadResponse {
  success: boolean;
  document?: HCMDocument;
  fileUrl: string;
  fileId?: string;
  error?: string;
}

/**
 * Validasi otorisasi upload berdasarkan role dan kategori
 */
export function validateUploadAuthorization(
  category: DocumentCategory,
  targetEmployeeId: number | string | null | undefined,
  currentUser: UserAccount | null | undefined
): { allowed: boolean; reason?: string } {
  if (!currentUser) {
    return { allowed: false, reason: 'Sesi login tidak valid. Silakan login kembali.' };
  }

  const userStatus = (currentUser.status || currentUser.employmentStatus || 'Active').toLowerCase();
  if (userStatus !== 'active' && userStatus !== 'on leave') {
    return { allowed: false, reason: 'Akun Anda tidak aktif. Akses dokumen ditolak.' };
  }

  const role = (currentUser.role || '').toLowerCase();
  const groups = currentUser.groups || [];
  const isHR = ['super admin', 'admin', 'hr manager', 'hr staff', 'super_admin'].includes(role) ||
               groups.some(g => ['hr', 'hrd', 'admin'].includes(g.toLowerCase()));

  // Kategori internal HR & kebijakan perusahaan hanya boleh diunggah oleh HR
  if (['sk_perusahaan', 'internal_hr'].includes(category)) {
    if (!isHR) {
      return { allowed: false, reason: 'Hanya tim HR dan Administrator yang berwenang mengunggah dokumen SK Perusahaan atau Internal HR.' };
    }
  }

  // Kategori News hanya boleh diunggah oleh role berwenang
  if (['news_attachment', 'news_image'].includes(category)) {
    if (!isHR) {
      return { allowed: false, reason: 'Hanya pengelola yang berwenang yang dapat mengunggah dokumen pengumuman (News).' };
    }
  }

  // Kategori dokumen pribadi (KTP, Ijazah, SK Karyawan, BPJS)
  if (['ktp', 'ijazah', 'sk_karyawan', 'bpjs', 'foto_profil'].includes(category)) {
    if (!isHR && String(currentUser.id) !== String(targetEmployeeId)) {
      return { allowed: false, reason: 'Anda hanya diperbolehkan mengunggah dokumen pribadi milik Anda sendiri.' };
    }
  }

  return { allowed: true };
}

/**
 * Upload dokumen ke Google Drive & simpan metadata ke Supabase hcm_documents
 */
export async function uploadAndRecordDocument(
  params: DocumentUploadParams
): Promise<DocumentUploadResponse> {
  const {
    file,
    category,
    employeeId,
    employeeCode,
    employeeName,
    targetEmail,
    visibility = 'private',
    status = 'published',
    notes,
    currentUser
  } = params;

  // 1. Validasi Otorisasi
  const authCheck = validateUploadAuthorization(category, employeeId, currentUser);
  if (!authCheck.allowed) {
    return { success: false, fileUrl: '', error: authCheck.reason };
  }

  // 2. Validasi Tipe & Nama File
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!allowedExtensions.includes(ext)) {
    return {
      success: false,
      fileUrl: '',
      error: `Format file .${ext} tidak didukung. Format yang diizinkan: PDF, JPG, PNG, DOC, DOCX.`,
    };
  }

  // 3. Eksekusi upload ke Google Drive dalam kondisi Restricted
  const uploadResult: GoogleDriveUploadResult = await uploadFileToGoogleDrive(file, {
    category,
    visibility,
    targetEmail,
    employeeId: employeeId || undefined,
    employeeCode,
    employeeName,
    notes
  });

  if (!uploadResult.success || !uploadResult.fileUrl) {
    return {
      success: false,
      fileUrl: '',
      error: uploadResult.error || 'Gagal mengunggah file ke Google Drive.',
    };
  }

  // 4. Catat Metadata ke Supabase hcm_documents
  let savedDoc: HCMDocument | undefined;
  try {
    const documentPayload = {
      employee_id: employeeId || null,
      uploader_id: currentUser?.id || null,
      gdrive_file_id: uploadResult.fileId || `ext-${Date.now()}`,
      gdrive_web_view_link: uploadResult.fileUrl,
      gdrive_download_link: uploadResult.downloadUrl || null,
      folder_id: uploadResult.folderId || null,
      file_name: uploadResult.fileName || file.name,
      mime_type: file.type || 'application/octet-stream',
      file_size: file.size,
      category,
      visibility,
      status,
      target_email: targetEmail || null,
      permissions_metadata: targetEmail ? [{ email: targetEmail, role: 'reader' }] : [],
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('hcm_documents')
      .insert([documentPayload])
      .select('*')
      .maybeSingle();

    if (error) {
      // Jika tabel hcm_documents belum ada (misal migrasi database belum di-run),
      // tetap lanjutkan dengan fallback aman agar form tidak macet
      console.warn('Metadata hcm_documents insert warning:', error);
    } else if (data) {
      savedDoc = {
        id: data.id,
        employeeId: data.employee_id,
        uploaderId: data.uploader_id,
        gdriveFileId: data.gdrive_file_id,
        gdriveWebViewLink: data.gdrive_web_view_link,
        gdriveDownloadLink: data.gdrive_download_link,
        folderId: data.folder_id,
        fileName: data.file_name,
        mimeType: data.mime_type,
        fileSize: data.file_size,
        category: data.category,
        visibility: data.visibility,
        status: data.status,
        targetEmail: data.target_email,
        permissionsMetadata: data.permissions_metadata,
        notes: data.notes,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    // 5. Catat ke Audit Log
    await trackActivity(
      currentUser?.fullName || 'User',
      currentUser?.role || 'Staff',
      'Upload Dokumen',
      'HCM Document Manager',
      `Upload ${file.name} (${category}, visibilitas: ${visibility}) ke Google Drive Restricted`
    );

  } catch (err: any) {
    console.warn('Metadata recording exception (continuing with fileUrl):', err);
  }

  return {
    success: true,
    fileUrl: uploadResult.fileUrl,
    fileId: uploadResult.fileId,
    document: savedDoc
  };
}

/**
 * Mengambil daftar metadata dokumen karyawan dari Supabase (mematuhi RLS)
 */
export async function fetchEmployeeDocuments(
  employeeId: number | string
): Promise<HCMDocument[]> {
  try {
    const { data, error } = await supabase
      .from('hcm_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching employee documents:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.employee_id,
      uploaderId: row.uploader_id,
      gdriveFileId: row.gdrive_file_id,
      gdriveWebViewLink: row.gdrive_web_view_link,
      gdriveDownloadLink: row.gdrive_download_link,
      folderId: row.folder_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSize: row.file_size,
      category: row.category,
      visibility: row.visibility,
      status: row.status,
      targetEmail: row.target_email,
      permissionsMetadata: row.permissions_metadata,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (err) {
    console.warn('fetchEmployeeDocuments error:', err);
    return [];
  }
}
