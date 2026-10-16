import React, { useState, useEffect, useMemo } from 'react';
import {
  FileWarning,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Printer,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Building2,
  FolderTree,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  Edit,
  Eye,
  RotateCcw,
  Info,
  AlertCircle,
  Sparkles,
  Paperclip,
  Check,
  X,
  Database
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import {
  WarningLetterRecord,
  WarningLetterLevel,
  WarningViolationCategory,
  WarningLetterStatus
} from '../../types';
import {
  getWarningLetters,
  createWarningLetter,
  updateWarningLetter,
  revokeWarningLetter,
  deleteWarningLetter,
  generateLetterNumber
} from '../../lib/warningLetterService';
import { trackActivity } from '../../lib/auditLogger';

// UI components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface EmployeeWarningManagerProps {
  currentUser?: any;
}

interface EmployeeAccount {
  id: number | string;
  employee_code?: string;
  full_name: string;
  company?: string;
  department?: string;
  job_title?: string;
  avatar_url?: string;
  status?: string;
}

export const EmployeeWarningManager: React.FC<EmployeeWarningManagerProps> = ({ currentUser }) => {
  const [records, setRecords] = useState<WarningLetterRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocalOnly, setIsLocalOnly] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Active records for modal
  const [selectedRecord, setSelectedRecord] = useState<WarningLetterRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');

  // Form State
  const [formData, setFormData] = useState<{
    id?: string | number;
    letterNumber: string;
    employeeId: string | number;
    employeeCode: string;
    employeeName: string;
    company: string;
    department: string;
    jobTitle: string;
    spLevel: WarningLetterLevel;
    violationCategory: WarningViolationCategory;
    incidentDate: string;
    issuedDate: string;
    validFrom: string;
    validUntil: string;
    chronology: string;
    consequences: string;
    issuerName: string;
    issuerTitle: string;
    witnessName: string;
    notes: string;
    attachmentUrl: string;
  }>({
    letterNumber: '',
    employeeId: '',
    employeeCode: '',
    employeeName: '',
    company: '',
    department: '',
    jobTitle: '',
    spLevel: 'SP 1',
    violationCategory: 'Kedisiplinan & Presensi',
    incidentDate: new Date().toISOString().split('T')[0],
    issuedDate: new Date().toISOString().split('T')[0],
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    chronology: '',
    consequences: '',
    issuerName: currentUser?.fullName || currentUser?.name || 'HR Manager',
    issuerTitle: currentUser?.jobTitle || 'HR Manager',
    witnessName: '',
    notes: '',
    attachmentUrl: ''
  });

  // Calculate default validUntil (+6 months from validFrom)
  const calculateValidUntil = (fromStr: string): string => {
    try {
      const d = new Date(fromStr || new Date());
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Load Data
  const loadData = async () => {
    setLoading(true);
    try {
      const [res, empRes] = await Promise.all([
        getWarningLetters(),
        supabase
          .from('user_accounts')
          .select('id, employee_code, full_name, company, department, job_title, avatar_url, status')
          .order('full_name', { ascending: true })
      ]);

      setRecords(res.data);
      setIsLocalOnly(res.isLocalOnly);

      if (empRes.data) {
        setEmployees(empRes.data as EmployeeAccount[]);
      }
    } catch (err) {
      console.error('Error loading warning letters:', err);
      toast.error('Gagal memuat data catatan SP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute active SP for a selected employee
  const selectedEmployeeActiveSp = useMemo(() => {
    if (!formData.employeeId) return null;
    return records.filter(
      r => String(r.employeeId) === String(formData.employeeId) && r.status === 'Aktif'
    );
  }, [formData.employeeId, records]);

  // Companies & Categories list
  const companiesList = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.company) set.add(r.company);
    });
    return Array.from(set);
  }, [records]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const active = records.filter(r => r.status === 'Aktif');
    const spTeguran = active.filter(r => r.spLevel === 'Surat Teguran').length;
    const sp1 = active.filter(r => r.spLevel === 'SP 1').length;
    const sp2 = active.filter(r => r.spLevel === 'SP 2').length;
    const sp3 = active.filter(r => r.spLevel === 'SP 3').length;
    const expired = records.filter(r => r.status === 'Selesai').length;
    const revoked = records.filter(r => r.status === 'Dibatalkan').length;

    return {
      total,
      activeCount: active.length,
      spTeguran,
      sp1,
      sp2,
      sp3,
      expired,
      revoked
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q) ||
        r.letterNumber.toLowerCase().includes(q) ||
        (r.department && r.department.toLowerCase().includes(q)) ||
        (r.company && r.company.toLowerCase().includes(q)) ||
        r.chronology.toLowerCase().includes(q);

      // Filters
      const matchLevel = filterLevel === 'all' || r.spLevel === filterLevel;
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchCompany = filterCompany === 'all' || r.company === filterCompany;
      const matchCategory = filterCategory === 'all' || r.violationCategory === filterCategory;

      return matchSearch && matchLevel && matchStatus && matchCompany && matchCategory;
    });
  }, [records, searchQuery, filterLevel, filterStatus, filterCompany, filterCategory]);

  // Open Create Modal
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const initialLevel: WarningLetterLevel = 'SP 1';
    const newNumber = generateLetterNumber(initialLevel, records);
    setIsEditing(false);
    setSelectedRecord(null);
    setFormData({
      letterNumber: newNumber,
      employeeId: '',
      employeeCode: '',
      employeeName: '',
      company: '',
      department: '',
      jobTitle: '',
      spLevel: initialLevel,
      violationCategory: 'Kedisiplinan & Presensi',
      incidentDate: today,
      issuedDate: today,
      validFrom: today,
      validUntil: calculateValidUntil(today),
      chronology: '',
      consequences: '1. Pemotongan tunjangan terkait sesuai kebijakan perusahaan.\n2. Pembinaan intensif dan evaluasi berkala oleh atasan langsung.\n3. Apabila melakukan pelanggaran disiplin kembali, akan dikenakan sanksi tingkat berikutnya.',
      issuerName: currentUser?.fullName || currentUser?.name || 'HR Manager',
      issuerTitle: currentUser?.jobTitle || 'HR Manager',
      witnessName: '',
      notes: '',
      attachmentUrl: ''
    });
    setCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: WarningLetterRecord) => {
    setIsEditing(true);
    setSelectedRecord(rec);
    setFormData({
      id: rec.id,
      letterNumber: rec.letterNumber,
      employeeId: rec.employeeId,
      employeeCode: rec.employeeCode,
      employeeName: rec.employeeName,
      company: rec.company || '',
      department: rec.department || '',
      jobTitle: rec.jobTitle || '',
      spLevel: rec.spLevel,
      violationCategory: rec.violationCategory,
      incidentDate: rec.incidentDate,
      issuedDate: rec.issuedDate,
      validFrom: rec.validFrom,
      validUntil: rec.validUntil,
      chronology: rec.chronology,
      consequences: rec.consequences || '',
      issuerName: rec.issuerName || '',
      issuerTitle: rec.issuerTitle || 'HR Manager',
      witnessName: rec.witnessName || '',
      notes: rec.notes || '',
      attachmentUrl: rec.attachmentUrl || ''
    });
    setCreateModalOpen(true);
  };

  // Handle Employee Dropdown Change
  const handleSelectEmployee = (empId: string) => {
    const emp = employees.find(e => String(e.id) === String(empId));
    if (!emp) return;

    setFormData(prev => ({
      ...prev,
      employeeId: emp.id,
      employeeCode: emp.employee_code || '',
      employeeName: emp.full_name || '',
      company: emp.company || '',
      department: emp.department || '',
      jobTitle: emp.job_title || ''
    }));
  };

  // Handle Form Submit
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.employeeName) {
      toast.error('Silakan pilih karyawan terlebih dahulu');
      return;
    }
    if (!formData.letterNumber.trim()) {
      toast.error('Nomor surat wajib diisi');
      return;
    }
    if (!formData.chronology.trim()) {
      toast.error('Uraian kronologi pelanggaran wajib diisi');
      return;
    }
    if (!formData.validUntil) {
      toast.error('Masa berlaku surat wajib diisi');
      return;
    }

    try {
      if (isEditing && selectedRecord) {
        const res = await updateWarningLetter(selectedRecord.id, {
          letterNumber: formData.letterNumber.trim(),
          employeeId: formData.employeeId,
          employeeCode: formData.employeeCode,
          employeeName: formData.employeeName,
          company: formData.company,
          department: formData.department,
          jobTitle: formData.jobTitle,
          spLevel: formData.spLevel,
          violationCategory: formData.violationCategory,
          incidentDate: formData.incidentDate,
          issuedDate: formData.issuedDate,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          chronology: formData.chronology.trim(),
          consequences: formData.consequences.trim(),
          issuerName: formData.issuerName.trim(),
          issuerTitle: formData.issuerTitle.trim(),
          witnessName: formData.witnessName.trim(),
          notes: formData.notes.trim(),
          attachmentUrl: formData.attachmentUrl.trim()
        });

        if (res.data) {
          toast.success(`Catatan SP ${res.data.letterNumber} berhasil diperbarui!`);
          trackActivity({
            userId: currentUser?.id,
            userName: currentUser?.fullName || currentUser?.name || 'HR',
            userRole: currentUser?.role,
            userEmail: currentUser?.email,
            module: 'Catatan SP',
            action: 'UPDATE',
            details: `Memperbarui Surat Peringatan ${res.data.letterNumber} untuk karyawan ${res.data.employeeName}`
          }).catch(() => {});
        }
      } else {
        const res = await createWarningLetter({
          letterNumber: formData.letterNumber.trim(),
          employeeId: formData.employeeId,
          employeeCode: formData.employeeCode,
          employeeName: formData.employeeName,
          company: formData.company,
          department: formData.department,
          jobTitle: formData.jobTitle,
          spLevel: formData.spLevel,
          violationCategory: formData.violationCategory,
          incidentDate: formData.incidentDate,
          issuedDate: formData.issuedDate,
          validFrom: formData.validFrom,
          validUntil: formData.validUntil,
          chronology: formData.chronology.trim(),
          consequences: formData.consequences.trim(),
          issuerName: formData.issuerName.trim(),
          issuerTitle: formData.issuerTitle.trim(),
          witnessName: formData.witnessName.trim(),
          status: 'Aktif',
          notes: formData.notes.trim(),
          attachmentUrl: formData.attachmentUrl.trim()
        });

        if (res.data) {
          toast.success(`Surat Peringatan ${res.data.letterNumber} berhasil diterbitkan!`);
          trackActivity({
            userId: currentUser?.id,
            userName: currentUser?.fullName || currentUser?.name || 'HR',
            userRole: currentUser?.role,
            userEmail: currentUser?.email,
            module: 'Catatan SP',
            action: 'CREATE',
            details: `Menerbitkan ${res.data.spLevel} (${res.data.letterNumber}) untuk ${res.data.employeeName}`
          }).catch(() => {});
        }
      }

      setCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error('Gagal menyimpan catatan SP: ' + (err.message || 'Terjadi kesalahan'));
    }
  };

  // Handle Revoke Submit
  const handleConfirmRevoke = async () => {
    if (!selectedRecord) return;
    if (!revokeReason.trim()) {
      toast.error('Alasan pencabutan / pembatalan surat wajib diisi');
      return;
    }

    try {
      const revokedByName = currentUser?.fullName || currentUser?.name || 'HR Management';
      await revokeWarningLetter(selectedRecord.id, revokeReason.trim(), revokedByName);
      toast.success(`Surat ${selectedRecord.letterNumber} telah berhasil dicabut / dibatalkan`);
      trackActivity({
        userId: currentUser?.id,
        userName: revokedByName,
        userRole: currentUser?.role,
        userEmail: currentUser?.email,
        module: 'Catatan SP',
        action: 'REVOKE',
        details: `Mencabut SP ${selectedRecord.letterNumber} (${selectedRecord.employeeName}). Alasan: ${revokeReason}`
      }).catch(() => {});

      setRevokeModalOpen(false);
      setDetailModalOpen(false);
      setRevokeReason('');
      await loadData();
    } catch (err: any) {
      toast.error('Gagal mencabut SP: ' + err.message);
    }
  };

  // Handle Delete Record
  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    try {
      await deleteWarningLetter(selectedRecord.id);
      toast.success(`Catatan SP ${selectedRecord.letterNumber} berhasil dihapus`);
      trackActivity({
        userId: currentUser?.id,
        userName: currentUser?.fullName || currentUser?.name || 'Admin',
        userRole: currentUser?.role,
        userEmail: currentUser?.email,
        module: 'Catatan SP',
        action: 'DELETE',
        details: `Menghapus arsip SP ${selectedRecord.letterNumber} (${selectedRecord.employeeName})`
      }).catch(() => {});

      setDeleteConfirmOpen(false);
      setDetailModalOpen(false);
      setSelectedRecord(null);
      await loadData();
    } catch (err: any) {
      toast.error('Gagal menghapus data SP: ' + err.message);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.info('Tidak ada data SP untuk diekspor');
      return;
    }

    const headers = [
      'Nomor Surat',
      'NIP',
      'Nama Karyawan',
      'Perusahaan',
      'Departemen',
      'Jabatan',
      'Tingkat SP',
      'Kategori Pelanggaran',
      'Tanggal Kejadian',
      'Tanggal Diterbitkan',
      'Berlaku Mulai',
      'Berlaku Sampai',
      'Status',
      'Penerbit',
      'Kronologi Pelanggaran',
      'Sanksi / Konsekuensi'
    ];

    const rows = filteredRecords.map(r => [
      `"${r.letterNumber}"`,
      `"${r.employeeCode}"`,
      `"${r.employeeName}"`,
      `"${r.company || ''}"`,
      `"${r.department || ''}"`,
      `"${r.jobTitle || ''}"`,
      `"${r.spLevel}"`,
      `"${r.violationCategory}"`,
      `"${r.incidentDate}"`,
      `"${r.issuedDate}"`,
      `"${r.validFrom}"`,
      `"${r.validUntil}"`,
      `"${r.status}"`,
      `"${r.issuerName}"`,
      `"${(r.chronology || '').replace(/"/g, '""')}"`,
      `"${(r.consequences || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Catatan_SP_Karyawan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan SP berhasil diekspor ke file CSV');
  };

  // Helper for Level Badge
  const renderLevelBadge = (level: WarningLetterLevel) => {
    switch (level) {
      case 'Surat Teguran':
        return (
          <Badge className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60 font-semibold text-xs">
            Surat Teguran
          </Badge>
        );
      case 'SP 1':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 font-bold text-xs flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            SP 1 (Pertama)
          </Badge>
        );
      case 'SP 2':
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 font-bold text-xs flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            SP 2 (Kedua)
          </Badge>
        );
      case 'SP 3':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60 font-extrabold text-xs flex items-center gap-1 shadow-xs">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            SP 3 (Terakhir / Kritis)
          </Badge>
        );
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // Helper for Status Badge
  const renderStatusBadge = (status: WarningLetterStatus, validUntil: string) => {
    const today = new Date().toISOString().split('T')[0];
    const isExpired = validUntil < today;

    if (status === 'Dibatalkan') {
      return (
        <Badge variant="outline" className="border-slate-300 text-slate-500 line-through dark:border-zinc-700 dark:text-zinc-400 text-[11px]">
          Dibatalkan
        </Badge>
      );
    }
    if (status === 'Selesai' || isExpired) {
      return (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700 text-[11px]">
          Masa Berlaku Selesai
        </Badge>
      );
    }
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-semibold text-[11px] flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Aktif
      </Badge>
    );
  };

  // Format date helper
  const formatDateIndo = (dStr: string) => {
    if (!dStr) return '-';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-[#12346a]/10 dark:bg-blue-500/10 flex items-center justify-center text-[#12346a] dark:text-blue-400">
              <FileWarning className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                Catatan Surat Peringatan (SP) Karyawan
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 font-semibold">
                  HR Disciplinary
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Manajemen data sanksi kedisiplinan, Surat Teguran, SP 1, SP 2, SP 3, dan cetak dokumen resmi The Gesit Companies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs font-semibold h-9 rounded-xl border-slate-200 dark:border-[#222225] hover:bg-slate-100 dark:hover:bg-[#18181c]"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-600 dark:text-zinc-400" />
            Export Data
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs font-semibold h-9 rounded-xl bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Terbitkan SP Baru
          </Button>
        </div>
      </div>

      {/* Supabase Status Banner if table not migrated yet */}
      {isLocalOnly && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 dark:bg-amber-950/20 dark:border-amber-700/50 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Database className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold">Mode Penyimpanan Lokal Aktif:</span> Tabel Supabase <code className="bg-amber-200/60 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono">public.employee_warning_letters</code> belum dibuat di database.
              Data Anda saat ini aman tersimpan di browser. Jalankan file <code className="bg-amber-200/60 dark:bg-amber-900/40 px-1 py-0.5 rounded font-mono font-bold">supabase/10_employee_warning_letters.sql</code> di Supabase SQL Editor untuk sinkronisasi multi-user.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-[11px] h-7 bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700 font-semibold shrink-0"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Cek Ulang Supabase
          </Button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Terbit */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium">
            <span>Total Surat</span>
            <FileText className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats.total}</span>
            <span className="text-[11px] text-slate-500 font-medium">catatan</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400">
            {stats.activeCount} berstatus aktif saat ini
          </div>
        </div>

        {/* Surat Teguran */}
        <div className="rounded-2xl border border-sky-100 dark:border-sky-950/60 bg-sky-50/40 dark:bg-sky-950/10 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-sky-800 dark:text-sky-300 text-xs font-medium">
            <span>Teguran Lisan / ST</span>
            <Info className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-900 dark:text-sky-200">{stats.spTeguran}</span>
            <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">aktif</span>
          </div>
          <div className="mt-1 text-[10px] text-sky-700/80 dark:text-sky-400">
            Peringatan awal pembinaan
          </div>
        </div>

        {/* SP 1 */}
        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-950/60 bg-amber-50/40 dark:bg-amber-950/10 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-xs font-medium">
            <span>SP 1 (Pertama)</span>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-900 dark:text-amber-200">{stats.sp1}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">karyawan</span>
          </div>
          <div className="mt-1 text-[10px] text-amber-700/80 dark:text-amber-400">
            Masa berlaku 6 bulan
          </div>
        </div>

        {/* SP 2 */}
        <div className="rounded-2xl border border-orange-200/80 dark:border-orange-950/60 bg-orange-50/40 dark:bg-orange-950/10 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-orange-800 dark:text-orange-300 text-xs font-medium">
            <span>SP 2 (Kedua)</span>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-900 dark:text-orange-200">{stats.sp2}</span>
            <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">karyawan</span>
          </div>
          <div className="mt-1 text-[10px] text-orange-700/80 dark:text-orange-400">
            Peningkatan pengawasan
          </div>
        </div>

        {/* SP 3 */}
        <div className="rounded-2xl border border-rose-200/80 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/10 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-rose-800 dark:text-rose-300 text-xs font-medium">
            <span>SP 3 (Terakhir)</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-900 dark:text-rose-200">{stats.sp3}</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">kritis</span>
          </div>
          <div className="mt-1 text-[10px] text-rose-700/80 dark:text-rose-400">
            Tahap sanksi PHK
          </div>
        </div>

        {/* Selesai / Expired */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 text-xs font-medium">
            <span>Selesai / Dicabut</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-zinc-100">{stats.expired + stats.revoked}</span>
            <span className="text-[11px] text-slate-500 font-medium">arsip</span>
          </div>
          <div className="mt-1 text-[10px] text-slate-500 dark:text-zinc-400">
            {stats.expired} expired, {stats.revoked} dibatalkan
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama karyawan, NIP, nomor surat, departemen, atau kronologi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9.5 text-xs bg-slate-50/70 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Clear */}
          {(filterLevel !== 'all' || filterStatus !== 'all' || filterCompany !== 'all' || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterLevel('all');
                setFilterStatus('all');
                setFilterCompany('all');
                setFilterCategory('all');
              }}
              className="text-xs h-9 text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 shrink-0"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset Filter
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400 mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter:</span>
          </div>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Tingkat SP</option>
            <option value="Surat Teguran">Surat Teguran</option>
            <option value="SP 1">SP 1</option>
            <option value="SP 2">SP 2</option>
            <option value="SP 3">SP 3</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Semua Status</option>
            <option value="Aktif">Status: Aktif</option>
            <option value="Selesai">Status: Selesai (Expired)</option>
            <option value="Dibatalkan">Status: Dibatalkan</option>
          </select>

          {/* Company Filter */}
          {companiesList.length > 0 && (
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="text-xs h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-primary max-w-[180px] truncate"
            >
              <option value="all">Semua Perusahaan</option>
              {companiesList.map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          )}

          <div className="ml-auto text-xs text-slate-500 dark:text-zinc-400">
            Menampilkan <span className="font-bold text-slate-900 dark:text-zinc-100">{filteredRecords.length}</span> dari {records.length} data
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 dark:text-zinc-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Memuat catatan Surat Peringatan...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <FileWarning className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Tidak ada catatan SP yang sesuai</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
              {searchQuery || filterLevel !== 'all' || filterStatus !== 'all'
                ? 'Coba sesuaikan kata kunci pencarian atau ubah filter filter di atas.'
                : 'Belum ada data Surat Peringatan yang diterbitkan dalam sistem.'}
            </p>
            <div className="mt-4">
              <Button
                size="sm"
                onClick={handleOpenCreate}
                className="text-xs h-8 bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Terbitkan SP Pertama
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-[#222225] bg-slate-50/70 dark:bg-zinc-900/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  <th className="py-3.5 px-4">Nomor & Tanggal</th>
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4">Tingkat SP</th>
                  <th className="py-3.5 px-4">Kategori Pelanggaran</th>
                  <th className="py-3.5 px-4">Masa Berlaku</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#222225] text-xs">
                {filteredRecords.map(item => {
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#161619] transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedRecord(item);
                        setDetailModalOpen(true);
                      }}
                    >
                      {/* Nomor & Tanggal */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-[11px]">
                          {item.letterNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Terbit: {formatDateIndo(item.issuedDate)}</span>
                        </div>
                      </td>

                      {/* Karyawan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 rounded-lg border border-slate-200 dark:border-zinc-700">
                            <AvatarFallback className="bg-[#12346a] text-white font-bold text-[10px]">
                              {item.employeeName
                                ? item.employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                : 'EM'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-zinc-100">
                              {item.employeeName}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                              <span className="font-mono">{item.employeeCode}</span>
                              {item.department && <span>&bull; {item.department}</span>}
                            </div>
                            {item.company && (
                              <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate max-w-[170px]">
                                {item.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tingkat SP */}
                      <td className="py-3.5 px-4">
                        {renderLevelBadge(item.spLevel)}
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-zinc-200">
                          {item.violationCategory}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-[200px]" title={item.chronology}>
                          {item.chronology}
                        </div>
                      </td>

                      {/* Masa Berlaku */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 dark:text-zinc-200 font-medium">
                          s/d {formatDateIndo(item.validUntil)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>Mulai: {formatDateIndo(item.validFrom)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(item.status, item.validUntil)}
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* Print Letter Button */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-[#12346a] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                  onClick={() => {
                                    setSelectedRecord(item);
                                    setPrintModalOpen(true);
                                  }}
                                />
                              }
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent side="top">Cetak Surat Resmi</TooltipContent>
                          </Tooltip>

                          {/* Detail Button */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800"
                                  onClick={() => {
                                    setSelectedRecord(item);
                                    setDetailModalOpen(true);
                                  }}
                                />
                              }
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent side="top">Lihat Kronologi & Rincian</TooltipContent>
                          </Tooltip>

                          {/* Edit Button */}
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  onClick={() => handleOpenEdit(item)}
                                />
                              }
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </TooltipTrigger>
                            <TooltipContent side="top">Edit Data SP</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT WARNING LETTER */}
      {/* ========================================================================= */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-20 bg-white dark:bg-[#0c0c0e] px-6 py-4 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                <FileWarning className="h-5 w-5 text-[#12346a] dark:text-blue-400" />
                <span>{isEditing ? 'Perbarui Catatan SP Karyawan' : 'Terbitkan Surat Peringatan (SP) Baru'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Formulir resmi pendataan sanksi disipliner dan pembinaan karyawan The Gesit Companies.
              </DialogDescription>
            </div>
            <button
              onClick={() => setCreateModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSaveRecord} className="p-6 space-y-4">
            {/* Employee Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Pilih Karyawan Yang Diberikan Sanksi <span className="text-rose-500">*</span></span>
                {selectedEmployeeActiveSp && selectedEmployeeActiveSp.length > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Karyawan ini memiliki {selectedEmployeeActiveSp.length} SP aktif!
                  </span>
                )}
              </label>
              <select
                value={formData.employeeId}
                onChange={e => handleSelectEmployee(e.target.value)}
                disabled={isEditing}
                className="w-full text-xs h-9.5 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                <option value="">-- Pilih Nama Karyawan atau NIP --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_code || 'N/A'}) - {emp.company || 'The Gesit Companies'} - {emp.department || '-'}
                  </option>
                ))}
              </select>
            </div>

            {/* Readonly Employee Info Pill */}
            {formData.employeeName && (
              <div className="rounded-xl bg-slate-50 dark:bg-zinc-900/60 p-3 border border-slate-200/80 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Nama Karyawan:</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">{formData.employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NIP:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-zinc-200">{formData.employeeCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Perusahaan:</span>
                  <span className="font-medium text-slate-800 dark:text-zinc-200 truncate block">{formData.company || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Departemen / Jabatan:</span>
                  <span className="font-medium text-slate-800 dark:text-zinc-200 truncate block">{formData.department} ({formData.jobTitle || '-'})</span>
                </div>
              </div>
            )}

            {/* Nomor Surat & Tingkat SP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Nomor Registrasi Surat <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newNo = generateLetterNumber(formData.spLevel, records);
                      setFormData(prev => ({ ...prev, letterNumber: newNo }));
                    }}
                    className="text-[10px] text-primary hover:underline font-semibold"
                  >
                    Generate Otomatis
                  </button>
                </div>
                <Input
                  type="text"
                  value={formData.letterNumber}
                  onChange={e => setFormData(prev => ({ ...prev, letterNumber: e.target.value }))}
                  placeholder="Contoh: 004/SP-1/HR-GESIT/X/2026"
                  className="font-mono text-xs h-9 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Tingkat Surat Peringatan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.spLevel}
                  onChange={e => {
                    const newLevel = e.target.value as WarningLetterLevel;
                    setFormData(prev => ({
                      ...prev,
                      spLevel: newLevel,
                      letterNumber: !isEditing ? generateLetterNumber(newLevel, records) : prev.letterNumber
                    }));
                  }}
                  className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Surat Teguran">Surat Teguran (Lisan / Pembinaan)</option>
                  <option value="SP 1">SP 1 (Surat Peringatan Pertama)</option>
                  <option value="SP 2">SP 2 (Surat Peringatan Kedua)</option>
                  <option value="SP 3">SP 3 (Surat Peringatan Ketiga / Terakhir)</option>
                </select>
              </div>
            </div>

            {/* Kategori Pelanggaran */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Kategori Pelanggaran <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.violationCategory}
                onChange={e => setFormData(prev => ({ ...prev, violationCategory: e.target.value as WarningViolationCategory }))}
                className="w-full text-xs h-9 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Kedisiplinan & Presensi">Kedisiplinan & Presensi (Mangkir, Keterlambatan Kronis, Manipulasi Jam Kerja)</option>
                <option value="Kinerja & Target">Kinerja & Target (Tidak Memenuhi KPI / Kelalaian Tugas Pokok)</option>
                <option value="Pelanggaran SOP & Tata Tertib">Pelanggaran SOP & Tata Tertib (K3, Prosedur Operasional, Aturan Seragam)</option>
                <option value="Kode Etik & Integritas">Kode Etik & Integritas (Perilaku Tidak Pantas, Pertikaian, Gratifikasi)</option>
                <option value="Kelalaian Fasilitas / Finansial">Kelalaian Fasilitas / Finansial (Kerusakan Aset, Kelalaian Kas / Bon)</option>
                <option value="Kerahasiaan Data & Informasi">Kerahasiaan Data & Informasi (Kebocoran Rahasia Perusahaan)</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* Tanggal Kejadian, Terbit, Masa Berlaku */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Tanggal Kejadian <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.incidentDate}
                  onChange={e => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Tanggal Diterbitkan <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.issuedDate}
                  onChange={e => {
                    const newDate = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      issuedDate: newDate,
                      validFrom: newDate,
                      validUntil: calculateValidUntil(newDate)
                    }));
                  }}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Masa Berlaku Hingga <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Standar 6 Bulan</span>
                </label>
                <Input
                  type="date"
                  value={formData.validUntil}
                  onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                  className="text-xs h-9 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Kronologi Pelanggaran */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Kronologi & Uraian Fakta Pelanggaran <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={formData.chronology}
                onChange={e => setFormData(prev => ({ ...prev, chronology: e.target.value }))}
                placeholder="Jelaskan secara detail kejadian, tanggal, bukti, saksi, dan pasal/peraturan perusahaan yang dilanggar..."
                rows={4}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                required
              />
            </div>

            {/* Sanksi & Pembinaan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Konsekuensi, Sanksi & Rencana Pembinaan
              </label>
              <textarea
                value={formData.consequences}
                onChange={e => setFormData(prev => ({ ...prev, consequences: e.target.value }))}
                placeholder="Rincian sanksi administratif (penundaan berkala, evaluasi harian, pemotongan insentif, dll.)..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            {/* Pejabat Penerbit & Saksi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Nama Pejabat HR / Penandatangan
                </label>
                <Input
                  type="text"
                  value={formData.issuerName}
                  onChange={e => setFormData(prev => ({ ...prev, issuerName: e.target.value }))}
                  placeholder="Nama Pejabat HRD"
                  className="text-xs h-9 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Saksi / Atasan Langsung (Opsional)
                </label>
                <Input
                  type="text"
                  value={formData.witnessName}
                  onChange={e => setFormData(prev => ({ ...prev, witnessName: e.target.value }))}
                  placeholder="Nama Atasan Langsung / Saksi"
                  className="text-xs h-9 rounded-xl"
                />
              </div>
            </div>

            {/* Dokumen Lampiran URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Tautan Dokumen / Scan Surat Bertanda Tangan (Opsional)</span>
                <span className="text-[10px] text-slate-400">Google Drive / File URL</span>
              </label>
              <Input
                type="url"
                value={formData.attachmentUrl}
                onChange={e => setFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                placeholder="https://drive.google.com/..."
                className="text-xs h-9 rounded-xl font-mono"
              />
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-[#222225] flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs h-9 rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs h-9 rounded-xl bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <Check className="h-4 w-4 mr-1.5" />
                {isEditing ? 'Simpan Perubahan' : 'Terbitkan Surat Peringatan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL WARNING LETTER */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedRecord && (
            <div>
              {/* Header */}
              <div className="sticky top-0 z-20 bg-white dark:bg-[#0c0c0e] px-6 py-4 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-[#12346a]/10 dark:bg-blue-500/10 flex items-center justify-center text-[#12346a] dark:text-blue-400">
                    <FileWarning className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>Rincian {selectedRecord.spLevel}</span>
                      {renderLevelBadge(selectedRecord.spLevel)}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-mono text-slate-500 dark:text-zinc-400">
                      {selectedRecord.letterNumber}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setPrintModalOpen(true);
                    }}
                    className="text-xs h-8 rounded-lg"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1 text-slate-600 dark:text-zinc-300" />
                    Cetak Surat
                  </Button>
                  <button
                    onClick={() => setDetailModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Employee Profile Snapshot */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-slate-50/70 dark:bg-zinc-900/40 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11 rounded-xl border border-slate-200 dark:border-zinc-700">
                        <AvatarFallback className="bg-[#12346a] text-white font-bold text-sm">
                          {selectedRecord.employeeName
                            ? selectedRecord.employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'EM'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                          {selectedRecord.employeeName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-semibold">{selectedRecord.employeeCode}</span>
                          <span>&bull;</span>
                          <span>{selectedRecord.jobTitle || 'Staff'}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {selectedRecord.company} &bull; {selectedRecord.department}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-medium">Status SP</div>
                      <div className="mt-0.5">
                        {renderStatusBadge(selectedRecord.status, selectedRecord.validUntil)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200/60 dark:border-zinc-800 p-3 bg-white dark:bg-[#0c0c0e]">
                    <span className="text-[10px] text-slate-400 block font-medium">Tanggal Kejadian:</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-0.5 block">
                      {formatDateIndo(selectedRecord.incidentDate)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200/60 dark:border-zinc-800 p-3 bg-white dark:bg-[#0c0c0e]">
                    <span className="text-[10px] text-slate-400 block font-medium">Tanggal Diterbitkan:</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-0.5 block">
                      {formatDateIndo(selectedRecord.issuedDate)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200/60 dark:border-zinc-800 p-3 bg-white dark:bg-[#0c0c0e]">
                    <span className="text-[10px] text-slate-400 block font-medium">Berlaku Mulai:</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-0.5 block">
                      {formatDateIndo(selectedRecord.validFrom)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200/60 dark:border-zinc-800 p-3 bg-white dark:bg-[#0c0c0e]">
                    <span className="text-[10px] text-slate-400 block font-medium">Berlaku Hingga:</span>
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">
                      {formatDateIndo(selectedRecord.validUntil)}
                    </span>
                  </div>
                </div>

                {/* Kategori Pelanggaran */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Kategori Pelanggaran
                  </span>
                  <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    {selectedRecord.violationCategory}
                  </div>
                </div>

                {/* Kronologi */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Kronologi & Fakta Pelanggaran
                  </span>
                  <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30 p-3.5 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line">
                    {selectedRecord.chronology}
                  </div>
                </div>

                {/* Sanksi & Konsekuensi */}
                {selectedRecord.consequences && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Sanksi, Konsekuensi & Rencana Pembinaan
                    </span>
                    <div className="rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 p-3.5 text-xs text-amber-950 dark:text-amber-200 leading-relaxed whitespace-pre-line">
                      {selectedRecord.consequences}
                    </div>
                  </div>
                )}

                {/* Pihak Terkait */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Diterbitkan Oleh (HR):</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{selectedRecord.issuerName}</span>
                    <span className="text-[10px] text-slate-500 block">{selectedRecord.issuerTitle || 'HR Manager'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Saksi / Atasan Langsung:</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                      {selectedRecord.witnessName || 'Tidak dicantumkan'}
                    </span>
                  </div>
                </div>

                {/* Dokumen Lampiran if any */}
                {selectedRecord.attachmentUrl && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
                      <Paperclip className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Dokumen Bukti / Scan Surat Terlampir</span>
                    </div>
                    <a
                      href={selectedRecord.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-bold flex items-center gap-1 text-[11px]"
                    >
                      Buka Tautan <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Revoked Info if cancelled */}
                {selectedRecord.status === 'Dibatalkan' && (
                  <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3.5 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      <span>Surat Peringatan Telah Dibatalkan / Dicabut</span>
                    </div>
                    <div className="text-[11px]">
                      Alasan: {selectedRecord.revocationReason || '-'}
                    </div>
                    {selectedRecord.revokedBy && (
                      <div className="text-[10px] text-rose-700 dark:text-rose-400 mt-1">
                        Dicabut oleh: {selectedRecord.revokedBy} pada {formatDateIndo(selectedRecord.revokedAt || '')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="sticky bottom-0 z-20 bg-slate-50 dark:bg-[#0c0c0e] px-6 py-3.5 border-t border-slate-200 dark:border-[#222225] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedRecord.status === 'Aktif' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRevokeModalOpen(true)}
                      className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 rounded-xl"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Cabut / Batalkan SP
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="text-xs h-8 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Hapus
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      handleOpenEdit(selectedRecord);
                    }}
                    className="text-xs h-8 rounded-xl"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit Data
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setDetailModalOpen(false);
                      setPrintModalOpen(true);
                    }}
                    className="text-xs h-8 bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1" />
                    Cetak Surat Resmi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: PRINTABLE OFFICIAL LETTER (A4 FORMAT) */}
      {/* ========================================================================= */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
          {selectedRecord && (
            <div>
              {/* Header Toolbar (Hidden when printing) */}
              <div className="sticky top-0 z-20 bg-white dark:bg-[#0c0c0e] px-6 py-3 border-b border-slate-200 dark:border-[#222225] flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Pratinjau Surat Resmi &bull; {selectedRecord.letterNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="text-xs h-8 bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
                  >
                    <Printer className="h-3.5 w-3.5 mr-1.5" />
                    Cetak Dokumen / Simpan PDF
                  </Button>
                  <button
                    onClick={() => setPrintModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet (Standard Indonesian Corporate A4 Format) */}
              <div className="p-8 sm:p-12 bg-white text-slate-900 font-serif leading-relaxed text-sm max-w-3xl mx-auto shadow-sm my-4 print:m-0 print:p-6 print:shadow-none">
                {/* Letterhead (Kop Surat) */}
                <div className="border-b-2 border-slate-900 pb-4 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/image/logo.png" alt="Logo" className="h-14 w-auto object-contain" />
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-wider text-[#12346a]">
                        THE GESIT COMPANIES
                      </h2>
                      <div className="text-xs font-sans text-slate-600 tracking-wide font-medium">
                        {selectedRecord.company || 'PT GESIT PEOPLE INDONESIA'}
                      </div>
                      <div className="text-[10px] font-sans text-slate-500">
                        Human Capital Management & Disciplinary Committee
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] font-sans text-slate-500">
                    <div>Gedung Gesit Lantai 5</div>
                    <div>Jl. Mega Kuningan Barat No. 3, Jakarta Selatan</div>
                    <div>Telepon: (021) 5790-2888</div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center my-6">
                  <h1 className="text-lg font-bold uppercase tracking-wide underline underline-offset-4">
                    {selectedRecord.spLevel === 'Surat Teguran'
                      ? 'SURAT TEGURAN TERTULIS'
                      : `SURAT PERINGATAN ${selectedRecord.spLevel.replace('SP', '').trim() === '1' ? 'PERTAMA (SP I)' : selectedRecord.spLevel.replace('SP', '').trim() === '2' ? 'KEDUA (SP II)' : 'KETIGA (SP III)'}`}
                  </h1>
                  <div className="text-xs font-mono font-semibold text-slate-700 mt-1">
                    Nomor: {selectedRecord.letterNumber}
                  </div>
                </div>

                {/* Surat Diberikan Kepada */}
                <div className="space-y-1.5 my-6 font-sans text-xs">
                  <p>Surat Peringatan ini diberikan kepada:</p>
                  <div className="grid grid-cols-[140px_10px_1fr] gap-y-1 pl-4">
                    <div className="font-semibold">Nama Karyawan</div>
                    <div>:</div>
                    <div className="font-bold">{selectedRecord.employeeName}</div>

                    <div className="font-semibold">Nomor Induk Karyawan (NIP)</div>
                    <div>:</div>
                    <div className="font-mono">{selectedRecord.employeeCode}</div>

                    <div className="font-semibold">Jabatan</div>
                    <div>:</div>
                    <div>{selectedRecord.jobTitle || '-'}</div>

                    <div className="font-semibold">Departemen</div>
                    <div>:</div>
                    <div>{selectedRecord.department}</div>

                    <div className="font-semibold">Perusahaan</div>
                    <div>:</div>
                    <div>{selectedRecord.company}</div>
                  </div>
                </div>

                {/* Isi Pertimbangan & Pelanggaran */}
                <div className="space-y-4 my-6 text-xs text-justify">
                  <p>
                    Berdasarkan hasil evaluasi kedisiplinan dan investigasi internal Human Capital Management bersama atasan langsung, dengan ini diberitahukan bahwa Saudara/i telah melakukan tindakan indisipliner / pelanggaran terhadap Peraturan Perusahaan (PP) dan Standar Operasional Prosedur (SOP) yang berlaku di The Gesit Companies.
                  </p>

                  <div className="space-y-1.5">
                    <div className="font-bold underline">Uraian Kejadian & Kronologi Pelanggaran:</div>
                    <div className="pl-4 italic whitespace-pre-line bg-slate-50 p-3 border-l-2 border-slate-400">
                      {selectedRecord.chronology}
                    </div>
                  </div>

                  <p>
                    Sehubungan dengan hal tersebut di atas, manajemen memutuskan untuk menerbitkan <strong>{selectedRecord.spLevel}</strong> kepada Saudara/i sebagai tindakan korektif dan pembinaan agar tidak mengulangi kesalahan serupa atau melakukan pelanggaran lainnya di masa mendatang.
                  </p>

                  {selectedRecord.consequences && (
                    <div className="space-y-1">
                      <div className="font-bold underline">Sanksi & Ketentuan Pembinaan:</div>
                      <div className="pl-4 whitespace-pre-line">
                        {selectedRecord.consequences}
                      </div>
                    </div>
                  )}

                  <p>
                    Surat Peringatan ini berlaku terhitung sejak tanggal <strong>{formatDateIndo(selectedRecord.validFrom)}</strong> sampai dengan tanggal <strong>{formatDateIndo(selectedRecord.validUntil)}</strong> (selama 6 bulan kalender). Apabila dalam kurun waktu masa berlaku Surat Peringatan ini Saudara/i kembali melakukan pelanggaran tata tertib kerja, maka manajemen berhak memberikan sanksi yang lebih berat hingga pemutusan hubungan kerja (PHK) sesuai ketentuan perundang-undangan ketenagakerjaan yang berlaku.
                  </p>

                  <p>
                    Demikian Surat Peringatan ini dibuat dan diterbitkan agar menjadi perhatian sungguh-sungguh serta perbaikan kinerja bagi Saudara/i yang bersangkutan.
                  </p>
                </div>

                {/* Tanggal & Tempat Terbit */}
                <div className="text-right text-xs my-6 font-sans">
                  Jakarta, {formatDateIndo(selectedRecord.issuedDate)}
                </div>

                {/* Kolom Tanda Tangan */}
                <div className="grid grid-cols-3 gap-4 text-center text-xs mt-12 pt-4 font-sans">
                  {/* Penerima */}
                  <div>
                    <div className="font-semibold">Menerima & Memahami,</div>
                    <div className="text-[10px] text-slate-500">Karyawan Yang Bersangkutan</div>
                    <div className="h-20 flex items-end justify-center">
                      <div className="border-b border-slate-400 w-36" />
                    </div>
                    <div className="font-bold mt-1 underline">{selectedRecord.employeeName}</div>
                    <div className="text-[10px] font-mono text-slate-500">NIP: {selectedRecord.employeeCode}</div>
                  </div>

                  {/* Atasan Langsung */}
                  <div>
                    <div className="font-semibold">Mengetahui,</div>
                    <div className="text-[10px] text-slate-500">Atasan Langsung / Saksi</div>
                    <div className="h-20 flex items-end justify-center">
                      <div className="border-b border-slate-400 w-36" />
                    </div>
                    <div className="font-bold mt-1 underline">{selectedRecord.witnessName || '(....................................)'}</div>
                    <div className="text-[10px] text-slate-500">Supervisor / Manager</div>
                  </div>

                  {/* HR & Management */}
                  <div>
                    <div className="font-semibold">Diterbitkan Oleh,</div>
                    <div className="text-[10px] text-slate-500">Human Capital Management</div>
                    <div className="h-20 flex items-end justify-center">
                      <div className="border-b border-slate-400 w-36" />
                    </div>
                    <div className="font-bold mt-1 underline">{selectedRecord.issuerName}</div>
                    <div className="text-[10px] text-slate-500">{selectedRecord.issuerTitle || 'HR Manager'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: REVOKE / CANCEL SP */}
      {/* ========================================================================= */}
      <Dialog open={revokeModalOpen} onOpenChange={setRevokeModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>Pencabutan / Pembatalan Surat Peringatan</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Apakah Anda yakin ingin membatalkan/mencabut sanksi SP untuk{' '}
              <strong>{selectedRecord?.employeeName}</strong> ({selectedRecord?.letterNumber})?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Alasan Pencabutan / Mediasi <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="Contoh: Berdasarkan hasil mediasi tripartit/internal, karyawan telah membuktikan kekeliruan data presensi dan sanksi dicabut secara resmi..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRevokeModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmRevoke}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Ya, Cabut SP Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: DELETE CONFIRMATION */}
      {/* ========================================================================= */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm p-6 text-center">
          <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="h-6 w-6" />
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100">
            Hapus Catatan SP?
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Data surat peringatan <strong>{selectedRecord?.letterNumber}</strong> atas nama{' '}
            <strong>{selectedRecord?.employeeName}</strong> akan dihapus permanen dari arsip.
          </DialogDescription>
          <DialogFooter className="mt-5 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
              className="text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmDelete}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold"
            >
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
