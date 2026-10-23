'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, UserCheck, FileText, CreditCard, RefreshCcw, Search, Plus,
  FileSpreadsheet, Eye, EyeOff, Pencil, Trash2, KeyRound, AlertTriangle,
  Building2, Briefcase, Calendar, ShieldCheck, Mail, Phone, MapPin,
  Clock, ArrowUpRight, CheckCircle2, XCircle, ArrowRightLeft,
  ChevronLeft, ChevronRight, Filter, ShieldAlert, Award, Upload, GraduationCap,
  X, Loader2, Grid, List, MoreHorizontal
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { supabase, supabaseAdmin, ensureAuthUserWithPassword } from '../lib/supabaseClient';
import { UserAccount, UserGroup, EmployeeContractHistory } from '../types';
import { uploadFileToGoogleDrive } from '../lib/googleDriveUpload';
import { useToast } from './ToastProvider';
import { exportToExcel } from '../lib/excelExport';
import { trackActivity } from '../lib/auditLogger';
import { hasPermission } from '../lib/permissions';
import { isHRAccount } from '../lib/workforce-contract';
import { formatDateDDMMYYYY, normalizeGender, normalizeReligion } from '../lib/utils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from './UserAvatar';
import { UserFormModal } from './UserFormModal';
import { DangerConfirmModal } from './DangerConfirmModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { AccessDenied } from './AccessDenied';
import { RestrictedDocViewer } from './ui/RestrictedDocViewer';
import { EmployeeImportModal } from './EmployeeImportModal';
import { EmployeeExportModal } from './EmployeeExportModal';
import { EmployeeAppointmentSKModal } from './hr/EmployeeAppointmentSKModal';

interface EmployeeDataManagerProps {
  currentUser: UserAccount | null;
  onUpdateSuccess?: () => void;
}

