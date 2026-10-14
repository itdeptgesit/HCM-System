import * as XLSX from 'xlsx';
import { UserAccount } from '../types';
import { formatDateDDMMYYYY, normalizeGender, normalizeReligion } from './utils';

export interface ParsedEmployeeRow {
  rowNumber: number;
  fullName: string;
  email: string;
  password?: string;
  nik: string;
  role: string;
  phone?: string;
  birthPlace?: string;
  dateOfBirth?: string;
  gender?: string;
  religion?: string;
  maritalStatus?: string;
  bloodType?: string;
  address?: string;
  residentialAddress?: string;
  // Pendidikan
  lastEducation?: string;
  institutionName?: string;
  major?: string;
  educationStartYear?: string;
  graduationYear?: string;
  gpa?: string;
  diplomaNumber?: string;
  // Pekerjaan
  employeeCode?: string;
  company?: string;
  branch?: string;
  department?: string;
  jobTitle?: string;
  jobLevel?: string;
  employmentType?: string;
  status: 'Active' | 'Disabled';
  joinDate?: string;
  // Kontrak & PKWT
  contractType?: string;
  pkwtNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  // Payroll & Bank
  payrollStatus?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  taxStatus?: string;
  npwp?: string;
  bpjsTkNumber?: string;
  bpjsHealthNumber?: string;
  passportNumber?: string;
}

export interface InvalidEmployeeRow {
  rowNumber: number;
  fullName: string;
  email: string;
  errors: string[];
}

export interface ParseResult {
  totalRows: number;
  validRows: ParsedEmployeeRow[];
  invalidRows: InvalidEmployeeRow[];
}

/**
 * Format tanggal dari Excel (bisa serial number, Date object, string YYYY-MM-DD atau DD/MM/YYYY)
 */
function normalizeExcelDate(value: any): string | undefined {
  if (!value) return undefined;

  // Jika number (Excel serial date number)
  if (typeof value === 'number') {
    const parsedDate = new Date(Math.round((value - 25569) * 86400 * 1000));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().slice(0, 10);
    }
  }

  // Jika Date object
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
  }

  const str = String(value).trim();
  if (!str) return undefined;

  // Jika format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Jika format DD/MM/YYYY atau DD-MM-YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      // DD-MM-YYYY
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    } else if (parts[0].length === 4) {
      // YYYY-MM-DD
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // Coba parse dengan Date.parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return str;
}

/**
 * Menghasilkan file Excel (.xlsx) Template Import Karyawan lengkap dengan 2 Sheet
 */
