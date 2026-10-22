import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'id';

export interface Translations {
  // Global / Common
  common: {
    search: string;
    searchPlaceholder: string;
    ctrlK: string;
    save: string;
    cancel: string;
    close: string;
    delete: string;
    edit: string;
    back: string;
    filter: string;
    reset: string;
    all: string;
    active: string;
    inactive: string;
    loading: string;
    systemOperational: string;
    accessGuide: string;
    allRightsReserved: string;
    themeLight: string;
    themeDark: string;
    language: string;
    hrHelp: string;
  };

  // Auth & Login
  auth: {
    systemBadge: string;
    heroTitlePrefix: string;
    heroTitleHighlight: string;
    heroDescription: string;
    featureGeofencingTitle: string;
    featureGeofencingDesc: string;
    featureApprovalTitle: string;
    featureApprovalDesc: string;
    featureContractTitle: string;
    featureContractDesc: string;
    featureSecurityTitle: string;
    featureSecurityDesc: string;
    companyEntities: string;
    welcomeTitle: string;
    welcomeSubtitle: string;
    googleSignIn: string;
    orEmail: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    forgotPassword: string;
    rememberMe: string;
    signInButton: string;
    verifying: string;
    noAccess: string;
    contactHelpdesk: string;
    helpModalTitle: string;
    helpModalSubtitle: string;
    helpModalDesc: string;
    operatingHoursLabel: string;
    operatingHoursValue: string;
    errorEmailRequired: string;
    errorPasswordRequired: string;
    loginSuccess: string;
    welcomeBack: string;
  };

