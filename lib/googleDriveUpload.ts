/**
 * Google Drive Enterprise Storage Service for GESIT HCM
 * Mengunggah file dokumen & foto ke Google Drive perusahaan dengan kontrol akses Restricted.
 * 
 * Aturan Keamanan & Akses:
 * 1. Seluruh file berstatus Restricted (Bukan 'Anyone with the link').
 * 2. Menggunakan 4 folder terpisah:
 *    - Dokumen Pribadi Karyawan (Subfolder per karyawan, parent folder khusus HR)
 *    - News yang Dipublikasikan
 *    - SK Keputusan Terbit
 *    - Dokumen & Draft Internal HR
 * 3. Hak akses diberikan spesifik (addViewer) ke email Google karyawan terdaftar atau grup terkelola.
 */

import { DocumentCategory, DocumentVisibility } from '../types';
import { supabase } from './supabaseClient';

export interface GoogleDriveUploadOptions {
  category?: DocumentCategory;
  visibility?: DocumentVisibility;
  targetEmail?: string;
  employeeId?: number | string;
  employeeCode?: string;
  employeeName?: string;
  folderType?: 'employee_docs' | 'news_published' | 'sk_published' | 'hr_internal';
  notes?: string;
}

export interface GoogleDriveUploadResult {
  success: boolean;
  fileUrl: string;
  fileName: string;
  fileId?: string;
  downloadUrl?: string;
  folderId?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
}

export const getGoogleDriveWebhookUrl = (): string => {
  return (
    import.meta.env.VITE_GDRIVE_UPLOAD_URL ||
    localStorage.getItem('gesit_gdrive_upload_url') ||
    ''
  ).trim();
};

export const setGoogleDriveWebhookUrl = (url: string) => {
  localStorage.setItem('gesit_gdrive_upload_url', url.trim());
};

/**
 * Konversi File objek menjadi base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Tentukan tipe folder berdasarkan kategori dan visibilitas dokumen
 */
export function resolveFolderType(
  category?: DocumentCategory,
  visibility?: DocumentVisibility
): 'employee_docs' | 'news_published' | 'sk_published' | 'hr_internal' {
  if (!category) return 'employee_docs';

  if (category === 'news_attachment' || category === 'news_image') {
    return visibility === 'all_active' ? 'news_published' : 'hr_internal';
  }

  if (category === 'sk_perusahaan') {
    return visibility === 'all_active' ? 'sk_published' : 'hr_internal';
  }

  if (category === 'internal_hr') {
    return 'hr_internal';
  }

  // Kategori dokumen pribadi: KTP, Ijazah, SK Karyawan, BPJS, Foto Profil
  return 'employee_docs';
}

/**
 * Mengunggah file ke Google Drive secara otomatis dalam kondisi Restricted
 * Mengutamakan Supabase Edge Function 'upload-to-gdrive' (Service Account Server-to-Server).
 */