export function generateEmployeeImportTemplate() {
  const workbook = XLSX.utils.book_new();

  // 1. DATA SHEET: Form Import Karyawan
  const templateHeaders = [
    'Nama Lengkap *',
    'Email Login *',
    'Password Akun * (Min 6 Karakter)',
    'NIK KTP (16 Digit) *',
    'Role Akun (Staff/Admin/Super Admin)',
    'Nomor Handphone',
    'Tempat Lahir',
    'Tanggal Lahir (DD/MM/YYYY)',
    'Jenis Kelamin (Laki-laki/Perempuan)',
    'Agama (Islam/Katolik/Kristen Protestan/Hindu/Buddha/Khonghucu)',
    'Status Pernikahan (Lajang/Menikah/Cerai)',
    'Golongan Darah (A/B/AB/O)',
    'Alamat KTP',
    'Alamat Domisili',
    'Pendidikan Terakhir (SMA/D3/S1/S2/S3)',
    'Nama Universitas / Sekolah',
    'Jurusan',
    'Tahun Masuk (YYYY)',
    'Tahun Kelulusan (YYYY)',
    'IPK / Nilai Akhir',
    'Nomor Ijazah',
    'NIP / Kode Karyawan',
    'Perusahaan',
    'Cabang / Lokasi Kerja',
    'Departemen',
    'Jabatan',
    'Level Jabatan (Staff/Supervisor/Manager)',
    'Tipe Karyawan (Full-Time/Part-Time/Intern)',
    'Status Akun (Active/Disabled)',
    'Tanggal Mulai Kerja (DD/MM/YYYY)',
    'Status Kepegawaian (PKWTT/PKWT/Probation/Magang)',
    'Nomor PKWT / SK Karyawan',
    'Tanggal Mulai Kontrak (DD/MM/YYYY)',
    'Tanggal Selesai Kontrak (DD/MM/YYYY)',
    'Status Payroll (Active/Hold)',
    'Nama Bank (BCA/Mandiri/BNI/BRI/dll)',
    'Nomor Rekening',
    'Nama Pemilik Rekening',
    'Status Pajak PTKP (TK/0, K/0, K/1, dll)',
    'Nomor NPWP',
    'Nomor BPJS Ketenagakerjaan',
    'Nomor BPJS Kesehatan',
    'Nomor Paspor'
  ];

  // Contoh data baris 1 & 2 untuk panduan pengisian
  const sampleRows = [
    {
      'Nama Lengkap *': 'Budi Santoso',
      'Email Login *': 'budi.santoso@gesit.co.id',
      'Password Akun * (Min 6 Karakter)': 'Gesit#2026',
      'NIK KTP (16 Digit) *': '3201012304900001',
      'Role Akun (Staff/Admin/Super Admin)': 'Staff',
      'Nomor Handphone': '081234567890',
      'Tempat Lahir': 'Jakarta',
      'Tanggal Lahir (DD/MM/YYYY)': '12/04/1995',
      'Jenis Kelamin (Laki-laki/Perempuan)': 'Laki-laki',
      'Agama (Islam/Katolik/Kristen Protestan/Hindu/Buddha/Khonghucu)': 'Islam',
      'Status Pernikahan (Lajang/Menikah/Cerai)': 'Menikah',
      'Golongan Darah (A/B/AB/O)': 'O',
      'Alamat KTP': 'Jl. Merdeka No. 10, Jakarta Pusat',
      'Alamat Domisili': 'Jl. Merdeka No. 10, Jakarta Pusat',
      'Pendidikan Terakhir (SMA/D3/S1/S2/S3)': 'S1',
      'Nama Universitas / Sekolah': 'Universitas Indonesia',
      'Jurusan': 'Teknik Informatika',
      'Tahun Masuk (YYYY)': '2013',
      'Tahun Kelulusan (YYYY)': '2017',
      'IPK / Nilai Akhir': '3.75',
      'Nomor Ijazah': 'UI-TI-2017-0982',
      'NIP / Kode Karyawan': 'EMP-2026-001',
      'Perusahaan': 'PT Gesit Graha',
      'Cabang / Lokasi Kerja': 'Head Office Jakarta',
      'Departemen': 'IT & Technology',
      'Jabatan': 'Software Engineer',
      'Level Jabatan (Staff/Supervisor/Manager)': 'Staff',
      'Tipe Karyawan (Full-Time/Part-Time/Intern)': 'Full-Time',
      'Status Akun (Active/Disabled)': 'Active',
      'Tanggal Mulai Kerja (DD/MM/YYYY)': '05/01/2026',
      'Status Kepegawaian (PKWTT/PKWT/Probation/Magang)': 'PKWT',
      'Nomor PKWT / SK Karyawan': '001/HRD-PKWT/I/2026',
      'Tanggal Mulai Kontrak (DD/MM/YYYY)': '05/01/2026',
      'Tanggal Selesai Kontrak (DD/MM/YYYY)': '04/01/2027',
      'Status Payroll (Active/Hold)': 'Active',
      'Nama Bank (BCA/Mandiri/BNI/BRI/dll)': 'BCA',
      'Nomor Rekening': '1234567890',
      'Nama Pemilik Rekening': 'Budi Santoso',
      'Status Pajak PTKP (TK/0, K/0, K/1, dll)': 'K/0',
      'Nomor NPWP': '87.123.456.7-012.000',
      'Nomor BPJS Ketenagakerjaan': '000123456789',
      'Nomor BPJS Kesehatan': '000987654321',
      'Nomor Paspor': '-'
    },
    {
      'Nama Lengkap *': 'Siti Rahmawati',
      'Email Login *': 'siti.rahma@gesit.co.id',
      'Password Akun * (Min 6 Karakter)': 'Gesit#2026',
      'NIK KTP (16 Digit) *': '3201015608920002',
      'Role Akun (Staff/Admin/Super Admin)': 'Staff',
      'Nomor Handphone': '085712345678',
      'Tempat Lahir': 'Bandung',
      'Tanggal Lahir (DD/MM/YYYY)': '20/08/1996',
      'Jenis Kelamin (Laki-laki/Perempuan)': 'Perempuan',
      'Agama (Islam/Katolik/Kristen Protestan/Hindu/Buddha/Khonghucu)': 'Islam',
      'Status Pernikahan (Lajang/Menikah/Cerai)': 'Lajang',
      'Golongan Darah (A/B/AB/O)': 'A',
      'Alamat KTP': 'Jl. Dago Asri No. 45, Bandung',
      'Alamat Domisili': 'Jl. Tebet Barat No. 12, Jakarta Selatan',
      'Pendidikan Terakhir (SMA/D3/S1/S2/S3)': 'S1',
      'Nama Universitas / Sekolah': 'Institut Teknologi Bandung',
      'Jurusan': 'Manajemen Bisnis',
      'Tahun Masuk (YYYY)': '2014',
      'Tahun Kelulusan (YYYY)': '2018',
      'IPK / Nilai Akhir': '3.80',
      'Nomor Ijazah': 'ITB-MB-2018-0412',
      'NIP / Kode Karyawan': 'EMP-2026-002',
      'Perusahaan': 'PT Gesit Graha',
      'Cabang / Lokasi Kerja': 'Head Office Jakarta',
      'Departemen': 'Human Capital',
      'Jabatan': 'HR Specialist',
      'Level Jabatan (Staff/Supervisor/Manager)': 'Staff',
      'Tipe Karyawan (Full-Time/Part-Time/Intern)': 'Full-Time',
      'Status Akun (Active/Disabled)': 'Active',
      'Tanggal Mulai Kerja (DD/MM/YYYY)': '01/02/2026',
      'Status Kepegawaian (PKWTT/PKWT/Probation/Magang)': 'Probation',
      'Nomor PKWT / SK Karyawan': '002/HRD-PROB/II/2026',
      'Tanggal Mulai Kontrak (DD/MM/YYYY)': '01/02/2026',
      'Tanggal Selesai Kontrak (DD/MM/YYYY)': '30/04/2026',
      'Status Payroll (Active/Hold)': 'Active',
      'Nama Bank (BCA/Mandiri/BNI/BRI/dll)': 'Mandiri',
      'Nomor Rekening': '9876543210123',
      'Nama Pemilik Rekening': 'Siti Rahmawati',
      'Status Pajak PTKP (TK/0, K/0, K/1, dll)': 'TK/0',
      'Nomor NPWP': '99.456.789.0-023.000',
      'Nomor BPJS Ketenagakerjaan': '000234567890',
      'Nomor BPJS Kesehatan': '000876543210',
      'Nomor Paspor': '-'
    }
  ];

  const dataSheet = XLSX.utils.json_to_sheet(sampleRows, { header: templateHeaders });

  // Auto-width columns
  dataSheet['!cols'] = templateHeaders.map(h => ({
    wch: Math.max(h.length + 3, 16)
  }));

  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Template Data Karyawan');

  // 2. GUIDELINES SHEET: Petunjuk & Opsi Nilai Valid
  const guidelinesData = [
    {
      'Nama Kolom': 'Nama Lengkap *',
      'Wajib / Opsional': 'Wajib',
      'Format & Ketentuan': 'Teks bebas, contoh: Budi Santoso',
      'Pilihan Nilai / Contoh': 'Sesuai KTP asli karyawan'
    },
    {
      'Nama Kolom': 'Email Login *',
      'Wajib / Opsional': 'Wajib',
      'Format & Ketentuan': 'Format email valid dan unik untuk login sistem',
      'Pilihan Nilai / Contoh': 'nama@perusahaan.com'
    },
    {
      'Nama Kolom': 'Password Akun *',
      'Wajib / Opsional': 'Wajib',
      'Format & Ketentuan': 'Minimal 6 karakter untuk akun Supabase Auth',
      'Pilihan Nilai / Contoh': 'Gesit#2026'
    },
    {
      'Nama Kolom': 'NIK KTP (16 Digit) *',
      'Wajib / Opsional': 'Wajib',
      'Format & Ketentuan': '16 digit angka identitas kependudukan',
      'Pilihan Nilai / Contoh': '3201012304900001'
    },
    {
      'Nama Kolom': 'Role Akun',
      'Wajib / Opsional': 'Opsional (Default: Staff)',
      'Format & Ketentuan': 'Role hak akses di sistem HCM',
      'Pilihan Nilai / Contoh': 'Staff, Admin, Super Admin, User'
    },
    {
      'Nama Kolom': 'Jenis Kelamin',
      'Wajib / Opsional': 'Opsional',
      'Format & Ketentuan': 'Pilihan',
      'Pilihan Nilai / Contoh': 'Laki-laki / Perempuan'
    },
    {
      'Nama Kolom': 'Agama',
      'Wajib / Opsional': 'Opsional',
      'Format & Ketentuan': 'Pilihan',
      'Pilihan Nilai / Contoh': 'Islam, Kristen, Katolik, Hindu, Buddha, Konghucu'
    },
    {
      'Nama Kolom': 'Status Pernikahan',
      'Wajib / Opsional': 'Opsional',
      'Format & Ketentuan': 'Pilihan status nikah',
      'Pilihan Nilai / Contoh': 'Lajang, Menikah, Cerai'
    },
    {
      'Nama Kolom': 'Pendidikan Terakhir',
      'Wajib / Opsional': 'Opsional',
      'Format & Ketentuan': 'Jenjang pendidikan terakhir',
      'Pilihan Nilai / Contoh': 'SMA/SMK, D3, S1, S2, S3'
    },
    {
      'Nama Kolom': 'Level Jabatan',
      'Wajib / Opsional': 'Opsional',
      'Format & Ketentuan': 'Struktur level jabatan',
      'Pilihan Nilai / Contoh': 'Staff, Officer, Specialist, Supervisor, Asst Manager, Manager, General Manager, Director'
    },
    {
      'Nama Kolom': 'Status Kepegawaian',
      'Wajib / Opsional': 'Opsional (Default: PKWTT)',
      'Format & Ketentuan': 'Ikatan status kepegawaian (4 jenis resmi)',
      'Pilihan Nilai / Contoh': 'PKWTT, PKWT, Probation, Magang'
    },
    {
      'Nama Kolom': 'Status Akun',
      'Wajib / Opsional': 'Opsional (Default: Active)',
      'Format & Ketentuan': 'Status aktifasi akun sistem',
      'Pilihan Nilai / Contoh': 'Active / Disabled'
    },
    {
      'Nama Kolom': 'Format Tanggal',
      'Wajib / Opsional': 'Aturan Umum',
      'Format & Ketentuan': 'Gunakan format standar DD/MM/YYYY atau format Date Excel',
      'Pilihan Nilai / Contoh': 'Contoh: 12/04/1995 atau 05/01/2026'
    }
  ];

  const guideSheet = XLSX.utils.json_to_sheet(guidelinesData);
  guideSheet['!cols'] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 45 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(workbook, guideSheet, 'Petunjuk & Nilai Valid');

  // Unduh file langsung di browser
  XLSX.writeFile(workbook, 'Template_Import_Karyawan_Gesit_People.xlsx');
}

