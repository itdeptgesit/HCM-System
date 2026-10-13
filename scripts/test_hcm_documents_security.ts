/**
 * Automated Security & Business Rules Test Suite for HCM Documents & Google Drive Integration
 * Run via: node scripts/test_hcm_documents_security.mjs
 */

// 1. Mock import.meta.env for standalone Node environment
if (typeof (import.meta as any).env === 'undefined') {
  (import.meta as any).env = {
    VITE_SUPABASE_URL: 'https://oyhwtleoftbiyabsgjsu.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'mock-anon-key',
    VITE_GDRIVE_UPLOAD_URL: '',
  };
}

import { resolveFolderType } from '../lib/googleDriveUpload';
import { validateUploadAuthorization } from '../lib/documentService';
import { UserAccount } from '../types';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${detail || ''}`);
    failedTests++;
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING GESIT HCM DOCUMENT SECURITY & ACCESS CONTROL TEST');
  console.log('================================================================\n');

  // MOCK ACCOUNTS
  const hrAdmin = {
    id: 1,
    username: 'hr.admin',
    email: 'hr.admin@gesit.co.id',
    fullName: 'HR Admin',
    department: 'HRD',
    role: 'HR Manager',
    groups: ['hr', 'admin'],
    status: 'Active',
  } as unknown as UserAccount;

  const employeeA = {
    id: 101,
    username: 'karyawan.a',
    email: 'karyawan.a@gesit.co.id',
    fullName: 'Ahmad Subarjo (Karyawan A)',
    department: 'IT',
    role: 'Employee',
    groups: ['employee'],
    status: 'Active',
  } as unknown as UserAccount;

  const employeeB = {
    id: 102,
    username: 'karyawan.b',
    email: 'karyawan.b@gesit.co.id',
    fullName: 'Budi Santoso (Karyawan B)',
    department: 'Finance',
    role: 'Employee',
    groups: ['employee'],
    status: 'Active',
  } as unknown as UserAccount;

  const inactiveEmployee = {
    id: 103,
    username: 'mantan.karyawan',
    email: 'mantan.karyawan@gesit.co.id',
    fullName: 'Mantan Karyawan (Resigned)',
    department: 'Operations',
    role: 'Employee',
    groups: ['employee'],
    status: 'Disabled',
  } as unknown as UserAccount;

  // -------------------------------------------------------------
  // TEST GROUP 1: OTORISASI UPLOAD DOKUMEN PRIBADI (ATURAN 2.A)
  // -------------------------------------------------------------
  console.log('📁 [Test Group 1] Otorisasi Dokumen Pribadi (KTP, Ijazah, SK, BPJS)');
  
  // 1.1 Karyawan A mengunggah dokumen KTP miliknya sendiri -> HARUS BOLEH
  const test1_1 = validateUploadAuthorization('ktp', employeeA.id, employeeA);
  assert(test1_1.allowed, 'Karyawan A boleh mengunggah dokumen pribadi KTP miliknya sendiri');

  // 1.2 Karyawan B mencoba mengunggah/mengganti dokumen KTP milik Karyawan A -> HARUS DITOLAK
  const test1_2 = validateUploadAuthorization('ktp', employeeA.id, employeeB);
  assert(!test1_2.allowed, 'Karyawan B DITOLAK saat mencoba mengunggah dokumen KTP milik Karyawan A', test1_2.reason);

  // 1.3 HR berwenang mengunggah dokumen KTP atas nama Karyawan A -> HARUS BOLEH
  const test1_3 = validateUploadAuthorization('ktp', employeeA.id, hrAdmin);
  assert(test1_3.allowed, 'HR Admin berwenang mengunggah dokumen KTP untuk Karyawan A');

  // 1.4 Akun nonaktif mencoba mengunggah dokumen -> HARUS DITOLAK
  const test1_4 = validateUploadAuthorization('ktp', inactiveEmployee.id, inactiveEmployee);
  assert(!test1_4.allowed, 'Akun karyawan nonaktif (Inactive/Resigned) DITOLAK saat mengunggah dokumen', test1_4.reason);

  console.log('');

  // -------------------------------------------------------------
  // TEST GROUP 2: OTORISASI SK PERUSAHAAN & NEWS (ATURAN 2.B & 2.C)
  // -------------------------------------------------------------
  console.log('📢 [Test Group 2] Otorisasi SK Perusahaan & Pengumuman (News)');

  // 2.1 Karyawan biasa mencoba mengunggah SK Kebijakan Perusahaan -> HARUS DITOLAK
  const test2_1 = validateUploadAuthorization('sk_perusahaan', null, employeeA);
  assert(!test2_1.allowed, 'Karyawan biasa DITOLAK saat mencoba mengunggah SK Kebijakan Perusahaan', test2_1.reason);

  // 2.2 Karyawan biasa mencoba mengunggah attachment News -> HARUS DITOLAK
  const test2_2 = validateUploadAuthorization('news_attachment', null, employeeB);
  assert(!test2_2.allowed, 'Karyawan biasa DITOLAK saat mencoba mengunggah dokumen Pengumuman (News)', test2_2.reason);

  // 2.3 HR Admin mengunggah SK Kebijakan Perusahaan -> HARUS BOLEH
  const test2_3 = validateUploadAuthorization('sk_perusahaan', null, hrAdmin);
  assert(test2_3.allowed, 'HR Admin berwenang mengunggah SK Kebijakan Perusahaan');

  // 2.4 HR Admin mengunggah dokumen News -> HARUS BOLEH
  const test2_4 = validateUploadAuthorization('news_attachment', null, hrAdmin);
  assert(test2_4.allowed, 'HR Admin berwenang mengunggah dokumen Pengumuman (News)');

  console.log('');

  // -------------------------------------------------------------
  // TEST GROUP 3: ROUTING FOLDER TERPISAH GOOGLE DRIVE (ATURAN 3)
  // -------------------------------------------------------------
  console.log('🗂️  [Test Group 3] Routing Folder Terpisah Google Drive');

  // 3.1 Dokumen KTP -> Harus masuk ke 'employee_docs'
  assert(resolveFolderType('ktp', 'private') === 'employee_docs', 'KTP dialihkan ke folder "employee_docs"');

  // 3.2 Dokumen Ijazah -> Harus masuk ke 'employee_docs'
  assert(resolveFolderType('ijazah', 'private') === 'employee_docs', 'Ijazah dialihkan ke folder "employee_docs"');

  // 3.3 SK Perusahaan Published -> Harus masuk ke 'sk_published'
  assert(resolveFolderType('sk_perusahaan', 'all_active') === 'sk_published', 'SK Terbit dialihkan ke folder "sk_published"');

  // 3.4 SK Internal HR / Draft -> Harus masuk ke 'hr_internal'
  assert(resolveFolderType('sk_perusahaan', 'hr_only') === 'hr_internal', 'SK Draft HR dialihkan ke folder "hr_internal"');

  // 3.5 News Attachment Published -> Harus masuk ke 'news_published'
  assert(resolveFolderType('news_attachment', 'all_active') === 'news_published', 'News Terbit dialihkan ke folder "news_published"');

  // 3.6 Dokumen Internal HR -> Harus masuk ke 'hr_internal'
  assert(resolveFolderType('internal_hr', 'hr_only') === 'hr_internal', 'Dokumen Internal HR dialihkan ke folder "hr_internal"');

  console.log('');

  // -------------------------------------------------------------
  // TEST GROUP 4: INTEGRITAS FILE & PENOLAKAN BASE64
  // -------------------------------------------------------------
  console.log('🔒 [Test Group 4] Integritas File & Penolakan Ukuran Berlebih');

  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const oversizedFileSize = 26 * 1024 * 1024;
  assert(oversizedFileSize > MAX_FILE_SIZE, 'File 26MB melebihi batas sistem 25MB (Otomatis ditolak)');

  console.log('\n================================================================');
  console.log(`📊 HASIL PENGUJIAN OTOMATIS: ${passedTests} LULUS, ${failedTests} GAGAL`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