  // Navigation
  nav: {
    workspace: string;
    mainMenu: string;
    dashboard: string;
    employees: string;
    timeAttendance: string;
    attendance: string;
    attendanceReport: string;
    attendanceRequests: string;
    attendanceCalendar: string;
    attendanceLocations: string;
    attendanceMap: string;
    requestsServices: string;
    requestsAndApprovals: string;
    disciplinary: string;
    news: string;
    administration: string;
    adminCompany: string;
    adminDepartment: string;
    adminApprovalHierarchy: string;
    adminUserAccounts: string;
    adminPermissionMenu: string;
    adminAuditLogs: string;
    adminReportsAnalytics: string;
    adminSystemSettings: string;
    manageAccount: string;
    employeeData: string;
    myProfile: string;
    signOut: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    common: {
      search: 'Search',
      searchPlaceholder: 'Search data, menus, employees...',
      ctrlK: 'Ctrl K',
      save: 'Save Changes',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      filter: 'Filter',
      reset: 'Reset',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      loading: 'Loading...',
      systemOperational: 'All Systems Operational',
      accessGuide: 'Access Guide',
      allRightsReserved: 'All rights reserved.',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
      language: 'Language',
      hrHelp: 'HR Helpdesk'
    },
    auth: {
      systemBadge: 'The Gesit Companies • HCM Workspace',
      heroTitlePrefix: 'Integrated HR Governance & ',
      heroTitleHighlight: 'Talent Management.',
      heroDescription: 'Real-time geofencing attendance platform, leave & overtime approvals, multi-tier workflows, and unified workforce management across The Gesit Companies.',
      featureGeofencingTitle: 'Geofencing Attendance',
      featureGeofencingDesc: 'Precise perimeter & radius validation',
      featureApprovalTitle: 'Multi-Tier Approvals',
      featureApprovalDesc: 'Structured hierarchical approval chains',
      featureContractTitle: 'Employment Contracts',
      featureContractDesc: 'Automated contract renewal notifications',
      featureSecurityTitle: 'Audit Logs & Security',
      featureSecurityDesc: 'Protected encryption powered by PostgreSQL',
      companyEntities: 'Affiliated Companies',
      welcomeTitle: 'Welcome Back',
      welcomeSubtitle: 'Sign in to access your Gesit People HCM workspace.',
      googleSignIn: 'Sign in with Google',
      orEmail: 'OR WORK EMAIL',
      emailLabel: 'Corporate Email',
      emailPlaceholder: 'name@gesit.co.id',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your account password',
      forgotPassword: 'Forgot password?',
      rememberMe: 'Remember me on this device',
      signInButton: 'Sign in to Workspace',
      verifying: 'Verifying credentials...',
      noAccess: "Don't have an account?",
      contactHelpdesk: 'Contact HR Helpdesk',
      helpModalTitle: 'Account Access Assistance',
      helpModalSubtitle: 'Gesit People & Culture Operations',
      helpModalDesc: 'If you do not have account credentials or are experiencing issues accessing your workspace, please reach out to our HR Helpdesk:',
      operatingHoursLabel: 'Operating Hours:',
      operatingHoursValue: 'Monday – Friday, 08:30 – 17:30',
      errorEmailRequired: 'Please enter your corporate email address.',
      errorPasswordRequired: 'Please enter your account password.',
      loginSuccess: 'Successfully authenticated. Redirecting...',
      welcomeBack: 'Welcome back'
    },
    nav: {
      workspace: 'Dashboard',
      mainMenu: 'Main Menu',
      dashboard: 'Dashboard',
      employees: 'Employees',
      timeAttendance: 'Attendance',
      attendance: 'Attendance',
      attendanceReport: 'Reports',
      attendanceRequests: 'Requests',
      attendanceCalendar: 'Calendar',
      attendanceLocations: 'Locations',
      attendanceMap: 'Live Map',
      requestsServices: 'Requests',
      requestsAndApprovals: 'Requests',
      disciplinary: 'Disciplinary',
      news: 'News',
      administration: 'Administration',
      adminCompany: 'Companies',
      adminDepartment: 'Departments',
      adminApprovalHierarchy: 'Hierarchy',
      adminUserAccounts: 'Accounts',
      adminPermissionMenu: 'Permissions',
      adminAuditLogs: 'Audit Logs',
      adminReportsAnalytics: 'Analytics',
      adminSystemSettings: 'Settings',
      manageAccount: 'Account',
      employeeData: 'Employees',
      myProfile: 'My Profile',
      signOut: 'Sign Out'
    }
  },
  id: {
    common: {
      search: 'Cari',
      searchPlaceholder: 'Cari data, menu, karyawan...',
      ctrlK: 'Ctrl K',
      save: 'Simpan Perubahan',
      cancel: 'Batal',
      close: 'Tutup',
      delete: 'Hapus',
      edit: 'Ubah',
      back: 'Kembali',
      filter: 'Saring',
      reset: 'Reset',
      all: 'Semua',
      active: 'Aktif',
      inactive: 'Nonaktif',
      loading: 'Memuat...',
      systemOperational: 'Sistem Operasional',
      accessGuide: 'Panduan Akses',
      allRightsReserved: 'Hak cipta dilindungi undang-undang.',
      themeLight: 'Mode Terang',
      themeDark: 'Mode Gelap',
      language: 'Bahasa',
      hrHelp: 'Bantuan HR'
    },
    auth: {
      systemBadge: 'The Gesit Companies • HCM Workspace',
      heroTitlePrefix: 'Pusat Tata Kelola SDM & ',
      heroTitleHighlight: 'Talenta Terintegrasi.',
      heroDescription: 'Platform manajemen kehadiran real-time berbasis geofencing GPS, pengajuan cuti & lembur, hierarki approval berjenjang, dan tata kelola karyawan The Gesit Companies terpadu.',
      featureGeofencingTitle: 'Presensi Geofencing',
      featureGeofencingDesc: 'Validasi perimeter & radius kantor presisi',
      featureApprovalTitle: 'Multi-Tier Approval',
      featureApprovalDesc: 'Hierarki persetujuan bertingkat terstruktur',
      featureContractTitle: 'Kontrak PKWT & PKWTT',
      featureContractDesc: 'Peringatan jatuh tempo kontrak otomatis',
      featureSecurityTitle: 'Audit Log & Keamanan',
      featureSecurityDesc: 'Enkripsi terproteksi PostgreSQL enterprise',
      companyEntities: 'Entitas Perusahaan',
      welcomeTitle: 'Selamat Datang',
      welcomeSubtitle: 'Masuk ke akun Gesit People HCM Anda.',
      googleSignIn: 'Masuk dengan Akun Google',
      orEmail: 'ATAU EMAIL PERUSAHAAN',
      emailLabel: 'Email Perusahaan',
      emailPlaceholder: 'nama@gesit.co.id',
      passwordLabel: 'Kata Sandi',
      passwordPlaceholder: 'Masukkan kata sandi Anda',
      forgotPassword: 'Lupa kata sandi?',
      rememberMe: 'Ingat email saya pada perangkat ini',
      signInButton: 'Masuk ke Workspace',
      verifying: 'Memverifikasi...',
      noAccess: 'Belum memiliki akses akun?',
      contactHelpdesk: 'Hubungi Helpdesk HR',
      helpModalTitle: 'Bantuan Akses Akun',
      helpModalSubtitle: 'Tim People & Culture Gesit',
      helpModalDesc: 'Jika Anda belum memiliki kredensial login atau mengalami kendala akses ke workspace, silakan hubungi Helpdesk HR:',
      operatingHoursLabel: 'Jam Operasional:',
      operatingHoursValue: 'Senin – Jumat, 08:30 – 17:30',
      errorEmailRequired: 'Silakan masukkan email perusahaan Anda.',
      errorPasswordRequired: 'Silakan masukkan kata sandi Anda.',
      loginSuccess: 'Berhasil masuk. Mengalihkan...',
      welcomeBack: 'Selamat datang kembali'
    },
    nav: {
      workspace: 'Dashboard',
      mainMenu: 'Menu Utama',
      dashboard: 'Dashboard',
      employees: 'Karyawan',
      timeAttendance: 'Presensi',
      attendance: 'Presensi',
      attendanceReport: 'Laporan',
      attendanceRequests: 'Request Absen',
      attendanceCalendar: 'Kalender',
      attendanceLocations: 'Lokasi Kantor',
      attendanceMap: 'Live Map',
      requestsServices: 'Pengajuan',
      requestsAndApprovals: 'Pengajuan',
      disciplinary: 'Catatan SP',
      news: 'Pengumuman',
      administration: 'Administrasi',
      adminCompany: 'Perusahaan',
      adminDepartment: 'Departemen',
      adminApprovalHierarchy: 'Hierarki',
      adminUserAccounts: 'Akun Pengguna',
      adminPermissionMenu: 'Hak Akses',
      adminAuditLogs: 'Log Aktivitas',
      adminReportsAnalytics: 'Analitik',
      adminSystemSettings: 'Pengaturan',
      manageAccount: 'Kelola Akun',
      employeeData: 'Karyawan',
      myProfile: 'Profil Saya',
      signOut: 'Keluar'
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
  isEn: boolean;
  isId: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'gesit_hcm_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'id') return saved;
      return 'en'; // Default to English for international executive appeal
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (err) {
      console.warn('Failed to persist language preference', err);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'id' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
    isEn: language === 'en',
    isId: language === 'id'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