/**
 * Normalisasi nama header agar toleran terhadap variasi spasi / huruf besar-kecil / tanda bintang
 */
function cleanKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parsing file Excel yang diunggah pengguna dan menghasilkan data valid vs invalid
 */
export async function parseEmployeeImportExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error('Lembar kerja (worksheet) pertama tidak ditemukan.');
  }

  // Konversi sheet ke array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: ''
  });

  const validRows: ParsedEmployeeRow[] = [];
  const invalidRows: InvalidEmployeeRow[] = [];
  const existingEmailsInFile = new Set<string>();

  rawRows.forEach((row, index) => {
    // Nomor baris di Excel (Header adalah baris 1, data mulai dari baris 2)
    const rowNumber = index + 2;

    // Normalisasi mapping row berdasarkan cleanKey
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(k => {
      normalizedRow[cleanKey(k)] = row[k];
    });

    // Helper untuk mengambil nilai dengan beberapa variasi nama kolom
    const getValue = (...keys: string[]): any => {
      for (const k of keys) {
        const cleaned = cleanKey(k);
        if (normalizedRow[cleaned] !== undefined && normalizedRow[cleaned] !== null && String(normalizedRow[cleaned]).trim() !== '') {
          return normalizedRow[cleaned];
        }
      }
      return undefined;
    };

    // Ambil field-field utama
    const fullName = String(getValue('namalengkap', 'nama', 'fullname', 'name') || '').trim();
    const rawEmail = String(getValue('emaillogin', 'email', 'alamatemail') || '').trim().toLowerCase();
    const rawPassword = String(getValue('passwordakun', 'password', 'katasandi') || '').trim();
    const nik = String(getValue('nikktp', 'nik', 'nomorktp', 'ktp') || '').trim();

    // Jika seluruh baris kosong, lewati
    if (!fullName && !rawEmail && !nik) {
      return;
    }

    const errors: string[] = [];

    // Validasi Nama Lengkap
    if (!fullName) {
      errors.push('Nama Lengkap wajib diisi');
    }

    // Validasi Email
    if (!rawEmail) {
      errors.push('Email login wajib diisi');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      errors.push(`Format email "${rawEmail}" tidak valid`);
    } else if (existingEmailsInFile.has(rawEmail)) {
      errors.push(`Email "${rawEmail}" duplikat di dalam file ini`);
    } else {
      existingEmailsInFile.add(rawEmail);
    }

    // Validasi NIK
    if (!nik) {
      errors.push('NIK KTP wajib diisi');
    }

    // Validasi Password jika ada
    if (rawPassword && rawPassword.length < 6) {
      errors.push('Password minimal 6 karakter');
    }

    // Jika ada error pada baris ini
    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        fullName: fullName || '(Tanpa Nama)',
        email: rawEmail || '(Tanpa Email)',
        errors
      });
      return;
    }

    // Parsing kolom opsional
    const parsedRow: ParsedEmployeeRow = {
      rowNumber,
      fullName,
      email: rawEmail,
      password: rawPassword || 'Gesit#2026',
      nik,
      role: String(getValue('roleakun', 'role', 'hakakses') || 'Staff').trim(),
      phone: getValue('nomorhandphone', 'phone', 'telepon', 'hp') ? String(getValue('nomorhandphone', 'phone', 'telepon', 'hp')).trim() : undefined,
      birthPlace: getValue('tempatlahir', 'birthplace', 'kota_lahir') ? String(getValue('tempatlahir', 'birthplace', 'kota_lahir')).trim() : undefined,
      dateOfBirth: normalizeExcelDate(getValue('tanggallahir', 'dateofbirth', 'tgllahir')),
      gender: getValue('jeniskelamin', 'gender', 'kelamin') ? String(getValue('jeniskelamin', 'gender', 'kelamin')).trim() : undefined,
      religion: getValue('agama', 'religion') ? String(getValue('agama', 'religion')).trim() : undefined,
      maritalStatus: getValue('statuspernikahan', 'maritalstatus', 'statusnikah') ? String(getValue('statuspernikahan', 'maritalstatus', 'statusnikah')).trim() : undefined,
      bloodType: getValue('golongandarah', 'bloodtype', 'goldarah') ? String(getValue('golongandarah', 'bloodtype', 'goldarah')).trim() : undefined,
      address: getValue('alamatktp', 'address', 'alamat') ? String(getValue('alamatktp', 'address', 'alamat')).trim() : undefined,
      residentialAddress: getValue('alamatdomisili', 'residentialaddress', 'domisili') ? String(getValue('alamatdomisili', 'residentialaddress', 'domisili')).trim() : undefined,

      // Data Pendidikan
      lastEducation: getValue('pendidikanterakhir', 'lasteducation', 'pendidikan') ? String(getValue('pendidikanterakhir', 'lasteducation', 'pendidikan')).trim() : undefined,
      institutionName: getValue('namauniversitas', 'universitas', 'institutionname', 'sekolah') ? String(getValue('namauniversitas', 'universitas', 'institutionname', 'sekolah')).trim() : undefined,
      major: getValue('jurusan', 'major', 'programstudi') ? String(getValue('jurusan', 'major', 'programstudi')).trim() : undefined,
      educationStartYear: getValue('tahunmasuk', 'educationstartyear') ? String(getValue('tahunmasuk', 'educationstartyear')).trim() : undefined,
      graduationYear: getValue('tahunkelulusan', 'graduationyear', 'tahunlulus') ? String(getValue('tahunkelulusan', 'graduationyear', 'tahunlulus')).trim() : undefined,
      gpa: getValue('ipk', 'gpa', 'nilaiakhir') ? String(getValue('ipk', 'gpa', 'nilaiakhir')).trim() : undefined,
      diplomaNumber: getValue('nomorijazah', 'diplomanumber', 'ijazah') ? String(getValue('nomorijazah', 'diplomanumber', 'ijazah')).trim() : undefined,

      // Pekerjaan
      employeeCode: getValue('nip', 'kodekaryawan', 'employeecode') ? String(getValue('nip', 'kodekaryawan', 'employeecode')).trim() : undefined,
      company: getValue('perusahaan', 'company', 'pt') ? String(getValue('perusahaan', 'company', 'pt')).trim() : undefined,
      branch: getValue('cabang', 'branch', 'lokasikerja') ? String(getValue('cabang', 'branch', 'lokasikerja')).trim() : undefined,
      department: getValue('departemen', 'department', 'divisi') ? String(getValue('departemen', 'department', 'divisi')).trim() : 'Other',
      jobTitle: getValue('jabatan', 'jobtitle', 'posisi') ? String(getValue('jabatan', 'jobtitle', 'posisi')).trim() : undefined,
      jobLevel: getValue('leveljabatan', 'joblevel', 'level') ? String(getValue('leveljabatan', 'joblevel', 'level')).trim() : 'Staff',
      employmentType: getValue('tipekaryawan', 'employmenttype', 'tipe') ? String(getValue('tipekaryawan', 'employmenttype', 'tipe')).trim() : 'Full-Time',
      status: (String(getValue('statusakun', 'status', 'statuskaryawan') || 'Active').toLowerCase() === 'disabled') ? 'Disabled' : 'Active',
      joinDate: normalizeExcelDate(getValue('tanggalmulaikerja', 'joindate', 'tglmasuk', 'tglbergabung')),

      // Kontrak & PKWT
      contractType: getValue('statuskontrak', 'contracttype', 'jeniskontrak') ? String(getValue('statuskontrak', 'contracttype', 'jeniskontrak')).trim() : 'PKWT 1',
      pkwtNumber: getValue('nomorpkwt', 'pkwt_number', 'nosk', 'skkaryawan') ? String(getValue('nomorpkwt', 'pkwt_number', 'nosk', 'skkaryawan')).trim() : undefined,
      contractStartDate: normalizeExcelDate(getValue('tanggalmulaikontrak', 'contractstartdate', 'tglmulaikontrak')),
      contractEndDate: normalizeExcelDate(getValue('tanggalselesaikontrak', 'contractenddate', 'tglselesaikontrak')),

      // Payroll & Bank
      payrollStatus: getValue('statuspayroll', 'payrollstatus') ? String(getValue('statuspayroll', 'payrollstatus')).trim() : 'Active',
      bankName: getValue('namabank', 'bankname', 'bank') ? String(getValue('namabank', 'bankname', 'bank')).trim() : undefined,
      bankAccountNumber: getValue('nomorrekening', 'bankaccountnumber', 'norek') ? String(getValue('nomorrekening', 'bankaccountnumber', 'norek')).trim() : undefined,
      bankAccountName: getValue('namapemilikrekening', 'bankaccountname', 'atasnama') ? String(getValue('namapemilikrekening', 'bankaccountname', 'atasnama')).trim() : undefined,
      taxStatus: getValue('statuspajak', 'taxstatus', 'ptkp') ? String(getValue('statuspajak', 'taxstatus', 'ptkp')).trim() : undefined,
      npwp: getValue('nomornpwp', 'npwp') ? String(getValue('nomornpwp', 'npwp')).trim() : undefined,
      bpjsTkNumber: getValue('nomorbpjsketenagakerjaan', 'bpjstknumber', 'bpjstk') ? String(getValue('nomorbpjsketenagakerjaan', 'bpjstknumber', 'bpjstk')).trim() : undefined,
      bpjsHealthNumber: getValue('nomorbpjskesehatan', 'bpjshealthnumber', 'bpjskes') ? String(getValue('nomorbpjskesehatan', 'bpjshealthnumber', 'bpjskes')).trim() : undefined,
      passportNumber: getValue('nomorpaspor', 'passportnumber', 'paspor') ? String(getValue('nomorpaspor', 'passportnumber', 'paspor')).trim() : undefined
    };

    validRows.push(parsedRow);
  });

  return {
    totalRows: validRows.length + invalidRows.length,
    validRows,
    invalidRows
  };
}