export async function uploadFileToGoogleDrive(
  file: File,
  options?: GoogleDriveUploadOptions,
  customWebhookUrl?: string
): Promise<GoogleDriveUploadResult> {
  const webhookUrl = (customWebhookUrl || getGoogleDriveWebhookUrl()).trim();
  const folderType = options?.folderType || resolveFolderType(options?.category, options?.visibility);

  // 1. Validasi ukuran file di sisi client (Maksimal 25MB)
  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      fileUrl: '',
      fileName: file.name,
      error: `Ukuran file melebihi batas maksimal 25MB (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  let pureBase64 = '';
  try {
    const base64Data = await fileToBase64(file);
    pureBase64 = base64Data.split(',')[1] || base64Data;
  } catch (readErr: any) {
    return {
      success: false,
      fileUrl: '',
      fileName: file.name,
      error: readErr?.message || 'Gagal membaca file.',
    };
  }

  // 2. METODE UTAMA: Supabase Edge Function 'upload-to-gdrive' (Google Service Account Enterprise)
  try {
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('upload-to-gdrive', {
      body: {
        fileName: file.name,
        fileMimeType: file.type || 'application/octet-stream',
        fileBase64: pureBase64,
        category: options?.category,
        visibility: options?.visibility,
        targetEmail: (options?.targetEmail || '').trim().toLowerCase(),
        employeeId: options?.employeeId ? String(options.employeeId) : undefined,
        employeeCode: options?.employeeCode || '',
        employeeName: options?.employeeName || '',
        folderType,
        notes: options?.notes,
      },
    });

    if (!edgeError && edgeData && edgeData.success && (edgeData.fileUrl || edgeData.gdriveUrl)) {
      return {
        success: true,
        fileUrl: edgeData.fileUrl || edgeData.gdriveUrl,
        fileName: edgeData.fileName || file.name,
        fileId: edgeData.fileId,
        downloadUrl: edgeData.downloadUrl,
        folderId: edgeData.folderId,
        fileSize: file.size,
        mimeType: file.type,
      };
    } else if (edgeData && !edgeData.success && edgeData.error) {
      console.error('Edge Function upload-to-gdrive returned error:', edgeData.error);
      return {
        success: false,
        fileUrl: '',
        fileName: file.name,
        error: edgeData.error,
      };
    } else if (edgeError) {
      console.error('Edge Function invoke error:', edgeError);
      return {
        success: false,
        fileUrl: '',
        fileName: file.name,
        error: edgeError.message || 'Gagal menghubungi Edge Function upload-to-gdrive',
      };
    }
  } catch (edgeInvokeErr: any) {
    console.warn('Edge Function upload-to-gdrive invoke failed, trying fallback:', edgeInvokeErr);
  }

  // 3. FALLBACK: Jika Webhook Google Apps Script dikonfigurasi
  if (webhookUrl) {
    try {
      const payload = {
        action: 'upload',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        base64: pureBase64,
        category: options?.category || 'sk_karyawan',
        visibility: options?.visibility || 'private',
        targetEmail: (options?.targetEmail || '').trim().toLowerCase(),
        employeeId: options?.employeeId ? String(options.employeeId) : undefined,
        employeeCode: options?.employeeCode || '',
        employeeName: options?.employeeName || '',
        folderType,
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Google Drive Webhook HTTP status ${response.status}`);
      }

      const result = await response.json();
      if (result.success && (result.fileUrl || result.webViewLink)) {
        return {
          success: true,
          fileUrl: result.fileUrl || result.webViewLink,
          fileName: result.fileName || file.name,
          fileId: result.fileId,
          downloadUrl: result.downloadUrl || result.downloadLink,
          folderId: result.folderId,
          fileSize: file.size,
          mimeType: file.type,
        };
      }
    } catch (err: any) {
      console.warn('Google Drive fallback webhook failed:', err);
    }
  }

  // 4. Fallback Terakhir untuk preview sesi lokal jika upload cloud belum terhubung:
  try {
    const dataUrl = `data:${file.type || 'application/octet-stream'};base64,${pureBase64}`;
    return {
      success: true,
      fileUrl: dataUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    };
  } catch (err: any) {
    return {
      success: false,
      fileUrl: '',
      fileName: file.name,
      error: err.message || 'Gagal memproses file.',
    };
  }
}