export const EmployeeDataManager: React.FC<EmployeeDataManagerProps> = ({
  currentUser,
  onUpdateSuccess
}) => {
  const { showToast } = useToast();

  // State
  const [employees, setEmployees] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'directory' | 'contracts' | 'payroll' | 'transfers'>('directory');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentFilter, setEmploymentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Disabled' | 'Inactive' | 'Resigned'>('Active');
  const [branchFilter, setBranchFilter] = useState<'all' | 'HQ' | 'Non HQ'>('all');
  const [contractAlertFilter, setContractAlertFilter] = useState<'all' | 'expiring' | 'expired' | 'safe'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<UserAccount | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<UserAccount | null>(null);
  const [detailActiveTab, setDetailActiveTab] = useState<'profile' | 'contract' | 'education' | 'payroll' | 'documents'>('profile');
  const [transferEmployee, setTransferEmployee] = useState<UserAccount | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<UserAccount | null>(null);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<UserAccount | null>(null);
  const [skModalOpen, setSkModalOpen] = useState(false);
  const [selectedEmployeeForSK, setSelectedEmployeeForSK] = useState<UserAccount | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showViewingNik, setShowViewingNik] = useState(false);

  // Transfer Form state
  const [transferForm, setTransferForm] = useState({
    effectiveDate: new Date().toISOString().slice(0, 10),
    company: '',
    branch: '',
    department: '',
    jobTitle: '',
    jobLevel: '',
    reason: ''
  });

  // Transfer history state
  const [transferLogs, setTransferLogs] = useState<any[]>([]);

  // Contract transition & history state
  const [transitionEmployee, setTransitionEmployee] = useState<UserAccount | null>(null);
  const [contractHistories, setContractHistories] = useState<Record<string, EmployeeContractHistory[]>>({});
  const [isTransitionProcessing, setIsTransitionProcessing] = useState(false);
  const [transitionForm, setTransitionForm] = useState({
    contractType: 'PKWT 1',
    skNumber: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    skFileUrl: '',
    notes: ''
  });
  const [uploadingTransitionSk, setUploadingTransitionSk] = useState(false);

  // Permissions
  const roleLower = (currentUser?.role || '').toLowerCase();
  const isSuperAdmin = roleLower === 'super admin' || roleLower === 'super_admin';
  const isAdminOrSuperAdmin = isSuperAdmin || roleLower === 'admin';
  const isHR = isHRAccount(currentUser) ||
    ['hr manager', 'hr staff', 'hr'].includes(roleLower) ||
    (currentUser?.groups || []).some(g =>
      ['hr', 'hrd', 'employee-data'].includes(String(g).toLowerCase().trim())
    );
  const canView = hasPermission(currentUser?.role, 'Data Karyawan', 'view') || isAdminOrSuperAdmin || isHR;
  const canManage = hasPermission(currentUser?.role, 'Data Karyawan', 'edit') ||
    hasPermission(currentUser?.role, 'Data Karyawan', 'create') ||
    isAdminOrSuperAdmin || isHR;
  const canDelete = isSuperAdmin || hasPermission(currentUser?.role, 'Data Karyawan', 'delete');

  // Filter out system technical accounts (admin system & testing accounts)
  const isTechnicalAccount = (u: any) => {
    const email = (u.email || '').toLowerCase().trim();
    const uname = (u.username || '').toLowerCase().trim();
    const fullName = (u.fullName || u.full_name || '').toLowerCase().trim();

    // Explicit system administrative accounts (leaves real employees intact)
    if (
      uname === 'admin' ||
      uname === 'administrator' ||
      uname === 'superadmin' ||
      email === 'it-admin@gesit.co.id' ||
      email === 'admin@gesit.co.id' ||
      email === 'superadmin@gesit.co.id' ||
      fullName === 'administrator' ||
      fullName === 'admin system'
    ) {
      return true;
    }

    // Exact matches for testing/dummy bot accounts
    if (/^(admin|administrator|superadmin|tester|testing|developer|demo|staging|sandbox)$/i.test(uname)) {
      return true;
    }
    if (/(test|demo|staging|sandbox)@/i.test(email)) {
      return true;
    }

    return false;
  };

  // Fetch employees
  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped: UserAccount[] = data.map((u: any) => ({
          id: u.id,
          authId: u.auth_id,
          username: u.username,
          fullName: u.full_name,
          nickname: u.nickname || '',
          email: u.email,
          role: u.role,
          groups: u.groups || [],
          status: u.status || 'Active',
          employmentStatus: u.employment_status || u.status || 'Active',
          statusEffectiveDate: u.status_effective_date,
          separationDate: u.separation_date,
          separationReason: u.separation_reason,
          company: u.company || '',
          branch: u.branch || '',
          department: u.department || '',
          phone: u.phone,
          address: u.address,
          jobTitle: u.job_title,
          jobLevel: u.job_level,
          gradeClass: u.grade_class,
          employeeCode: u.employee_code,
          joinDate: u.join_date,
          employmentType: u.employment_type || '',
          contractType: u.contract_type || '',
          contractStartDate: u.contract_start_date,
          contractEndDate: u.contract_end_date,
          pkwtNumber: u.pkwt_number,
          payrollStatus: u.payroll_status,
          bankName: u.bank_name,
          bankAccountName: u.bank_account_name,
          bankAccountNumber: u.bank_account_number,
          taxStatus: u.tax_status,
          dateOfBirth: u.date_of_birth,
          birthPlace: u.birth_place,
          gender: normalizeGender(u.gender),
          maritalStatus: u.marital_status,
          religion: normalizeReligion(u.religion),
          bloodType: u.blood_type,
          nik: u.nik,
          npwp: u.npwp,
          residentialAddress: u.residential_address,
          bpjsTkNumber: u.bpjs_tk_number,
          bpjsHealthNumber: u.bpjs_health_number,
          avatarUrl: u.avatar_url,
          lastLogin: u.last_login || 'Never',
          // Dokumen Google Drive
          ktpFileUrl: u.ktp_file_url,
          ijazahFileUrl: u.ijazah_file_url,
          skFileUrl: u.sk_file_url,
          bpjsFileUrl: u.bpjs_file_url,
          // Pendidikan
          lastEducation: u.last_education,
          institutionName: u.institution_name,
          major: u.major,
          graduationYear: u.graduation_year,
          educationStartYear: u.education_start_year,
          gpa: u.gpa,
          diplomaNumber: u.diploma_number,
          // Jadwal & Shift Kerja
          scheduleId: u.schedule_id,
          workScheduleType: u.work_schedule_type || 'default',
          customWorkStart: u.custom_work_start,
          customWorkEnd: u.custom_work_end,
          customGracePeriodMinutes: u.custom_grace_period_minutes
        }));
        setEmployees(mapped);
      }

      // Try fetching transfer history if available
      try {
        const { data: histData } = await supabase
          .from('employee_transfer_history')
          .select('*')
          .order('effective_date', { ascending: false })
          .limit(50);
        if (histData) setTransferLogs(histData);
      } catch {
        // Table may not exist yet, safely fallback
      }

      // Try fetching contract history timeline
      try {
        const { data: contractData } = await supabase
          .from('employee_contract_history')
          .select('*')
          .order('contract_start_date', { ascending: false });
        if (contractData) {
          const map: Record<string, EmployeeContractHistory[]> = {};
          contractData.forEach((row: any) => {
            const key = String(row.employee_id);
            if (!map[key]) map[key] = [];
            map[key].push({
              id: row.id,
              employeeId: row.employee_id,
              contractType: row.contract_type,
              skNumber: row.sk_number,
              contractStartDate: row.contract_start_date,
              contractEndDate: row.contract_end_date,
              skFileUrl: row.sk_file_url,
              notes: row.notes,
              createdBy: row.created_by,
              createdAt: row.created_at
            });
          });
          setContractHistories(map);
        }
      } catch {
        // Table may not exist yet, safely fallback
      }
    } catch (err: any) {
      console.error('Fetch employees error:', err);
      showToast('Gagal memuat data employee: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Compute contract status / days remaining
  const getContractMeta = (emp: UserAccount) => {
    // 1. Cek status kepegawaian: jika Resigned / Disabled / Inactive / Non-Aktif, jangan hitung sisa hari aktif
    const empStatus = (emp.employmentStatus || emp.status || 'Active').toLowerCase();
    const isNonActive = empStatus === 'resigned' || empStatus === 'disabled' || empStatus === 'inactive' || empStatus === 'non-active';

    if (isNonActive) {
      return {
        status: 'resigned',
        label: emp.employmentStatus === 'Resigned' ? 'Resigned' : 'Non-Aktif',
        daysLeft: null,
        daysRemaining: null,
        isExpiring: false,
        isExpired: false
      };
    }

    const raw = `${emp.contractType || ''} ${emp.employmentType || ''}`.toLowerCase();
    const isTetap = raw.includes('tetap') || raw.includes('pkwtt') || raw.includes('permanent');

    if (isTetap) {
      return { status: 'permanent', label: 'Tetap (PKWTT)', daysLeft: null, daysRemaining: null, isExpiring: false, isExpired: false };
    }

    if (!emp.contractEndDate) {
      if (raw.includes('probation') || raw.includes('percobaan')) {
        return { status: 'probation', label: 'Probation (3 Bulan)', daysLeft: null, daysRemaining: null, isExpiring: false, isExpired: false };
      }
      return { status: 'permanent', label: 'Tetap (PKWTT)', daysLeft: null, daysRemaining: null, isExpiring: false, isExpired: false };
    }

    const end = new Date(`${emp.contractEndDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'expired', label: `Expired (${Math.abs(diffDays)} hari lalu)`, daysLeft: diffDays, daysRemaining: diffDays, isExpiring: false, isExpired: true };
    } else if (diffDays <= 30) {
      return { status: 'expiring', label: `Sisa ${diffDays} hari`, daysLeft: diffDays, daysRemaining: diffDays, isExpiring: true, isExpired: false };
    } else {
      return { status: 'active', label: `Aktif (${diffDays} hari lagi)`, daysLeft: diffDays, daysRemaining: diffDays, isExpiring: false, isExpired: false };
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    // Exclude technical admin accounts to only count real employees
    const realEmployees = employees.filter(e => !isTechnicalAccount(e));
    const total = realEmployees.length;
    const activeEmployees = realEmployees.filter(e => (e.employmentStatus || e.status || 'Active').toLowerCase() === 'active');

    // HQ vs Non-HQ Breakdown among active employees
    let hqCount = 0;
    let nonHqCount = 0;

    activeEmployees.forEach(e => {
      const b = (e.branch || '').toLowerCase().trim();
      if (b.includes('non') || b.includes('site') || b.includes('cabang') || b.includes('field') || b.includes('proyek')) {
        nonHqCount++;
      } else {
        hqCount++;
      }
    });

    const pkwtList = activeEmployees.filter(e => {
      const t = `${e.contractType || ''} ${e.employmentType || ''}`.toLowerCase();
      return (t.includes('pkwt') || t.includes('contract')) && !t.includes('pkwtt');
    });
    const pkwttList = activeEmployees.filter(e => {
      const t = `${e.contractType || ''} ${e.employmentType || ''}`.toLowerCase();
      return t.includes('tetap') || t.includes('pkwtt') || t.includes('permanent');
    });
    const probationList = activeEmployees.filter(e => {
      const t = `${e.contractType || ''} ${e.employmentType || ''}`.toLowerCase();
      return t.includes('probation') || t.includes('percobaan');
    });

    let expiringCount = 0;
    let expiredCount = 0;

    pkwtList.forEach(e => {
      const meta = getContractMeta(e);
      if (meta.isExpiring) expiringCount++;
      if (meta.isExpired) expiredCount++;
    });

    return {
      total: total,
      active: activeEmployees.length,
      hq: hqCount,
      nonHq: nonHqCount,
      pkwt: pkwtList.length,
      pkwtt: pkwttList.length,
      probation: probationList.length,
      expiring: expiringCount,
      expired: expiredCount
    };
  }, [employees]);

  // Unique dropdown options
  const companies = useMemo(() => [...new Set(employees.map(e => e.company).filter(Boolean))].sort(), [employees]);
  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))].sort(), [employees]);
  const employmentTypes = ['PKWTT', 'PKWT', 'Probation', 'Magang'];

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Exclude technical accounts
      if (isTechnicalAccount(emp)) return false;

      // Search term
      const query = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (emp.fullName || '').toLowerCase().includes(query) ||
        (emp.nickname || '').toLowerCase().includes(query) ||
        (emp.employeeCode || '').toLowerCase().includes(query) ||
        (emp.email || '').toLowerCase().includes(query) ||
        (emp.department || '').toLowerCase().includes(query) ||
        (emp.company || '').toLowerCase().includes(query) ||
        (emp.jobTitle || '').toLowerCase().includes(query) ||
        (emp.branch || '').toLowerCase().includes(query) ||
        (emp.pkwtNumber || '').toLowerCase().includes(query);

      // Filters
      const matchesCompany = companyFilter ? emp.company === companyFilter : true;
      const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
      
      let matchesEmployment = true;
      if (employmentFilter) {
        const t = `${emp.contractType || ''} ${emp.employmentType || ''}`.toLowerCase();
        if (employmentFilter === 'PKWTT') {
          matchesEmployment = t.includes('pkwtt') || t.includes('tetap') || t.includes('permanent');
        } else if (employmentFilter === 'PKWT') {
          matchesEmployment = (t.includes('pkwt') || t.includes('kontrak')) && !t.includes('pkwtt');
        } else if (employmentFilter === 'Probation') {
          matchesEmployment = t.includes('probation') || t.includes('percobaan');
        } else if (employmentFilter === 'Magang') {
          matchesEmployment = t.includes('magang') || t.includes('intern');
        } else {
          matchesEmployment = emp.contractType === employmentFilter || emp.employmentType === employmentFilter;
        }
      }

      const currentStatus = (emp.employmentStatus || emp.status || 'Active');
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const curLower = currentStatus.toLowerCase();
        const filterLower = statusFilter.toLowerCase();
        if (filterLower === 'resigned') {
          matchesStatus = curLower === 'resigned';
        } else if (filterLower === 'disabled') {
          matchesStatus = curLower === 'disabled' || curLower === 'inactive' || curLower === 'resigned';
        } else if (filterLower === 'active') {
          matchesStatus = curLower === 'active';
        } else {
          matchesStatus = curLower === filterLower;
        }
      }

      // Branch filter (HQ vs Non-HQ)
      let matchesBranch = true;
      if (branchFilter !== 'all') {
        const b = (emp.branch || '').toLowerCase().trim();
        const isNonHq = b.includes('non') || b.includes('site') || b.includes('cabang') || b.includes('field') || b.includes('proyek');
        if (branchFilter === 'Non HQ') {
          matchesBranch = isNonHq;
        } else if (branchFilter === 'HQ') {
          matchesBranch = !isNonHq;
        }
      }

      // Contract alert filter
      let matchesContractAlert = true;
      if (contractAlertFilter !== 'all') {
        const meta = getContractMeta(emp);
        if (contractAlertFilter === 'expiring') matchesContractAlert = meta.isExpiring;
        if (contractAlertFilter === 'expired') matchesContractAlert = meta.isExpired;
        if (contractAlertFilter === 'safe') matchesContractAlert = !meta.isExpiring && !meta.isExpired && meta.status === 'active';
      }

      return matchesSearch && matchesCompany && matchesDept && matchesEmployment && matchesStatus && matchesBranch && matchesContractAlert;
    });
  }, [employees, searchTerm, companyFilter, departmentFilter, employmentFilter, statusFilter, branchFilter, contractAlertFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmployees.slice(start, start + itemsPerPage);
  }, [filteredEmployees, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter, departmentFilter, employmentFilter, statusFilter, branchFilter, contractAlertFilter, activeTab]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      showToast('Tidak ada data untuk diekspor', 'error');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (activeTab === 'contracts') {
      const data = filteredEmployees.map(e => {
        const meta = getContractMeta(e);
        return {
          'Employee ID': e.employeeCode || '-',
          'Nama Karyawan': e.fullName,
          'Perusahaan': e.company || '-',
          'Departemen': e.department || '-',
          'Jabatan': e.jobTitle || '-',
          'Status Kerja': e.employmentType || '-',
          'Nomor PKWT': e.pkwtNumber || '-',
          'Tipe Kontrak': e.contractType || '-',
          'Tanggal Mulai Kontrak': e.contractStartDate || '-',
          'Tanggal Berakhir Kontrak': e.contractEndDate || '-',
          'Status Masa Kontrak': meta.label
        };
      });
      exportToExcel(data, `GESIT-KONTRAK-PKWT-${todayStr}`);
    } else if (activeTab === 'payroll') {
      const data = filteredEmployees.map(e => ({
        'Employee ID': e.employeeCode || '-',
        'Nama Karyawan': e.fullName,
        'Departemen': e.department || '-',
        'Jabatan': e.jobTitle || '-',
        'Status Payroll': e.payrollStatus || 'Aktif',
        'Bank': e.bankName || '-',
        'Nomor Rekening': e.bankAccountNumber || '-',
        'Nama Pemilik Rekening': e.bankAccountName || '-',
        'NPWP': e.npwp || '-',
        'Status Pajak (PTKP)': e.taxStatus || '-',
        'BPJS Ketenagakerjaan': e.bpjsTkNumber || '-',
        'BPJS Kesehatan': e.bpjsHealthNumber || '-'
      }));
      exportToExcel(data, `GESIT-PAYROLL-DATA-${todayStr}`);
    } else {
      const data = filteredEmployees.map(e => ({
        'Employee ID': e.employeeCode || '-',
        'Nama Lengkap': e.fullName,
        'Nama Panggilan': e.nickname || '-',
        'Email': e.email,
        'No. Telepon': e.phone || '-',
        'Perusahaan': e.company || '-',
        'Cabang': e.branch || '-',
        'Departemen': e.department || '-',
        'Jabatan': e.jobTitle || '-',
        'Level': e.jobLevel || '-',
        'Status Kepegawaian': e.contractType || e.employmentType || 'PKWTT',
        'Status Akun': e.status || 'Active',
        'Tanggal Bergabung': e.joinDate || '-'
      }));
      exportToExcel(data, `GESIT-MASTER-EMPLOYEE-${todayStr}`);
    }
  };

  // Reset Filters
  const resetFilters = () => {
    setSearchTerm('');
    setCompanyFilter('');
    setDepartmentFilter('');
    setEmploymentFilter('');
    setStatusFilter('Active');
    setBranchFilter('all');
    setContractAlertFilter('all');
  };

  // Open contract transition modal
  const openContractTransitionModal = (emp: UserAccount) => {
    setTransitionEmployee(emp);
    const currentType = (emp.contractType || emp.employmentType || '').toUpperCase();
    let suggestedNext = 'PKWT 1';
    if (currentType.includes('PROBATION') || currentType.includes('PERCOBAAN')) {
      suggestedNext = 'PKWT 1';
    } else if (currentType.includes('PKWT 1') || currentType === 'PKWT') {
      suggestedNext = 'PKWT 2';
    } else if (currentType.includes('PKWT 2') || currentType.includes('KONTRAK')) {
      suggestedNext = 'PKWTT';
    } else if (currentType.includes('PKWTT') || currentType.includes('TETAP')) {
      suggestedNext = 'PKWTT';
    }

    let nextStart = new Date().toISOString().slice(0, 10);
    if (emp.contractEndDate) {
      try {
        const d = new Date(emp.contractEndDate);
        d.setDate(d.getDate() + 1);
        nextStart = d.toISOString().slice(0, 10);
      } catch (_) {}
    }

    setTransitionForm({
      contractType: suggestedNext,
      skNumber: '',
      startDate: nextStart,
      endDate: suggestedNext === 'PKWTT' ? '' : '',
      skFileUrl: '',
      notes: ''
    });
  };

  // Upload transition SK file directly to Google Drive
  const handleUploadTransitionSK = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTransitionSk(true);
    try {
      const res = await uploadFileToGoogleDrive(file, {
        category: 'sk_karyawan',
        visibility: 'private',
        targetEmail: transitionEmployee?.email,
        employeeName: transitionEmployee?.fullName,
        employeeCode: transitionEmployee?.employeeCode,
        folderType: 'employee_docs'
      });
      if (res.success && res.fileUrl) {
        setTransitionForm(f => ({ ...f, skFileUrl: res.fileUrl }));
        showToast('✓ File SK berhasil diunggah ke Google Drive (Restricted)', 'success');
      } else {
        throw new Error(res.error || 'Gagal upload file');
      }
    } catch (err: any) {
      showToast('Gagal mengunggah file SK: ' + err.message, 'error');
    } finally {
      setUploadingTransitionSk(false);
    }
  };

  // Execute contract transition and save to timeline + user_accounts
  const executeContractTransition = async () => {
    if (!transitionEmployee) return;
    if (!transitionForm.startDate) {
      showToast('Tanggal mulai berlaku SK wajib diisi', 'error');
      return;
    }
    const isTetap = transitionForm.contractType.toUpperCase().includes('PKWTT') || transitionForm.contractType.toUpperCase().includes('TETAP');
    if (!isTetap && !transitionForm.endDate) {
      showToast('Tanggal selesai kontrak wajib diisi untuk kontrak berjangka / PKWT / Probation', 'error');
      return;
    }

    setIsTransitionProcessing(true);
    try {
      const historyPayload = {
        employee_id: transitionEmployee.id,
        contract_type: transitionForm.contractType,
        sk_number: transitionForm.skNumber || null,
        contract_start_date: transitionForm.startDate,
        contract_end_date: isTetap ? null : transitionForm.endDate,
        sk_file_url: transitionForm.skFileUrl || null,
        notes: transitionForm.notes || null,
        created_by: currentUser?.fullName || 'HR Admin'
      };

      // 1. Try insert into employee_contract_history in Supabase
      try {
        await supabase.from('employee_contract_history').insert([historyPayload]);
      } catch (e) {
        console.warn('Fallback saving contract history locally:', e);
      }

      // Also update local state map
      const empIdStr = String(transitionEmployee.id);
      const newHistoryItem: EmployeeContractHistory = {
        id: Date.now(),
        employeeId: transitionEmployee.id,
        contractType: transitionForm.contractType,
        skNumber: transitionForm.skNumber,
        contractStartDate: transitionForm.startDate,
        contractEndDate: isTetap ? undefined : transitionForm.endDate,
        skFileUrl: transitionForm.skFileUrl,
        notes: transitionForm.notes,
        createdBy: currentUser?.fullName || 'HR Admin',
        createdAt: new Date().toISOString()
      };

      setContractHistories(prev => ({
        ...prev,
        [empIdStr]: [newHistoryItem, ...(prev[empIdStr] || [])]
      }));

      // 2. Update user_accounts table
      const updatePayload: any = {
        contract_type: transitionForm.contractType,
        employment_type: transitionForm.contractType,
        contract_start_date: transitionForm.startDate,
        contract_end_date: isTetap ? null : transitionForm.endDate,
        pkwt_number: transitionForm.skNumber || transitionEmployee.pkwtNumber,
        sk_file_url: transitionForm.skFileUrl || transitionEmployee.skFileUrl
      };

      const { error: updateError } = await supabase
        .from('user_accounts')
        .update(updatePayload)
        .eq('id', transitionEmployee.id);

      if (updateError) throw updateError;

      // 3. Update local employee lists
      setEmployees(prev => prev.map(e => e.id === transitionEmployee.id ? { ...e, ...updatePayload } : e));
      if (viewingEmployee?.id === transitionEmployee.id) {
        setViewingEmployee(prev => prev ? { ...prev, ...updatePayload } : null);
      }

      showToast(`Status kontrak ${transitionEmployee.fullName} berhasil diperbarui menjadi ${transitionForm.contractType}!`, 'success');
      setTransitionEmployee(null);
    } catch (err: any) {
      showToast('Gagal memperbarui status kontrak: ' + (err.message || 'Error'), 'error');
    } finally {
      setIsTransitionProcessing(false);
    }
  };

  // Transfer actions
  const openTransferModal = (emp: UserAccount) => {
    setTransferEmployee(emp);
    setTransferForm({
      effectiveDate: new Date().toISOString().slice(0, 10),
      company: emp.company || '',
      branch: emp.branch || '',
      department: emp.department || '',
      jobTitle: emp.jobTitle || '',
      jobLevel: emp.jobLevel || '',
      reason: ''
    });
  };

  const handleSaveTransfer = async () => {
    if (!transferEmployee || !transferForm.effectiveDate || !transferForm.reason.trim()) {
      showToast('Tanggal efektif dan alasan transfer wajib diisi', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Audit to employee_transfer_history if exists
      const historyRecord = {
        employee_id: transferEmployee.id,
        employee_code: transferEmployee.employeeCode || null,
        effective_date: transferForm.effectiveDate,
        old_company: transferEmployee.company || null,
        old_branch: transferEmployee.branch || null,
        old_department: transferEmployee.department || null,
        old_job_title: transferEmployee.jobTitle || null,
        old_job_level: transferEmployee.jobLevel || null,
        new_company: transferForm.company || null,
        new_branch: transferForm.branch || null,
        new_department: transferForm.department || null,
        new_job_title: transferForm.jobTitle || null,
        new_job_level: transferForm.jobLevel || null,
        reason: transferForm.reason.trim(),
        transferred_by: currentUser?.id || null
      };

      try {
        await supabase.from('employee_transfer_history').insert(historyRecord);
      } catch {
        // Fallback gracefully
      }

      // 2. Update user_accounts
      const { error: updateError } = await supabase
        .from('user_accounts')
        .update({
          company: transferForm.company || null,
          branch: transferForm.branch || null,
          department: transferForm.department || null,
          job_title: transferForm.jobTitle || null,
          job_level: transferForm.jobLevel || null
        })
        .eq('id', transferEmployee.id);

      if (updateError) throw updateError;

      await trackActivity(
        currentUser?.fullName || 'HR',
        currentUser?.role || 'Admin',
        'Transfer Employee',
        'EmployeeDataManager',
        `Transfer ${transferEmployee.fullName} (${transferEmployee.employeeCode || '-'}) ke ${transferForm.company} - ${transferForm.department}`
      );

      showToast(`Transfer untuk ${transferEmployee.fullName} berhasil disimpan`, 'success');
      setTransferEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      console.error('Transfer error:', err);
      showToast('Gagal memproses transfer: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save / Update Employee Form
  const handleSaveEmployee = async (userData: Partial<UserAccount>) => {
    const emailTrim = (userData.email || '').trim().toLowerCase();
    const username = userData.username || emailTrim.split('@')[0] || '';
    const passwordTrim = (userData as any).password?.trim();

    const payload: any = {
      username,
      full_name: userData.fullName,
      nickname: userData.nickname || null,
      email: emailTrim,
      role: userData.role || 'User',
      groups: userData.groups || ['general_user'],
      status: userData.status || 'Active',
      employment_status: userData.employmentStatus || 'Active',
      status_effective_date: userData.statusEffectiveDate || null,
      separation_date: userData.separationDate || null,
      separation_reason: userData.separationReason || null,
      company: userData.company || 'GESIT',
      branch: userData.branch || null,
      department: userData.department || 'Other',
      phone: userData.phone || null,
      address: userData.address || null,
      job_title: userData.jobTitle || null,
      employee_code: userData.employeeCode || null,
      join_date: userData.joinDate || null,
      job_level: userData.jobLevel || null,
      employment_type: userData.employmentType || null,
      contract_type: userData.contractType || null,
      contract_start_date: userData.contractStartDate || null,
      contract_end_date: userData.contractEndDate || null,
      pkwt_number: userData.pkwtNumber || null,
      payroll_status: userData.payrollStatus || null,
      bank_name: userData.bankName || null,
      bank_account_name: userData.bankAccountName || null,
      bank_account_number: userData.bankAccountNumber || null,
      tax_status: userData.taxStatus || null,
      date_of_birth: userData.dateOfBirth || null,
      birth_place: userData.birthPlace || null,
      gender: userData.gender || null,
      marital_status: userData.maritalStatus || null,
      religion: userData.religion || null,
      blood_type: userData.bloodType || null,
      nik: userData.nik !== undefined ? (userData.nik ? String(userData.nik).trim() : null) : null,
      npwp: userData.npwp || null,
      passport_number: userData.passportNumber || null,
      residential_address: userData.residentialAddress || null,
      bpjs_tk_number: userData.bpjsTkNumber || null,
      bpjs_health_number: userData.bpjsHealthNumber || null,
      grade_class: userData.gradeClass || null,
      supervisor_id: userData.supervisorId || null,
      manager_id: userData.managerId || null,
      vp_id: userData.vpId || null,
      attendance_supervisor_id: userData.attendanceSupervisorId || null,
      attendance_hr_id: userData.attendanceHrId || null,
      attendance_manager_id: userData.attendanceManagerId || null,
      attendance_vp_id: userData.attendanceVpId || null,
      avatar_url: userData.avatarUrl || null,
      e_sign_url: userData.eSignUrl || null,
      // Dokumen Google Drive
      ktp_file_url: userData.ktpFileUrl || null,
      ijazah_file_url: userData.ijazahFileUrl || null,
      sk_file_url: userData.skFileUrl || null,
      bpjs_file_url: userData.bpjsFileUrl || null,
      // Data Pendidikan
      last_education: userData.lastEducation || null,
      institution_name: userData.institutionName || null,
      major: userData.major || null,
      graduation_year: userData.graduationYear || null,
      education_start_year: userData.educationStartYear || null,
      gpa: userData.gpa || null,
      diploma_number: userData.diplomaNumber || null,
      // Jadwal & Shift Kerja
      schedule_id: userData.scheduleId || null,
      work_schedule_type: userData.workScheduleType || 'default',
      custom_work_start: userData.customWorkStart || null,
      custom_work_end: userData.customWorkEnd || null,
      custom_grace_period_minutes: userData.customGracePeriodMinutes || null
    };

    try {
      if (passwordTrim && passwordTrim.length < 6) {
        showToast('Password minimal 6 karakter', 'error');
        return;
      }

      const authUserId = await ensureAuthUserWithPassword(
        emailTrim,
        passwordTrim,
        userData.fullName,
        editingEmployee?.id
      );

      // Eksekusi penyimpanan dengan mekanisme self-healing (otomatis retry tanpa kolom yang belum ada di DB)
      const executeSave = async (dataPayload: any, retries = 8): Promise<void> => {
        if (authUserId) dataPayload.auth_id = authUserId;
        const query = editingEmployee
          ? supabase.from('user_accounts').update(dataPayload).eq('id', editingEmployee.id)
          : supabase.from('user_accounts').insert([dataPayload]);

        const { error } = await query;
        if (error) {
          const match = error.message?.match(/Could not find the '([^']+)' column of 'user_accounts'/i);
          if (match && match[1] && retries > 0) {
            const missingCol = match[1];
            console.warn(`Kolom '${missingCol}' belum ada di tabel user_accounts. Menyimpan kembali tanpa kolom tersebut...`);
            const cleaned = { ...dataPayload };
            delete cleaned[missingCol];
            return executeSave(cleaned, retries - 1);
          }
          throw error;
        }
      };

      await executeSave(payload);
      showToast(editingEmployee ? `Data ${userData.fullName} berhasil diperbarui` : `Employee ${userData.fullName} berhasil didaftarkan`, 'success');

      setIsFormModalOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      console.error('Save employee error:', err);
      showToast('Gagal menyimpan employee: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Reset Password Handler
  const handleResetPassword = async (user: UserAccount, newPassword: string): Promise<boolean> => {
    try {
      const authUserId = await ensureAuthUserWithPassword(
        user.email,
        newPassword,
        user.fullName,
        user.id
      );
      if (!authUserId) {
        showToast('Gagal mereset password untuk ' + user.email, 'error');
        return false;
      }
      await trackActivity(
        currentUser?.fullName || 'Admin',
        currentUser?.role || 'Admin',
        'Reset Password',
        'EmployeeDataManager',
        `Reset password untuk ${user.email} (${user.fullName})`
      );
      showToast(`Password ${user.fullName} berhasil direset`, 'success');
      return true;
    } catch (err: any) {
      showToast('Gagal mereset password: ' + (err.message || 'Unknown error'), 'error');
      return false;
    }
  };

  // Delete / Deactivate Employee
  const handleDeleteEmployee = async () => {
    if (!deleteEmployee) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', deleteEmployee.id);

      if (error) throw error;

      showToast(`Employee ${deleteEmployee.fullName} berhasil dihapus`, 'success');
      setDeleteEmployee(null);
      await fetchEmployees();
      onUpdateSuccess?.();
    } catch (err: any) {
      showToast('Gagal menghapus: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // If user does not have permission to view Employee Data, show detailed access restricted page
  if (!canView) {
    return (
      <AccessDenied
        moduleName="Data Karyawan"
        description="Modul ini berisi data kepegawaian dan kontrak PKWT perusahaan yang bersifat rahasia."
        requiredAccess="Administrator, Tim HR, atau izin 'Data Karyawan'"
        currentUser={currentUser}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* PAGE HEADER */}
      <PageHeader
        title="Data Karyawan"
        description="Master data karyawan, riwayat kontrak, status PKWT, dan mutasi penempatan"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsExportModalOpen(true)}
            className="text-xs font-semibold"
          >
            <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Export Excel
          </Button>
          {canManage && (
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
              className="text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Upload className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Import Excel
            </Button>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => fetchEmployees()}
            title="Refresh Data"
          >
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          {canManage && (
            <Button
              onClick={() => {
                setEditingEmployee(null);
                setIsFormModalOpen(true);
              }}
              className="text-xs font-bold whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Tambah Employee
            </Button>
          )}
        </div>
      </PageHeader>

      {/* NEXORA STYLE KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Karyawan Aktif & HQ / Non-HQ Info */}
        <Card
          className="relative overflow-hidden bg-card/80 backdrop-blur-sm bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
          onClick={() => {
            setActiveTab('directory');
            setStatusFilter('Active');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Karyawan Aktif
            </CardTitle>

            {/* Gradient Squircle Icon Box */}
            <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/60 p-0.5 shadow-xs group-hover:scale-105 transition-transform">
              <div className="flex size-full items-center justify-center rounded-lg text-white bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-400 dark:to-blue-500 shadow-sm">
                <Users className="size-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{stats.active}</span>
              <span className="text-xs text-muted-foreground font-medium">dari {stats.total} terdaftar</span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBranchFilter(prev => prev === 'HQ' ? 'all' : 'HQ');
                }}
                className="transition-transform hover:scale-105 cursor-pointer"
                title="Klik untuk filter Karyawan HQ"
              >
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-bold transition-all ${
                    branchFilter === 'HQ'
                      ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300'
                  }`}
                >
                  HQ: {stats.hq}
                </Badge>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBranchFilter(prev => prev === 'Non HQ' ? 'all' : 'Non HQ');
                }}
                className="transition-transform hover:scale-105 cursor-pointer"
                title="Klik untuk filter Karyawan Non-HQ"
              >
                <Badge
                  variant="outline"
                  className={`rounded-md px-2 py-0.5 text-xs font-bold transition-all ${
                    branchFilter === 'Non HQ'
                      ? 'border-purple-500 bg-purple-600 text-white shadow-xs'
                      : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900/60 dark:bg-purple-950/50 dark:text-purple-300'
                  }`}
                >
                  Non-HQ: {stats.nonHq}
                </Badge>
              </button>

              {branchFilter !== 'all' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBranchFilter('all');
                  }}
                  className="text-[10px] text-rose-500 hover:underline font-semibold ml-1 cursor-pointer"
                >
                  Reset Penempatan
                </button>
              )}

              <span className="text-[11px] text-muted-foreground ml-auto font-medium">
                {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}% aktif
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Karyawan PKWT (Kontrak) */}
        <Card
          className="relative overflow-hidden bg-card/80 backdrop-blur-sm bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
          onClick={() => {
            setActiveTab('directory');
            setEmploymentFilter('PKWT');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Karyawan PKWT
            </CardTitle>

            <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/60 p-0.5 shadow-xs group-hover:scale-105 transition-transform">
              <div className="flex size-full items-center justify-center rounded-lg text-white bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-400 dark:to-orange-500 shadow-sm">
                <FileText className="size-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{stats.pkwt}</span>
              <span className="text-xs text-muted-foreground font-medium">karyawan kontrak</span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <Badge
                variant="outline"
                className="rounded-md px-2 py-0.5 text-xs font-bold border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400"
              >
                {stats.active > 0 ? Math.round((stats.pkwt / stats.active) * 100) : 0}% tenaga kerja
              </Badge>
              <span className="text-[11px] text-muted-foreground truncate">
                {stats.expiring > 0 ? `${stats.expiring} perlu perpanjang · ${Math.max(0, stats.pkwt - stats.expiring)} aman` : 'Semua kontrak aman'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Karyawan PKWTT (Tetap) */}
        <Card
          className="relative overflow-hidden bg-card/80 backdrop-blur-sm bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
          onClick={() => {
            setActiveTab('directory');
            setEmploymentFilter('PKWTT');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Karyawan PKWTT
            </CardTitle>

            <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/60 p-0.5 shadow-xs group-hover:scale-105 transition-transform">
              <div className="flex size-full items-center justify-center rounded-lg text-white bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-400 dark:to-teal-500 shadow-sm">
                <UserCheck className="size-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black tracking-tight text-foreground">{stats.pkwtt}</span>
              <span className="text-xs text-muted-foreground font-medium">karyawan tetap</span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <Badge
                variant="outline"
                className="rounded-md px-2 py-0.5 text-xs font-bold border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400"
              >
                {stats.active > 0 ? Math.round((stats.pkwtt / stats.active) * 100) : 0}% tenaga kerja
              </Badge>
              <span className="text-[11px] text-muted-foreground truncate">
                PKWTT Tetap (Permanent)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Kontrak Jatuh Tempo (≤ 60 hari) */}
        <Card
          className={`relative overflow-hidden bg-card/80 backdrop-blur-sm bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] border border-border/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group ${
            stats.expiring > 0 ? 'border-rose-300 dark:border-rose-800' : ''
          }`}
          onClick={() => {
            setActiveTab('contracts');
            setEmploymentFilter('');
            setBranchFilter('all');
            setContractAlertFilter(stats.expiring > 0 ? 'expiring' : 'all');
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kontrak Jatuh Tempo
            </CardTitle>

            <div className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-background/60 p-0.5 shadow-xs group-hover:scale-105 transition-transform">
              <div className={`flex size-full items-center justify-center rounded-lg text-white shadow-sm ${
                stats.expiring > 0
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 animate-pulse'
                  : 'bg-gradient-to-br from-slate-500 to-zinc-600'
              }`}>
                <Clock className="size-5" />
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black tracking-tight ${
                stats.expiring > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              }`}>
                {stats.expiring}
              </span>
              <span className="text-xs text-muted-foreground font-medium">kontrak</span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs">
              <Badge
                variant="outline"
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  stats.expiring > 0
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-400'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-400'
                }`}
              >
                {stats.expiring > 0 ? '< 30 Hari' : 'Status Aman'}
              </Badge>
              <span className="text-[11px] text-muted-foreground truncate">
                {stats.expiring > 0 ? '1 dari 4 PKWT perlu perpanjang' : 'Tidak ada jatuh tempo'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VIEW TABS & TOOLBAR */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* TABS SELECTOR */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full sm:w-auto">
              <TabsList className="bg-muted/60 p-1 rounded-xl">
                <TabsTrigger value="directory" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <Users size={14} /> Master Data
                </TabsTrigger>
                <TabsTrigger value="contracts" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <FileText size={14} /> Kontrak & PKWT
                  {stats.expiring > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                      {stats.expiring}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="payroll" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <CreditCard size={14} /> Rekening & Pajak
                </TabsTrigger>
                <TabsTrigger value="transfers" className="text-xs font-semibold gap-1.5 px-3 py-1.5">
                  <ArrowRightLeft size={14} /> Riwayat Transfer
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Quick Count Info & View Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
                Menampilkan <b>{filteredEmployees.length}</b> dari <b>{employees.length}</b> employee
              </span>

              {activeTab === 'directory' && (
                <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/60">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-background shadow-2xs text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <List size={13} />
                    <span className="hidden md:inline">Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-background shadow-2xs text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Tampilan Kartu"
                  >
                    <Grid size={13} />
                    <span className="hidden md:inline">Kartu</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* FILTERS & SEARCH ROW */}
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Cari nama, NIK, jabatan, email, departemen..."
                className="pl-10 text-xs bg-background/50 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Company */}
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Filter Department */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Filter Employment Type */}
            <select
              value={employmentFilter}
              onChange={(e) => setEmploymentFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="">Semua Status Kerja</option>
              {employmentTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>

            {/* Filter Status Akun (Aktif / Resign / Non-Aktif) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            >
              <option value="Active">Karyawan Aktif</option>
              <option value="all">Semua Status</option>
              <option value="Resigned">Karyawan Resign</option>
              <option value="Disabled">Karyawan Non-Aktif</option>
            </select>

            {/* Filter Contract Alert (Visible in contracts tab) */}
            {activeTab === 'contracts' && (
              <select
                value={contractAlertFilter}
                onChange={(e) => setContractAlertFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
              >
                <option value="all">Semua Masa Kontrak</option>
                <option value="expiring">Perlu Perpanjangan &lt; 30 hari ({stats.expiring})</option>
                <option value="safe">Masa Kontrak Aman ({Math.max(0, stats.pkwt - stats.expiring - stats.expired)})</option>
                <option value="expired">Telah Berakhir ({stats.expired})</option>
              </select>
            )}

            {/* Reset Filters button */}
            {(searchTerm || companyFilter || departmentFilter || employmentFilter || statusFilter !== 'Active' || contractAlertFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 h-9"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DATA TABLE CONTAINER */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {activeTab === 'directory' && viewMode === 'grid' ? (
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="rounded-xl border border-border/70 p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-14 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : paginatedEmployees.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Users size={32} className="text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Tidak ada data employee ditemukan</p>
                <p className="text-xs text-muted-foreground">Silakan sesuaikan filter atau kata kunci pencarian Anda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedEmployees.map((emp) => {
                  const statusRaw = (emp.employmentStatus || emp.status || 'Active').toLowerCase();
                  const isActive = statusRaw === 'active';
                  const isResigned = statusRaw === 'resigned';
                  const isMuted = !isActive;

                  const contractStr = `${emp.contractType || ''} ${emp.employmentType || ''}`.toLowerCase();
                  const isProbation = contractStr.includes('probation') || contractStr.includes('percobaan');
                  const isIntern = contractStr.includes('magang') || contractStr.includes('intern');
                  const isPermanent = contractStr.includes('pkwtt') || contractStr.includes('tetap') || contractStr.includes('permanent');

                  return (
                    <Card
                      key={emp.id}
                      className={`relative gap-0 border-border/70 p-0 shadow-2xs transition-all duration-200 hover:border-border hover:shadow-md ${
                        isMuted ? 'opacity-70 bg-muted/20' : 'bg-card'
                      }`}
                    >
                      <div className="space-y-3.5 p-4">
                        {/* Identity & Status */}
                        <div className="flex items-start gap-3">
                          <UserAvatar name={emp.fullName} url={emp.avatarUrl} size="md" />

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="truncate text-sm font-bold text-foreground leading-tight">
                                {emp.fullName}
                              </h3>
                              {emp.nickname && emp.nickname !== emp.fullName && (
                                <span className="text-[11px] text-muted-foreground">({emp.nickname})</span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-xs font-medium text-foreground/80">
                              {emp.jobTitle || emp.department || 'Employee'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-semibold text-primary font-mono">
                                {emp.employeeCode || 'Belum ada NIK'}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {emp.jobLevel || 'Staff'}
                              </span>
                            </div>
                          </div>

                          {/* Account Status Badge */}
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shrink-0 ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isResigned
                              ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-500' : isResigned ? 'bg-slate-400' : 'bg-rose-500'
                            }`} />
                            {isActive ? 'Aktif' : isResigned ? 'Resigned' : 'Non-Aktif'}
                          </span>
                        </div>

                        {/* Badges: Department & Employment Type */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[11px] font-normal gap-1 bg-muted/60 text-muted-foreground">
                            <Building2 size={11} className="shrink-0" />
                            <span className="truncate max-w-[120px]">{emp.company || 'GESIT'}</span>
                          </Badge>
                          {emp.department && (
                            <Badge variant="secondary" className="text-[11px] font-normal gap-1 bg-muted/60 text-muted-foreground">
                              <Briefcase size={11} className="shrink-0" />
                              <span className="truncate max-w-[130px]">{emp.department}</span>
                            </Badge>
                          )}
                          {isProbation ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 font-semibold">
                              Probation
                            </Badge>
                          ) : isIntern ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 font-semibold">
                              Magang
                            </Badge>
                          ) : isPermanent ? (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold">
                              PKWTT
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold">
                              PKWT
                            </Badge>
                          )}
                        </div>

                        {/* Contact details */}
                        <div className="space-y-1 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={12} className="shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{emp.email || '—'}</span>
                          </div>
                          {emp.phone && (
                            <div className="flex items-center gap-2 truncate">
                              <Phone size={12} className="shrink-0 text-muted-foreground/70" />
                              <span>{emp.phone}</span>
                            </div>
                          )}
                          {emp.branch && (
                            <div className="flex items-center gap-2 truncate text-[11px]">
                              <MapPin size={12} className="shrink-0 text-muted-foreground/70" />
                              <span>{emp.branch}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {emp.joinDate ? `Gabung ${formatDateDDMMYYYY(emp.joinDate)}` : 'Tanggal gabung —'}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setViewingEmployee(emp);
                              setDetailActiveTab('profile');
                            }}
                          >
                            <Eye size={13} className="mr-1" /> Detail
                          </Button>

                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit Data"
                            >
                              <Pencil size={13} />
                            </Button>
                          )}

                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="h-7 w-7 text-muted-foreground hover:text-blue-600"
                              onClick={() => openTransferModal(emp)}
                              title="Mutasi / Transfer"
                            >
                              <ArrowRightLeft size={13} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent border-b border-border/60">
                <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Employee</TableHead>
                
                {/* DYNAMIC HEADERS BASED ON ACTIVE TAB */}
                {activeTab === 'directory' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Organisasi & Branch</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Jabatan & Level</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Kepegawaian</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Kontak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status</TableHead>
                  </>
                )}

                {activeTab === 'contracts' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Departemen</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Nomor PKWT</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Tipe Kontrak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Periode Kontrak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Sisa Masa Berlaku</TableHead>
                  </>
                )}

                {activeTab === 'payroll' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Departemen</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Informasi Rekening Bank</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">NPWP & Pajak</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">BPJS Ketenagakerjaan</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">BPJS Kesehatan</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Payroll</TableHead>
                  </>
                )}

                {activeTab === 'transfers' && (
                  <>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Penempatan Saat Ini</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Jabatan Saat Ini</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Status Terakhir</TableHead>
                    <TableHead className="px-6 py-3.5 text-xs font-bold text-foreground/80">Aksi Mutasi</TableHead>
                  </>
                )}

                <TableHead className="px-6 py-3.5 text-center text-xs font-bold text-foreground/80">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="px-6 py-4"><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="px-6 py-4"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-6 py-4 text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-muted-foreground/40" />
                      <p className="font-semibold text-foreground">Tidak ada data employee ditemukan</p>
                      <p className="text-xs text-muted-foreground">Silakan sesuaikan filter atau kata kunci pencarian Anda</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEmployees.map((emp) => {
                  const contractMeta = getContractMeta(emp);

                  return (
                    <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors group">
                      {/* EMPLOYEE COLUMN (Common to all tabs) */}
                      <TableCell className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={emp.fullName} url={emp.avatarUrl} size="md" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate">{emp.fullName}</span>
                              {emp.nickname && emp.nickname !== emp.fullName && (
                                <span className="text-[11px] text-muted-foreground font-normal">({emp.nickname})</span>
                              )}
                              {(() => {
                                const s = (emp.employmentStatus || emp.status || '').toLowerCase();
                                if (s === 'resigned') {
                                  return (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 font-semibold">
                                      Resigned
                                    </Badge>
                                  );
                                }
                                if (s === 'disabled' || s === 'inactive' || s === 'non-active') {
                                  return (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-900 font-semibold">
                                      Non-Aktif
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-semibold text-primary">
                                {emp.employeeCode || 'Belum ada NIK'}
                              </span>
                              {emp.joinDate && (
                                <span className="text-[11px] text-muted-foreground">
                                  · Masuk: {formatDateDDMMYYYY(emp.joinDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* MASTER DATA VIEW */}
                      {activeTab === 'directory' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || 'GESIT'} {emp.branch ? `· ${emp.branch}` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.jobTitle || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.jobLevel || 'Staff'} {emp.gradeClass ? `(${emp.gradeClass})` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            {(() => {
                              const s = `${emp.contractType || ''} ${emp.employmentType || ''}`.toLowerCase();
                              if (s.includes('probation') || s.includes('percobaan')) {
                                return (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Badge variant="outline" className="text-xs font-semibold border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                      Probation
                                    </Badge>
                                    {canManage && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedEmployeeForSK(emp);
                                          setSkModalOpen(true);
                                        }}
                                        title="Buat SK Pengangkatan Karyawan Tetap (PKWTT)"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-[#12346a] dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 border border-blue-200/80 dark:border-blue-800 transition-colors cursor-pointer"
                                      >
                                        <span>Angkat SK</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              }
                              if (s.includes('magang') || s.includes('intern')) {
                                return (
                                  <Badge variant="outline" className="text-xs font-semibold border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400">
                                    Magang
                                  </Badge>
                                );
                              }
                              if (s.includes('pkwtt') || s.includes('tetap') || s.includes('permanent')) {
                                return (
                                  <Badge variant="outline" className="text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                    PKWTT
                                  </Badge>
                                );
                              }
                              return (
                                <Badge variant="outline" className="text-xs font-semibold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                  PKWT
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs text-foreground flex items-center gap-1">
                              <Mail size={12} className="text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[180px]">{emp.email}</span>
                            </div>
                            {emp.phone && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone size={11} className="shrink-0" />
                                <span>{emp.phone}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              (emp.employmentStatus || emp.status || 'Active').toLowerCase() === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                (emp.employmentStatus || emp.status || 'Active').toLowerCase() === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`} />
                              {emp.employmentStatus || emp.status || 'Active'}
                            </span>
                          </TableCell>
                        </>
                      )}

                      {/* CONTRACTS & PKWT VIEW */}
                      {activeTab === 'contracts' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || '—'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <span className="font-mono text-xs font-bold text-foreground">
                              {emp.pkwtNumber || <span className="text-muted-foreground font-normal italic">Belum tercatat</span>}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {(() => {
                                const s = `${emp.contractType || ''} ${emp.employmentType || ''}`.toLowerCase();
                                if (s.includes('probation') || s.includes('percobaan')) return 'Probation';
                                if (s.includes('magang') || s.includes('intern')) return 'Magang';
                                if (s.includes('pkwtt') || s.includes('tetap') || s.includes('permanent')) return 'PKWTT';
                                return 'PKWT';
                              })()}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-medium text-foreground">
                              {emp.contractStartDate ? formatDateDDMMYYYY(emp.contractStartDate) : '—'}
                              {' s/d '}
                              {emp.contractEndDate ? formatDateDDMMYYYY(emp.contractEndDate) : 'Tetap'}
                            </div>
                            {(() => {
                              const isNonActive = (emp.employmentStatus || emp.status || '').toLowerCase() !== 'active';
                              if (isNonActive) {
                                return (
                                  <div className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                    {emp.separationDate ? `Berhenti: ${formatDateDDMMYYYY(emp.separationDate)}` : 'Status: Resigned'}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            {contractMeta.status === 'resigned' ? (
                              <Badge variant="outline" className="bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border-slate-300 dark:border-zinc-700 text-xs font-semibold">
                                {contractMeta.label}
                              </Badge>
                            ) : contractMeta.isExpired ? (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-bold">
                                {contractMeta.label}
                              </Badge>
                            ) : contractMeta.isExpiring ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold animate-pulse">
                                {contractMeta.label}
                              </Badge>
                            ) : contractMeta.status === 'permanent' ? (
                              <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold">
                                {contractMeta.label}
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                                {contractMeta.label}
                              </Badge>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* PAYROLL & TAX VIEW */}
                      {activeTab === 'payroll' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-semibold text-foreground">{emp.department || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.company || '—'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">
                              {emp.bankName ? `${emp.bankName} - ${emp.bankAccountNumber || 'No rek belum diisi'}` : '—'}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              a.n {emp.bankAccountName || emp.fullName}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="font-mono text-xs text-foreground">{emp.npwp || 'Belum ada NPWP'}</div>
                            <div className="text-[11px] text-muted-foreground">Status: {emp.taxStatus || 'TK/0'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5 font-mono text-xs">
                            {emp.bpjsTkNumber || <span className="text-muted-foreground italic font-sans">Belum diisi</span>}
                          </TableCell>
                          <TableCell className="px-6 py-3.5 font-mono text-xs">
                            {emp.bpjsHealthNumber || <span className="text-muted-foreground italic font-sans">Belum diisi</span>}
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                              {emp.payrollStatus || 'Active Payroll'}
                            </Badge>
                          </TableCell>
                        </>
                      )}

                      {/* MUTASI / TRANSFERS VIEW */}
                      {activeTab === 'transfers' && (
                        <>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">{emp.company || 'GESIT'}</div>
                            <div className="text-[11px] text-muted-foreground">{emp.department} {emp.branch ? `· ${emp.branch}` : ''}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <div className="text-xs font-bold text-foreground">{emp.jobTitle || '—'}</div>
                            <div className="text-[11px] text-muted-foreground">Level: {emp.jobLevel || 'Staff'}</div>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            <Badge variant="outline" className="text-xs">
                              {emp.statusEffectiveDate ? `Efektif: ${emp.statusEffectiveDate}` : 'Assignment Aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-3.5">
                            {canManage && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openTransferModal(emp)}
                                className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                              >
                                <ArrowRightLeft size={13} className="mr-1.5" /> Mutasi Karyawan
                              </Button>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* ACTION BUTTONS */}
                      <TableCell className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Quick View Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setViewingEmployee(emp);
                              setDetailActiveTab('profile');
                            }}
                            title="Lihat Detail Profil"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                          >
                            <Eye size={15} />
                          </Button>

                          {/* Edit Button */}
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingEmployee(emp);
                                setIsFormModalOpen(true);
                              }}
                              title="Edit Data Employee"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                            >
                              <Pencil size={15} />
                            </Button>
                          )}

                          {/* More Actions Dropdown */}
                          {(canManage || isSuperAdmin || canDelete) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted outline-none transition-colors"
                                title="Menu Aksi Lainnya"
                              >
                                <MoreHorizontal size={15} />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-xl border border-border/80 bg-popover text-popover-foreground">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1">
                                    Aksi Tambahan
                                  </DropdownMenuLabel>
                                  
                                  {canManage && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedEmployeeForSK(emp);
                                          setSkModalOpen(true);
                                        }}
                                        className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted"
                                      >
                                        <Award size={14} className="text-[#12346a] dark:text-blue-400" />
                                        <span>Buat SK Pengangkatan</span>
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() => openContractTransitionModal(emp)}
                                        className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted"
                                      >
                                        <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                                        <span>Perbarui Kontrak & SK</span>
                                      </DropdownMenuItem>

                                      {activeTab !== 'transfers' && (
                                        <DropdownMenuItem
                                          onClick={() => openTransferModal(emp)}
                                          className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted"
                                        >
                                          <ArrowRightLeft size={14} className="text-blue-600 dark:text-blue-400" />
                                          <span>Mutasi / Transfer</span>
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}

                                  {isSuperAdmin && (
                                    <DropdownMenuItem
                                      onClick={() => setResetPasswordEmployee(emp)}
                                      className="gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer hover:bg-muted"
                                    >
                                      <KeyRound size={14} className="text-amber-600 dark:text-amber-400" />
                                      <span>Reset Passcode Akun</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>

                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator className="my-1 border-border/60" />
                                    <DropdownMenuItem
                                      onClick={() => setDeleteEmployee(emp)}
                                      className="gap-2.5 text-xs py-2 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                      <span>Hapus Karyawan</span>
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        )}

        {/* PAGINATION FOOTER */}
        <div className="px-6 py-4 bg-muted/20 border-t border-border/60 flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground font-medium">
            Halaman <span className="font-bold text-foreground">{currentPage}</span> dari <span className="font-bold text-foreground">{totalPages}</span> ({filteredEmployees.length} total baris)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* QUICK VIEW EMPLOYEE DETAIL MODAL (AUTHENTIC SHADCN UI SYSTEM - LARGE & SPACIOUS) */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-5xl lg:max-w-6xl w-[94vw] max-w-[94vw] max-h-[92vh] flex flex-col p-0 overflow-hidden border border-border bg-background shadow-2xl rounded-xl">
          {viewingEmployee && (
            <>
              {/* Header Profile ala Shadcn UI */}
              <div className="p-6 pb-4 border-b border-border bg-card shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="relative shrink-0">
                      <UserAvatar name={viewingEmployee.fullName} url={viewingEmployee.avatarUrl} size="lg" className="h-16 w-16 text-lg border-2 border-border shadow-xs" />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-background" title="Aktif" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">{viewingEmployee.fullName}</h2>
                        {viewingEmployee.nickname && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {viewingEmployee.nickname}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
                          {viewingEmployee.contractType || viewingEmployee.employmentType || 'Karyawan Aktif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap font-medium">
                        <span className="text-foreground font-semibold">{viewingEmployee.jobTitle || 'Staff'}</span>
                        <span>•</span>
                        <span>{viewingEmployee.department}</span>
                        {viewingEmployee.company && (
                          <>
                            <span>•</span>
                            <span>{viewingEmployee.company}</span>
                          </>
                        )}
                        {viewingEmployee.branch && (
                          <>
                            <span>•</span>
                            <span className="text-primary font-medium flex items-center gap-1">
                              <MapPin size={13} className="shrink-0" />
                              {viewingEmployee.branch}
                            </span>
                          </>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="font-mono text-[11px] font-normal">
                          NIP: {viewingEmployee.employeeCode || '—'}
                        </Badge>
                        <Badge variant="secondary" className="font-mono text-[11px] font-normal inline-flex items-center gap-1.5">
                          <span>
                            NIK: {viewingEmployee.nik
                              ? (showViewingNik
                                  ? viewingEmployee.nik
                                  : `•••• •••• ${String(viewingEmployee.nik).slice(-4)}`)
                              : '—'}
                          </span>
                          {viewingEmployee.nik && (
                            <button
                              type="button"
                              onClick={() => setShowViewingNik(!showViewingNik)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer focus:outline-hidden"
                              title={showViewingNik ? 'Sembunyikan NIK' : 'Tampilkan NIK'}
                            >
                              {showViewingNik ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-[11px] text-muted-foreground">
                          {viewingEmployee.employmentType || 'Full-Time'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setViewingEmployee(null)}
                      className="rounded-full text-muted-foreground hover:text-foreground"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs Navigasi Resmi Shadcn UI */}
              <Tabs
                value={detailActiveTab}
                onValueChange={(val: any) => setDetailActiveTab(val)}
                className="w-full flex-1 flex flex-col overflow-hidden"
              >
                <div className="px-6 border-b border-border bg-muted/20 shrink-0">
                  <TabsList className="h-11 bg-transparent p-0 gap-6 justify-start w-full rounded-none">
                    <TabsTrigger
                      value="profile"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-1 text-xs font-semibold text-muted-foreground shadow-none"
                    >
                      <Users className="mr-2 h-4 w-4" /> Profil & Pribadi
                    </TabsTrigger>

                    <TabsTrigger
                      value="contract"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-1 text-xs font-semibold text-muted-foreground shadow-none"
                    >
                      <FileText className="mr-2 h-4 w-4" /> Pekerjaan & Kontrak
                    </TabsTrigger>

                    <TabsTrigger
                      value="education"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-1 text-xs font-semibold text-muted-foreground shadow-none"
                    >
                      <GraduationCap className="mr-2 h-4 w-4" /> Pendidikan
                    </TabsTrigger>

                    <TabsTrigger
                      value="payroll"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-1 text-xs font-semibold text-muted-foreground shadow-none"
                    >
                      <CreditCard className="mr-2 h-4 w-4" /> Payroll & Pajak
                    </TabsTrigger>

                    <TabsTrigger
                      value="documents"
                      className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent rounded-none h-full px-1 text-xs font-semibold text-muted-foreground shadow-none"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" /> Dokumen Digital
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Konten Tab Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* TAB 1: PROFIL & PRIBADI */}
                  <TabsContent value="profile" className="mt-0 space-y-6">
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Informasi Pribadi & Identitas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium">Tempat / Tanggal Lahir</span>
                            <p className="font-semibold text-foreground mt-0.5">
                              {viewingEmployee.birthPlace || '—'}, {formatDateDDMMYYYY(viewingEmployee.dateOfBirth)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Jenis Kelamin</span>
                            <p className="font-semibold text-foreground mt-0.5">{normalizeGender(viewingEmployee.gender) || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Status Pernikahan</span>
                            <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.maritalStatus || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Agama</span>
                            <p className="font-semibold text-foreground mt-0.5">{normalizeReligion(viewingEmployee.religion) || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Golongan Darah</span>
                            <p className="font-semibold text-foreground mt-0.5">{viewingEmployee.bloodType || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Nomor Paspor</span>
                            <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.passportNumber || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" /> Kontak & Alamat Domisili
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                              <Mail size={12} /> Email Login Akun
                            </span>
                            <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.email}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                              <Phone size={12} /> Nomor Handphone / WhatsApp
                            </span>
                            <p className="font-mono font-semibold text-foreground mt-0.5">{viewingEmployee.phone || '—'}</p>
                          </div>
                          <div className="sm:col-span-2 pt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">Alamat KTP</span>
                            <p className="font-medium text-foreground mt-0.5">{viewingEmployee.address || '—'}</p>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground font-medium">Alamat Domisili Saat Ini</span>
                            <p className="font-medium text-foreground mt-0.5">{viewingEmployee.residentialAddress || viewingEmployee.address || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 2: PEKERJAAN & KONTRAK */}
                  <TabsContent value="contract" className="mt-0 space-y-6">
                    {/* Status Kontrak Aktif Card */}
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Status Kontrak Saat Ini
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <CardTitle className="text-base font-bold">
                              {viewingEmployee.contractType || viewingEmployee.employmentType || 'PKWT 1'}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs font-semibold">
                              {getContractMeta(viewingEmployee).label}
                            </Badge>
                          </div>
                        </div>

                        {canManage && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEmployeeForSK(viewingEmployee);
                                setSkModalOpen(true);
                              }}
                              className="text-xs font-semibold gap-1.5 border-blue-200 dark:border-blue-900 text-[#12346a] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            >
                              <Award size={14} />
                              <span>Buat / Cetak SK</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => openContractTransitionModal(viewingEmployee)}
                              className="text-xs font-semibold gap-1.5"
                            >
                              <FileText size={14} />
                              <span>Perbarui Status & SK</span>
                            </Button>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-5 pt-0 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pb-4 border-b border-border/60">
                          <div>
                            <span className="text-muted-foreground font-medium">Perusahaan / Legal Entity</span>
                            <p className="font-semibold text-foreground mt-1">{viewingEmployee.company || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Lokasi Kerja / Branch</span>
                            <p className="font-semibold text-primary mt-1 flex items-center gap-1">
                              <MapPin size={12} className="shrink-0" />
                              {viewingEmployee.branch || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Departemen</span>
                            <p className="font-semibold text-foreground mt-1">{viewingEmployee.department || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Jabatan & Level</span>
                            <p className="font-semibold text-foreground mt-1">
                              {viewingEmployee.jobTitle || 'Staff'} {viewingEmployee.jobLevel ? `(${viewingEmployee.jobLevel})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium">Nomor SK / PKWT</span>
                            <p className="font-mono font-semibold text-foreground mt-1">{viewingEmployee.pkwtNumber || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Mulai Berlaku</span>
                            <p className="font-semibold text-foreground mt-1">{formatDateDDMMYYYY(viewingEmployee.contractStartDate)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Berakhir Pada</span>
                            <p className="font-semibold text-foreground mt-1">
                              {viewingEmployee.contractEndDate ? formatDateDDMMYYYY(viewingEmployee.contractEndDate) : 'Permanen (PKWTT)'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Tanggal Bergabung</span>
                            <p className="font-semibold text-foreground mt-1">{formatDateDDMMYYYY(viewingEmployee.joinDate)}</p>
                          </div>
                        </div>

                        {viewingEmployee.skFileUrl && (
                          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Dokumen SK Aktif di Google Drive:</span>
                            <a
                              href={viewingEmployee.skFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <FileText size={13} />
                              <span>Buka Dokumen SK</span>
                              <ArrowUpRight size={12} />
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Timeline Riwayat Kontrak & SK */}
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" /> Jejak Riwayat Kontrak & SK (Timeline)
                        </CardTitle>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {(contractHistories[String(viewingEmployee.id)] || []).length} Riwayat Tercatat
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        {((contractHistories[String(viewingEmployee.id)] || []).length > 0) ? (
                          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                            {(contractHistories[String(viewingEmployee.id)] || []).map((hist, hIdx) => {
                              const isTetapHist = hist.contractType.toUpperCase().includes('PKWTT') || hist.contractType.toUpperCase().includes('TETAP');
                              return (
                                <div key={hIdx} className="relative group">
                                  <span className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full ring-4 ring-background ${
                                    isTetapHist ? 'bg-emerald-500' : 'bg-primary'
                                  }`} />
                                  <div className="rounded-lg border border-border/70 bg-card p-3.5 text-xs space-y-2">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant={isTetapHist ? 'default' : 'secondary'} className="font-semibold">
                                          {hist.contractType}
                                        </Badge>
                                        {hist.skNumber && (
                                          <span className="font-mono text-[11px] text-muted-foreground font-medium">
                                            No. {hist.skNumber}
                                          </span>
                                        )}
                                      </div>
                                      {hist.skFileUrl && (
                                        <a
                                          href={hist.skFileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                        >
                                          <FileText size={12} />
                                          <span>File SK Google Drive</span>
                                          <ArrowUpRight size={11} />
                                        </a>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                      <span>Periode: <b>{formatDateDDMMYYYY(hist.contractStartDate)}</b> s/d <b>{isTetapHist ? 'Permanen' : (formatDateDDMMYYYY(hist.contractEndDate) || '—')}</b></span>
                                      {hist.createdBy && <span>• Dicatat: {hist.createdBy}</span>}
                                    </div>
                                    {hist.notes && (
                                      <p className="text-[11px] text-foreground bg-muted/40 p-2.5 rounded-md italic border border-border/40">
                                        "{hist.notes}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg border-border/70 p-6">
                            <FileText size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                            <p className="font-medium text-foreground">Belum ada riwayat transisi kontrak sebelumnya</p>
                            <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
                              Saat status karyawan naik (misal: selesai masa Probation ke PKWT 1, atau PKWT ke Karyawan Tetap), gunakan tombol <strong>"Perbarui Status & SK"</strong> di atas.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 3: PENDIDIKAN */}
                  <TabsContent value="education" className="mt-0 space-y-6">
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" /> Riwayat Pendidikan Terakhir
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium">Jenjang Terakhir</span>
                            <div className="mt-1">
                              <Badge variant="secondary" className="font-bold">
                                {viewingEmployee.lastEducation || '—'}
                              </Badge>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-muted-foreground font-medium">Institusi / Universitas / Sekolah</span>
                            <p className="font-bold text-foreground mt-1">{viewingEmployee.institutionName || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Jurusan / Program Studi</span>
                            <p className="font-semibold text-foreground mt-1">{viewingEmployee.major || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Tahun Pendidikan</span>
                            <p className="font-semibold text-foreground mt-1">
                              {viewingEmployee.educationStartYear ? `${viewingEmployee.educationStartYear} s/d ` : ''}
                              {viewingEmployee.graduationYear || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">IPK / Nilai Akhir</span>
                            <p className="font-bold text-foreground mt-1">{viewingEmployee.gpa || '—'}</p>
                          </div>
                          <div className="sm:col-span-3 pt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">Nomor Seri Ijazah</span>
                            <p className="font-mono font-semibold text-foreground mt-1">{viewingEmployee.diplomaNumber || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 4: PAYROLL & PAJAK */}
                  <TabsContent value="payroll" className="mt-0 space-y-6">
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-primary" /> Rekening Bank & Status Payroll
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                          <div>
                            <span className="text-muted-foreground font-medium">Nama Bank</span>
                            <p className="font-bold text-foreground mt-1">{viewingEmployee.bankName || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Nomor Rekening</span>
                            <p className="font-mono font-bold text-foreground mt-1">{viewingEmployee.bankAccountNumber || '—'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Atas Nama Rekening</span>
                            <p className="font-semibold text-foreground mt-1">{viewingEmployee.bankAccountName || viewingEmployee.fullName}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Status Payroll</span>
                            <p className="font-semibold text-emerald-600 mt-1">{viewingEmployee.payrollStatus || 'Active'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Status Pajak (PTKP)</span>
                            <p className="font-bold text-foreground mt-1">{viewingEmployee.taxStatus || 'TK/0'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground font-medium">Nomor NPWP</span>
                            <p className="font-mono font-semibold text-foreground mt-1">{viewingEmployee.npwp || '—'}</p>
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">BPJS Ketenagakerjaan</span>
                            <p className="font-mono font-semibold text-foreground mt-1">{viewingEmployee.bpjsTkNumber || '—'}</p>
                          </div>
                          <div className="pt-2 border-t border-border/50">
                            <span className="text-muted-foreground font-medium">BPJS Kesehatan</span>
                            <p className="font-mono font-semibold text-foreground mt-1">{viewingEmployee.bpjsHealthNumber || '—'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* TAB 5: DOKUMEN DIGITAL (GOOGLE DRIVE) */}
                  <TabsContent value="documents" className="mt-0 space-y-6">
                    <Card className="border border-border/70 shadow-none">
                      <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Dokumen Karyawan (Google Drive Restricted)
                        </CardTitle>
                        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                          Akses Terenkripsi HR & Karyawan
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        {(canManage || (currentUser && String(currentUser.id) === String(viewingEmployee.id))) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {viewingEmployee.ktpFileUrl ? (
                              <RestrictedDocViewer
                                fileUrl={viewingEmployee.ktpFileUrl}
                                fileName={`KTP - ${viewingEmployee.fullName}.pdf`}
                                categoryLabel="KTP"
                                targetEmail={viewingEmployee.email}
                              />
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-center gap-2.5 bg-muted/10">
                                <FileText size={16} className="text-muted-foreground/50 shrink-0" />
                                <span>Dokumen KTP belum diunggah</span>
                              </div>
                            )}

                            {viewingEmployee.ijazahFileUrl ? (
                              <RestrictedDocViewer
                                fileUrl={viewingEmployee.ijazahFileUrl}
                                fileName={`Ijazah - ${viewingEmployee.fullName}.pdf`}
                                categoryLabel="Ijazah"
                                targetEmail={viewingEmployee.email}
                              />
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-center gap-2.5 bg-muted/10">
                                <FileText size={16} className="text-muted-foreground/50 shrink-0" />
                                <span>Dokumen Ijazah belum diunggah</span>
                              </div>
                            )}

                            {viewingEmployee.skFileUrl ? (
                              <RestrictedDocViewer
                                fileUrl={viewingEmployee.skFileUrl}
                                fileName={`SK Karyawan - ${viewingEmployee.fullName}.pdf`}
                                categoryLabel="SK Karyawan"
                                targetEmail={viewingEmployee.email}
                              />
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-center gap-2.5 bg-muted/10">
                                <FileText size={16} className="text-muted-foreground/50 shrink-0" />
                                <span>Dokumen SK belum diunggah</span>
                              </div>
                            )}

                            {viewingEmployee.bpjsFileUrl ? (
                              <RestrictedDocViewer
                                fileUrl={viewingEmployee.bpjsFileUrl}
                                fileName={`Kartu BPJS - ${viewingEmployee.fullName}.pdf`}
                                categoryLabel="BPJS"
                                targetEmail={viewingEmployee.email}
                              />
                            ) : (
                              <div className="rounded-lg border border-dashed border-border/80 p-4 text-xs text-muted-foreground flex items-center gap-2.5 bg-muted/10">
                                <FileText size={16} className="text-muted-foreground/50 shrink-0" />
                                <span>Dokumen BPJS belum diunggah</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 flex items-center gap-3">
                            <ShieldAlert size={18} className="text-amber-600 shrink-0" />
                            <span>
                              Akses Dibatasi: Dokumen pribadi karyawan hanya dapat diakses oleh HR yang berwenang dan pemilik akun yang bersangkutan.
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>
              </Tabs>

              {/* Modal Footer ala Shadcn UI */}
              <div className="bg-muted/30 px-6 py-3.5 border-t border-border flex items-center justify-between shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => setViewingEmployee(null)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Tutup
                </Button>

                {canManage && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = viewingEmployee;
                        setViewingEmployee(null);
                        openTransferModal(target);
                      }}
                      className="text-xs font-medium"
                    >
                      <ArrowRightLeft size={13} className="mr-1.5 text-muted-foreground" /> Mutasi
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        const target = viewingEmployee;
                        setViewingEmployee(null);
                        setEditingEmployee(target);
                        setIsFormModalOpen(true);
                      }}
                      className="text-xs font-semibold"
                    >
                      <Pencil size={13} className="mr-1.5" /> Edit Lengkap
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* TRANSFER EMPLOYEE MODAL */}
      <Dialog open={!!transferEmployee} onOpenChange={(open) => !open && setTransferEmployee(null)}>
        <DialogContent className="flex max-h-[86vh] max-w-4xl flex-col overflow-hidden rounded-2xl border-border bg-card p-0">
          <div className="border-b border-border/60 px-6 pb-5 pt-6 bg-muted/20">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    Employee movement & mutation
                  </p>
                  <DialogTitle className="text-xl font-bold tracking-tight">Transfer Employee</DialogTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Perbarui penempatan, departemen, atau jabatan employee dengan audit trail tercatat.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Employee ID</p>
                  <p className="text-sm font-bold text-foreground">{transferEmployee?.employeeCode || 'Belum diisi'}</p>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <UserAvatar name={transferEmployee?.fullName || ''} url={transferEmployee?.avatarUrl} size="md" />
              <div>
                <p className="font-bold text-sm text-foreground">{transferEmployee?.fullName}</p>
                <p className="text-xs text-muted-foreground">{transferEmployee?.email}</p>
              </div>
              <span className="ml-auto rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Identitas Tetap
              </span>
            </div>

            <section className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Perbandingan Perpindahan</h3>
                  <p className="text-xs text-muted-foreground">Assignment lama vs penempatan baru.</p>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Saat ini</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>Company: <b className="text-foreground">{transferEmployee?.company || '—'}</b></p>
                    <p>Branch: <b className="text-foreground">{transferEmployee?.branch || '—'}</b></p>
                    <p>Department: <b className="text-foreground">{transferEmployee?.department || '—'}</b></p>
                    <p>Jabatan: <b className="text-foreground">{transferEmployee?.jobTitle || '—'}</b></p>
                    <p>Level: <b className="text-foreground">{transferEmployee?.jobLevel || '—'}</b></p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/40 bg-card p-3">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-primary">Setelah Transfer</p>
                  <div className="space-y-1 text-xs text-foreground font-medium">
                    <p>Company: <b>{transferForm.company || '—'}</b></p>
                    <p>Branch: <b>{transferForm.branch || '—'}</b></p>
                    <p>Department: <b>{transferForm.department || '—'}</b></p>
                    <p>Jabatan: <b>{transferForm.jobTitle || '—'}</b></p>
                    <p>Level: <b>{transferForm.jobLevel || '—'}</b></p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Assignment Baru</h3>
                  <p className="text-xs text-muted-foreground">Isi penempatan dan posisi baru.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-semibold text-foreground">
                  Tanggal Efektif *
                  <Input
                    type="date"
                    value={transferForm.effectiveDate}
                    onChange={(e) => setTransferForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                    className="text-xs h-9 mt-1"
                  />
                </label>
                {([
                  ['company', 'Company / Entitas'],
                  ['branch', 'Branch / Lokasi Kerja'],
                  ['department', 'Department'],
                  ['jobTitle', 'Jabatan / Job Position'],
                  ['jobLevel', 'Job Level']
                ] as const).map(([key, label]) => (
                  <label key={key} className="space-y-1.5 text-xs font-semibold text-foreground">
                    {label}
                    {key === 'branch' ? (
                      <select
                        value={transferForm.branch || 'HQ'}
                        onChange={(e) => setTransferForm((f) => ({ ...f, branch: e.target.value }))}
                        className="text-xs h-9 mt-1 w-full rounded-md border border-input bg-background px-3 py-1 shadow-xs text-foreground outline-none focus:border-primary"
                      >
                        <option value="HQ">HQ</option>
                        <option value="Non HQ">Non HQ</option>
                      </select>
                    ) : (
                      <Input
                        value={transferForm[key]}
                        onChange={(e) => setTransferForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={`Masukkan ${label.toLowerCase()}`}
                        className="text-xs h-9 mt-1"
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>

            <section>
              <label className="space-y-1.5 text-xs font-semibold text-foreground">
                Alasan Transfer *
                <textarea
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))}
                  className="min-h-24 w-full mt-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="Contoh: promosi jabatan, rotasi departemen, atau kebutuhan operasional cabang"
                />
              </label>
            </section>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-muted/20 px-6 py-4">
            <Button variant="outline" onClick={() => setTransferEmployee(null)} className="text-xs">
              Batal
            </Button>
            <Button onClick={handleSaveTransfer} disabled={isProcessing} className="text-xs font-bold bg-primary">
              {isProcessing ? 'Menyimpan...' : 'Simpan Mutasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* USER FORM MODAL (Add / Edit) */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleSaveEmployee}
        initialData={editingEmployee}
        employeeMode={true}
      />

      {/* MODAL PERBARUI STATUS KONTRAK / NAIK STATUS (REDESIGNED ENTERPRISE LIFECYCLE) */}
      {transitionEmployee && (
        <Dialog open={!!transitionEmployee} onOpenChange={(open) => !open && !isTransitionProcessing && setTransitionEmployee(null)}>
          <DialogContent className="sm:max-w-2xl lg:max-w-3xl w-[90vw] max-w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-xl border border-border shadow-2xl bg-background">
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0 ring-1 ring-emerald-500/20">
                  <Award size={22} />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Perbarui Status Kontrak & Terbitkan SK
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Proses transisi jenjang kerja (Probation ➔ Kontrak PKWT ➔ Karyawan Tetap PKWTT) dan pengarsipan SK resmi ke Google Drive.
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Employee Summary Transition Strip */}
              <div className="rounded-xl border border-border/70 bg-gradient-to-r from-muted/40 via-muted/20 to-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={transitionEmployee.fullName} url={transitionEmployee.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{transitionEmployee.fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      NIP: {transitionEmployee.employeeCode || '—'} • {transitionEmployee.jobTitle || 'Staff'} • {transitionEmployee.department}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Status Saat Ini</span>
                    <Badge variant="outline" className="text-[10px] font-bold mt-0.5">
                      {transitionEmployee.contractType || transitionEmployee.employmentType || 'Belum diatur'}
                    </Badge>
                  </div>
                  <ArrowRightLeft size={14} className="text-muted-foreground" />
                  <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 block">Status Baru</span>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold mt-0.5">
                      {transitionForm.contractType}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Status Pilihan Interaktif (Interactive Option Cards) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Pilih Tahapan / Status Kerja Baru *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      id: 'PKWTT',
                      title: 'PKWTT',
                      desc: 'Perjanjian Kerja Waktu Tidak Tertentu (Tetap)',
                      badge: 'Permanen',
                      icon: Award,
                      color: 'border-emerald-500 text-emerald-600'
                    },
                    {
                      id: 'PKWT',
                      title: 'PKWT',
                      desc: 'Perjanjian Kerja Waktu Tertentu (Kontrak)',
                      badge: 'Kontrak',
                      icon: FileText,
                      color: 'border-amber-500 text-amber-600'
                    },
                    {
                      id: 'Probation',
                      title: 'Probation',
                      desc: 'Masa Evaluasi Percobaan (3 Bulan)',
                      badge: 'Evaluasi',
                      icon: Clock,
                      color: 'border-purple-500 text-purple-600'
                    },
                    {
                      id: 'Magang',
                      title: 'Magang',
                      desc: 'Program Praktik / Magang Kerja (Internship)',
                      badge: 'Internship',
                      icon: RefreshCcw,
                      color: 'border-cyan-500 text-cyan-600'
                    }
                  ].map((opt) => {
                    const isSelected = transitionForm.contractType === opt.id;
                    const IconComp = opt.icon;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setTransitionForm(f => ({
                            ...f,
                            contractType: opt.id,
                            endDate: (opt.id === 'PKWTT' || opt.id.includes('Tetap')) ? '' : f.endDate
                          }));
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-xs'
                            : 'border-border/70 hover:border-border hover:bg-muted/30 bg-card'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <IconComp size={15} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground text-xs">{opt.title}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{opt.desc}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-emerald-600 absolute top-3 right-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Input Detail SK & Periode */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4 shadow-xs">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText size={13} className="text-primary" /> Nomor SK Baru / Nomor Dokumen PKWT *
                  </label>
                  <Input
                    placeholder={
                      transitionForm.contractType === 'PKWTT'
                        ? 'Contoh: SK-TETAP/DIR/2027/005'
                        : 'Contoh: PKWT-01/HR/2026/088'
                    }
                    value={transitionForm.skNumber}
                    onChange={(e) => setTransitionForm(f => ({ ...f, skNumber: e.target.value }))}
                    className="text-xs h-9 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-primary" /> Tanggal Mulai Berlaku SK *
                    </label>
                    <Input
                      type="date"
                      value={transitionForm.startDate}
                      onChange={(e) => setTransitionForm(f => ({ ...f, startDate: e.target.value }))}
                      className="text-xs h-9"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                      <Clock size={13} className="text-primary" /> Tanggal Selesai Kontrak
                    </label>
                    {transitionForm.contractType === 'PKWTT' ? (
                      <div className="h-9 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 flex items-center text-xs font-semibold text-emerald-800 dark:text-emerald-300 gap-1.5">
                        <CheckCircle2 size={13} />
                        <span>Masa Kerja Permanen (Tanpa Batas Akhir)</span>
                      </div>
                    ) : (
                      <Input
                        type="date"
                        value={transitionForm.endDate}
                        onChange={(e) => setTransitionForm(f => ({ ...f, endDate: e.target.value }))}
                        className="text-xs h-9"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Upload Dokumen SK ke Google Drive */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" /> Upload Berkas SK Resmi (Google Drive)
                  </span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                    PDF / DOCX
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unggah berkas scan surat keputusan (SK) yang telah ditandatangani. Berkas akan langsung diarsipkan ke folder Google Drive perusahaan secara terenkripsi.
                </p>

                {transitionForm.skFileUrl ? (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <a
                          href={transitionForm.skFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-foreground hover:underline truncate block"
                        >
                          Berkas SK Tersimpan di Google Drive
                        </a>
                        <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} /> Berhasil diunggah
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTransitionForm(f => ({ ...f, skFileUrl: '' }))}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold"
                    >
                      Ganti Berkas
                    </Button>
                  </div>
                ) : (
                  <div>
                    <label className="border-2 border-dashed border-border/80 hover:border-emerald-500/60 rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 bg-muted/10 hover:bg-emerald-500/5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        {uploadingTransitionSk ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Upload size={20} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {uploadingTransitionSk ? 'Mengunggah ke Google Drive...' : 'Klik untuk Pilih atau Tarik File SK (PDF / Word)'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Maksimal 15 MB • Tersimpan di Folder Restricted HCM
                        </p>
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                        onChange={handleUploadTransitionSK}
                        disabled={uploadingTransitionSk}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Catatan / Evaluasi */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">
                  Catatan Evaluasi / Keterangan SK
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Evaluasi performa kerja memuaskan dengan nilai KPI 94/100. Disetujui kenaikan status PKWTT Tetap oleh Direksi."
                  value={transitionForm.notes}
                  onChange={(e) => setTransitionForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTransitionEmployee(null)}
                disabled={isTransitionProcessing}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={executeContractTransition}
                disabled={isTransitionProcessing || uploadingTransitionSk}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                {isTransitionProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Menyimpan Transisi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Simpan & Terbitkan SK</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetPasswordEmployee && (
        <ResetPasswordModal
          isOpen={!!resetPasswordEmployee}
          onClose={() => setResetPasswordEmployee(null)}
          onSave={handleResetPassword}
          user={resetPasswordEmployee}
        />
      )}

      {/* DANGER CONFIRM DELETE MODAL */}
      {deleteEmployee && (
        <DangerConfirmModal
          isOpen={!!deleteEmployee}
          onClose={() => setDeleteEmployee(null)}
          onConfirm={handleDeleteEmployee}
          title={`Hapus Employee ${deleteEmployee.fullName}?`}
          message={`Apakah Anda yakin ingin menghapus data ${deleteEmployee.fullName} (${deleteEmployee.email})? Tindakan ini akan menghapus akun dan histori profilnya.`}
          confirmText="Ya, Hapus Permanen"
          isLoading={isProcessing}
        />
      )}

      {/* IMPORT EXCEL MODAL */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => fetchEmployees()}
        currentUserEmail={currentUser?.email}
      />

      {/* EXPORT EXCEL MODAL (FULL LENGKAP & DINAMIS) */}
      <EmployeeExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allEmployees={employees.filter(e => !isTechnicalAccount(e))}
        filteredEmployees={filteredEmployees}
        activeTab={activeTab}
        getContractMeta={getContractMeta}
      />

      {/* SK PENGANGKATAN KARYAWAN TETAP MODAL */}
      <EmployeeAppointmentSKModal
        open={skModalOpen}
        onOpenChange={setSkModalOpen}
        employee={selectedEmployeeForSK ? {
          id: selectedEmployeeForSK.id,
          fullName: selectedEmployeeForSK.fullName,
          email: selectedEmployeeForSK.email,
          employeeCode: selectedEmployeeForSK.employeeCode,
          nik: selectedEmployeeForSK.nik,
          gender: selectedEmployeeForSK.gender,
          company: selectedEmployeeForSK.company,
          department: selectedEmployeeForSK.department,
          jobTitle: selectedEmployeeForSK.jobTitle,
          joinDate: selectedEmployeeForSK.joinDate,
          contractStartDate: selectedEmployeeForSK.contractStartDate || selectedEmployeeForSK.joinDate,
          contractEndDate: selectedEmployeeForSK.contractEndDate,
          contractType: selectedEmployeeForSK.contractType,
        } : null}
        currentUser={currentUser}
        onSaved={() => {
          fetchEmployees();
          if (viewingEmployee && selectedEmployeeForSK && viewingEmployee.id === selectedEmployeeForSK.id) {
            setViewingEmployee((prev: any) => prev ? { ...prev, contractType: 'PKWTT', employmentType: 'PKWTT' } : null);
          }
        }}
      />
    </div>
  );
};

export default EmployeeDataManager;