/**
 * Helper untuk menghitung usia dari tanggal lahir
 */
export function calculateEmployeeAge(dateOfBirth?: string): string {
  if (!dateOfBirth) return '-';
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return '-';
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  const age = Math.abs(ageDate.getUTCFullYear() - 1970);
  return `${age} Tahun`;
}

/**
 * Helper untuk menghitung masa kerja dari join date
 */
export function calculateEmployeeTenure(joinDate?: string): string {
  if (!joinDate) return '-';
  const start = new Date(joinDate);
  if (isNaN(start.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years <= 0 && months <= 0) return '< 1 Bulan';
  if (years <= 0) return `${months} Bulan`;
  return `${years} Thn ${months} Bln`;
}

/**
 * Format 1 record karyawan ke format lengkap (46 kolom komprehensif)
 */
export function mapEmployeeToFullRow(emp: UserAccount): Record<string, any> {
  return {
    'Employee ID': emp.employeeCode || '-',
    'Nama Lengkap': emp.fullName,
    'Nama Panggilan': emp.nickname || '-',
    'Email Login / Kantor': emp.email,
    'Nomor Handphone': emp.phone || '-',
    'Role Sistem': emp.role || 'Staff',
    'Status Akun': emp.status || 'Active',
    'Status Kepegawaian': emp.contractType || emp.employmentType || 'PKWTT',
    'NIK KTP (16 Digit)': emp.nik || '-',
    'NPWP': emp.npwp || '-',
    'No. Paspor': emp.passportNumber || '-',
    'Perusahaan': emp.company || '-',
    'Cabang / Lokasi Kerja': emp.branch || '-',
    'Departemen / Divisi': emp.department || '-',
    'Jabatan': emp.jobTitle || '-',
    'Level Jabatan': emp.jobLevel || '-',
    'Golongan / Grade': emp.gradeClass || '-',
    'Tipe Hubungan Kerja': emp.contractType || emp.employmentType || 'PKWTT',
    'Status Kontrak': emp.contractType || 'PKWTT',
    'Nomor SK / PKWT': emp.pkwtNumber || '-',
    'Tanggal Mulai Kontrak': emp.contractStartDate || '-',
    'Tanggal Berakhir Kontrak': emp.contractEndDate || '-',
    'Tanggal Bergabung (Join Date)': emp.joinDate || '-',
    'Masa Kerja': calculateEmployeeTenure(emp.joinDate),
    'Tempat Lahir': emp.birthPlace || '-',
    'Tanggal Lahir': emp.dateOfBirth || '-',
    'Usia': calculateEmployeeAge(emp.dateOfBirth),
    'Jenis Kelamin': emp.gender || '-',
    'Agama': emp.religion || '-',
    'Status Pernikahan': emp.maritalStatus || '-',
    'Golongan Darah': emp.bloodType || '-',
    'Alamat KTP': emp.address || '-',
    'Alamat Domisili': emp.residentialAddress || '-',
    'Pendidikan Terakhir': emp.lastEducation || '-',
    'Universitas / Institusi': emp.institutionName || '-',
    'Jurusan': emp.major || '-',
    'Tahun Masuk Pendidikan': emp.educationStartYear || '-',
    'Tahun Kelulusan': emp.graduationYear || '-',
    'IPK / Nilai': emp.gpa || '-',
    'Nomor Ijazah': emp.diplomaNumber || '-',
    'Status Payroll': emp.payrollStatus || 'Active',
    'Nama Bank': emp.bankName || '-',
    'Nomor Rekening': emp.bankAccountNumber || '-',
    'Nama Pemilik Rekening': emp.bankAccountName || '-',
    'Status Pajak (PTKP)': emp.taxStatus || '-',
    'BPJS Ketenagakerjaan': emp.bpjsTkNumber || '-',
    'BPJS Kesehatan': emp.bpjsHealthNumber || '-'
  };
}

/**
 * Ekspor seluruh data karyawan lengkap ke format file Excel tunggal (.xlsx)
 */
export function exportComprehensiveEmployeesExcel(
  employees: UserAccount[],
  fileNamePrefix: string = 'GESIT-DATA-KARYAWAN-FULL-LENGKAP'
) {
  if (!employees || employees.length === 0) {
    throw new Error('Tidak ada data karyawan untuk diekspor.');
  }

  const rows = employees.map(mapEmployeeToFullRow);
  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set lebar kolom otomatis
  const maxWidths: number[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key, i) => {
      const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
      const len = Math.max(val.length, key.length) + 3;
      maxWidths[i] = Math.max(maxWidths[i] || 0, Math.min(len, 50));
    });
  });
  worksheet['!cols'] = maxWidths.map(wch => ({ wch: Math.max(wch, 12) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Data Karyawan');
  XLSX.writeFile(workbook, `${fileNamePrefix}-${todayStr}.xlsx`);
}

/**
 * Ekspor multi-sheet terorganisir (Master, Kontrak, Payroll, Pendidikan)
 */
export function exportMultiSheetEmployeesExcel(
  employees: UserAccount[],
  fileNamePrefix: string = 'GESIT-BUKU-DATA-KARYAWAN'
) {
  if (!employees || employees.length === 0) {
    throw new Error('Tidak ada data karyawan untuk diekspor.');
  }

  const workbook = XLSX.utils.book_new();
  const todayStr = new Date().toISOString().split('T')[0];

  // Sheet 1: Master Lengkap
  const fullRows = employees.map(mapEmployeeToFullRow);
  const sheet1 = XLSX.utils.json_to_sheet(fullRows);
  XLSX.utils.book_append_sheet(workbook, sheet1, '1. Master Data Lengkap');

  // Sheet 2: Kontrak & Legalitas PKWT
  const contractRows = employees.map(e => ({
    'Employee ID': e.employeeCode || '-',
    'Nama Karyawan': e.fullName,
    'Perusahaan': e.company || '-',
    'Departemen': e.department || '-',
    'Jabatan': e.jobTitle || '-',
    'Tipe Kepegawaian': e.employmentType || '-',
    'Status Kontrak': e.contractType || '-',
    'Nomor SK / PKWT': e.pkwtNumber || '-',
    'Tanggal Mulai Kontrak': e.contractStartDate || '-',
    'Tanggal Selesai Kontrak': e.contractEndDate || '-',
    'Tanggal Bergabung': e.joinDate || '-',
    'Masa Kerja': calculateEmployeeTenure(e.joinDate)
  }));
  const sheet2 = XLSX.utils.json_to_sheet(contractRows);
  XLSX.utils.book_append_sheet(workbook, sheet2, '2. Kontrak & PKWT');

  // Sheet 3: Payroll & Finansial
  const payrollRows = employees.map(e => ({
    'Employee ID': e.employeeCode || '-',
    'Nama Karyawan': e.fullName,
    'Perusahaan': e.company || '-',
    'Departemen': e.department || '-',
    'Jabatan': e.jobTitle || '-',
    'Status Payroll': e.payrollStatus || 'Active',
    'Bank': e.bankName || '-',
    'Nomor Rekening': e.bankAccountNumber || '-',
    'Atas Nama Rekening': e.bankAccountName || '-',
    'NPWP': e.npwp || '-',
    'Status Pajak (PTKP)': e.taxStatus || '-',
    'BPJS Ketenagakerjaan': e.bpjsTkNumber || '-',
    'BPJS Kesehatan': e.bpjsHealthNumber || '-'
  }));
  const sheet3 = XLSX.utils.json_to_sheet(payrollRows);
  XLSX.utils.book_append_sheet(workbook, sheet3, '3. Payroll & Bank');

  // Sheet 4: Pendidikan & Demografi Pribadi
  const demografiRows = employees.map(e => ({
    'Employee ID': e.employeeCode || '-',
    'Nama Karyawan': e.fullName,
    'NIK KTP': e.nik || '-',
    'Tempat Lahir': e.birthPlace || '-',
    'Tanggal Lahir': e.dateOfBirth || '-',
    'Usia': calculateEmployeeAge(e.dateOfBirth),
    'Jenis Kelamin': e.gender || '-',
    'Agama': e.religion || '-',
    'Status Pernikahan': e.maritalStatus || '-',
    'Pendidikan Terakhir': e.lastEducation || '-',
    'Universitas / Sekolah': e.institutionName || '-',
    'Jurusan': e.major || '-',
    'Tahun Kelulusan': e.graduationYear || '-',
    'IPK': e.gpa || '-',
    'Nomor Ijazah': e.diplomaNumber || '-'
  }));
  const sheet4 = XLSX.utils.json_to_sheet(demografiRows);
  XLSX.utils.book_append_sheet(workbook, sheet4, '4. Pendidikan & Profil');

  XLSX.writeFile(workbook, `${fileNamePrefix}-${todayStr}.xlsx`);
}

/**
 * Konfigurasi grup kolom dinamis
 */
export interface DynamicColumnGroups {
  identity: boolean;
  org: boolean;
  contract: boolean;
  personal: boolean;
  education: boolean;
  payroll: boolean;
  tax: boolean;
}

/**
 * Ekspor data karyawan dinamis sesuai grup kolom yang dipilih pengguna
 */
export function exportDynamicEmployeesExcel(
  employees: UserAccount[],
  columnGroups: DynamicColumnGroups,
  fileNamePrefix: string = 'GESIT-EXPORT-DINAMIS'
) {
  if (!employees || employees.length === 0) {
    throw new Error('Tidak ada data karyawan untuk diekspor.');
  }

  const rows = employees.map(emp => {
    const row: Record<string, any> = {};

    if (columnGroups.identity) {
      row['Employee ID'] = emp.employeeCode || '-';
      row['Nama Lengkap'] = emp.fullName;
      row['Nama Panggilan'] = emp.nickname || '-';
      row['Email'] = emp.email;
      row['No. Handphone'] = emp.phone || '-';
      row['Role Sistem'] = emp.role || 'Staff';
      row['Status Akun'] = emp.status || 'Active';
    }

    if (columnGroups.org) {
      row['Perusahaan'] = emp.company || '-';
      row['Cabang'] = emp.branch || '-';
      row['Departemen'] = emp.department || '-';
      row['Jabatan'] = emp.jobTitle || '-';
      row['Level Jabatan'] = emp.jobLevel || '-';
      row['Golongan'] = emp.gradeClass || '-';
      row['Tanggal Bergabung'] = formatDateDDMMYYYY(emp.joinDate);
      row['Masa Kerja'] = calculateEmployeeTenure(emp.joinDate);
    }

    if (columnGroups.contract) {
      row['Tipe Kepegawaian'] = emp.employmentType || '-';
      row['Status Kepegawaian'] = emp.contractType || emp.employmentType || 'PKWTT';
      row['Nomor SK / PKWT'] = emp.pkwtNumber || '-';
      row['Tgl Mulai Kontrak'] = formatDateDDMMYYYY(emp.contractStartDate);
      row['Tgl Selesai Kontrak'] = formatDateDDMMYYYY(emp.contractEndDate);
    }

    if (columnGroups.personal) {
      row['NIK KTP'] = emp.nik || '-';
      row['NPWP'] = emp.npwp || '-';
      row['Tempat Lahir'] = emp.birthPlace || '-';
      row['Tanggal Lahir'] = formatDateDDMMYYYY(emp.dateOfBirth);
      row['Usia'] = calculateEmployeeAge(emp.dateOfBirth);
      row['Jenis Kelamin'] = normalizeGender(emp.gender) || '-';
      row['Agama'] = normalizeReligion(emp.religion) || '-';
      row['Status Pernikahan'] = emp.maritalStatus || '-';
      row['Golongan Darah'] = emp.bloodType || '-';
      row['Alamat KTP'] = emp.address || '-';
      row['Alamat Domisili'] = emp.residentialAddress || '-';
      row['No. Paspor'] = emp.passportNumber || '-';
    }

    if (columnGroups.education) {
      row['Pendidikan Terakhir'] = emp.lastEducation || '-';
      row['Universitas / Institusi'] = emp.institutionName || '-';
      row['Jurusan'] = emp.major || '-';
      row['Tahun Masuk'] = emp.educationStartYear || '-';
      row['Tahun Kelulusan'] = emp.graduationYear || '-';
      row['IPK'] = emp.gpa || '-';
      row['Nomor Ijazah'] = emp.diplomaNumber || '-';
    }

    if (columnGroups.payroll) {
      row['Status Payroll'] = emp.payrollStatus || 'Active';
      row['Nama Bank'] = emp.bankName || '-';
      row['Nomor Rekening'] = emp.bankAccountNumber || '-';
      row['Nama Pemilik Rekening'] = emp.bankAccountName || '-';
    }

    if (columnGroups.tax) {
      row['NPWP'] = emp.npwp || '-';
      row['Status Pajak (PTKP)'] = emp.taxStatus || '-';
      row['BPJS Ketenagakerjaan'] = emp.bpjsTkNumber || '-';
      row['BPJS Kesehatan'] = emp.bpjsHealthNumber || '-';
    }

    // Jika pengguna tidak mencentang apa pun, sediakan minimal info dasar
    if (Object.keys(row).length === 0) {
      row['Employee ID'] = emp.employeeCode || '-';
      row['Nama Lengkap'] = emp.fullName;
      row['Email'] = emp.email;
      row['Perusahaan'] = emp.company || '-';
      row['Departemen'] = emp.department || '-';
      row['Jabatan'] = emp.jobTitle || '-';
    }

    return row;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  const maxWidths: number[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key, i) => {
      const val = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
      const len = Math.max(val.length, key.length) + 3;
      maxWidths[i] = Math.max(maxWidths[i] || 0, Math.min(len, 50));
    });
  });
  worksheet['!cols'] = maxWidths.map(wch => ({ wch: Math.max(wch, 12) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Karyawan Terpilih');
  XLSX.writeFile(workbook, `${fileNamePrefix}-${todayStr}.xlsx`);
}