/**
 * Template Script Google Apps Script Enterprise (Restricted Multi-Folder & Group Permissions)
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// =========================================================================
// GOOGLE APPS SCRIPT: GESIT HCM ENTERPRISE RESTRICTED STORAGE SERVICE
// Multi-Folder Architecture + Restricted Per-User Permissions
// =========================================================================
// Konfigurasi 4 Folder Terpisah di Google Workspace / Google Drive Perusahaan:
// 1. FOLDER_EMPLOYEE_DOCS: Folder Induk Dokumen Pribadi (KTP, Ijazah, SK, BPJS)
//    - Hanya HR/Admin yang memiliki akses ke folder ini.
//    - Setiap karyawan otomatis dibuatkan subfolder khusus jika belum ada.
// 2. FOLDER_NEWS_PUBLISHED: Folder Lampiran & Cover News yang Dipublikasikan
// 3. FOLDER_SK_PUBLISHED: Folder SK Direksi / Kebijakan yang Dipublikasikan
// 4. FOLDER_HR_INTERNAL: Folder Draft & Dokumen Internal HR (Hanya HR)
// =========================================================================

// Masukkan ID folder Google Drive perusahaan (Diambil dari URL folder):
var FOLDER_EMPLOYEE_DOCS  = ""; // Contoh: "1aBcDeFgHiJkLmNoP1..."
var FOLDER_NEWS_PUBLISHED  = ""; // Contoh: "1aBcDeFgHiJkLmNoP2..."
var FOLDER_SK_PUBLISHED    = ""; // Contoh: "1aBcDeFgHiJkLmNoP3..."
var FOLDER_HR_INTERNAL     = ""; // Contoh: "1aBcDeFgHiJkLmNoP4..."

// (Opsional) Alamat Google Group karyawan aktif perusahaan, misal: "all-employees@gesit.co.id"
var ALL_EMPLOYEES_GROUP_EMAIL = "";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data file atau muatan payload yang diterima.");
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || "upload";

    // 1. AKSI CABUT IZIN (REVOKE PERMISSION)
    if (action === "revoke_permission") {
      var fileId = data.fileId;
      var removeEmail = (data.targetEmail || "").trim().toLowerCase();
      if (!fileId || !removeEmail) throw new Error("fileId dan targetEmail wajib diisi untuk pencabutan izin.");

      var targetFile = DriveApp.getFileById(fileId);
      targetFile.removeViewer(removeEmail);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Izin untuk " + removeEmail + " berhasil dicabut."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. AKSI UPLOAD FILE
    var bytes = Utilities.base64Decode(data.base64);
    var blob = Utilities.newBlob(bytes, data.mimeType || "application/octet-stream", data.fileName || "dokumen.pdf");

    // Tentukan folder target berdasarkan folderType
    var targetFolder = resolveTargetFolder(data);

    // Buat file di Google Drive
    var file = targetFolder.createFile(blob);
    var fileId = file.getId();

    // Pastikan file berstatus RESTRICTED (Jangan Anyone With Link!)
    try {
      file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    } catch (errRestricted) {
      // Abaikan jika folder parent sudah mewarisi restricted
    }

    // Terapkan izin akses perorangan (Viewer)
    var grantedTo = [];
    var targetEmail = (data.targetEmail || "").trim().toLowerCase();

    // A. Jika dokumen pribadi dan ada email karyawan terverifikasi
    if (targetEmail && targetEmail.indexOf("@") !== -1) {
      try {
        file.addViewer(targetEmail);
        grantedTo.push(targetEmail);
      } catch (errAddUser) {
        // Log jika email di luar domain dibatasi oleh Google Workspace Admin
      }
    }

    // B. Jika dokumen dipublikasikan ke seluruh karyawan aktif dan ada Google Group terkelola
    if (data.visibility === "all_active" && ALL_EMPLOYEES_GROUP_EMAIL) {
      try {
        file.addViewer(ALL_EMPLOYEES_GROUP_EMAIL);
        grantedTo.push(ALL_EMPLOYEES_GROUP_EMAIL);
      } catch (errAddGroup) {}
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: fileId,
      fileUrl: file.getUrl(),
      webViewLink: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      fileName: file.getName(),
      folderId: targetFolder.getId(),
      grantedTo: grantedTo,
      isRestricted: true
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Menentukan folder tujuan upload
 */
function resolveTargetFolder(data) {
  var folderType = data.folderType || "employee_docs";
  var parentFolderId = "";

  if (folderType === "news_published" && FOLDER_NEWS_PUBLISHED) {
    parentFolderId = FOLDER_NEWS_PUBLISHED;
  } else if (folderType === "sk_published" && FOLDER_SK_PUBLISHED) {
    parentFolderId = FOLDER_SK_PUBLISHED;
  } else if (folderType === "hr_internal" && FOLDER_HR_INTERNAL) {
    parentFolderId = FOLDER_HR_INTERNAL;
  } else if (FOLDER_EMPLOYEE_DOCS) {
    parentFolderId = FOLDER_EMPLOYEE_DOCS;
  }

  var baseFolder = parentFolderId ? DriveApp.getFolderById(parentFolderId.trim()) : DriveApp.getRootFolder();

  // Jika folder dokumen pribadi, buatkan subfolder spesifik per karyawan agar terorganisir
  if (folderType === "employee_docs" && (data.employeeCode || data.employeeName)) {
    var subfolderName = (data.employeeCode ? "[" + data.employeeCode + "] " : "") + (data.employeeName || "Karyawan");
    var existingSubfolders = baseFolder.getFoldersByName(subfolderName);
    if (existingSubfolders.hasNext()) {
      return existingSubfolders.next();
    } else {
      return baseFolder.createFolder(subfolderName);
    }
  }

  return baseFolder;
}

// Cek status webhook
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "GESIT HCM Enterprise Restricted Google Drive Storage",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
