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
  Database,
  ChevronDown,
  UserCheck,
  Briefcase,
  Scale,
  FileCheck2,
  BadgeCheck,
  ArrowRight,
  HelpCircle
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

export const VIOLATION_PRESETS = [
  {
    title: 'Mangkir Kerja 3+ Hari',
    category: 'Kedisiplinan & Presensi' as WarningViolationCategory,
    defaultLevel: 'SP 1' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan tidak hadir bekerja tanpa keterangan yang sah (mangkir / alpha) selama 3 (tiga) hari berturut-turut pada tanggal [isi tanggal], serta tidak dapat dihubungi oleh atasan langsung maupun pihak HRD, melanggar ketentuan Pasal 24 Peraturan Perusahaan.',
    consequencesTemplate: '1. Pemotongan tunjangan kehadiran secara proporsional sesuai jumlah hari mangkir.\n2. Wajib melapor dan mengikuti pembinaan berkala bersama Atasan Langsung setiap minggu.\n3. Apabila mengulangi pelanggaran serupa dalam kurun 6 bulan, sanksi akan ditingkatkan ke SP 2.'
  },
  {
    title: 'Keterlambatan Kronis (>5x)',
    category: 'Kedisiplinan & Presensi' as WarningViolationCategory,
    defaultLevel: 'Surat Teguran' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan tercatat melakukan keterlambatan jam masuk kerja lebih dari 5 (lima) kali dalam periode 1 (satu) bulan berjalan tanpa persetujuan tertulis dari atasan langsung, melanggar ketentuan jam operasional kantor.',
    consequencesTemplate: '1. Diberikan catatan teguran tertulis dalam berkas personalia karyawan.\n2. Evaluasi jam kehadiran harian bersama Section Head selama 30 hari ke depan.'
  },
  {
    title: 'Pelanggaran K3 & APD',
    category: 'Pelanggaran SOP & Tata Tertib' as WarningViolationCategory,
    defaultLevel: 'SP 1' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan tidak menggunakan Alat Pelindung Diri (APD) standar keselamatan kerja (Safety Helmet & Safety Shoes) saat bertugas di area muat material berat, yang berpotensi membahayakan keselamatan diri dan rekan kerja.',
    consequencesTemplate: '1. Kewajiban mengikuti kembali sesi induksi K3 internal selama 1 sesi penuh.\n2. Peringatan keras dan penugasan dalam pengawasan ketat petugas K3 lapangan.'
  },
  {
    title: 'Pengabaian Instruksi Kerja',
    category: 'Pelanggaran SOP & Tata Tertib' as WarningViolationCategory,
    defaultLevel: 'SP 2' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan dengan sengaja tidak menjalankan prosedur operasional baku (SOP) pekerjaan yang telah diinstruksikan secara tertulis oleh atasan langsung, sehingga menyebabkan kendala pada deliverable operasional.',
    consequencesTemplate: '1. Penundaan evaluasi berkala kenaikan golongan kerja.\n2. Pengawasan langsung lembar kerja harian (daily log sheet) oleh Manager Departemen.'
  },
  {
    title: 'Pelanggaran Kode Etik',
    category: 'Kode Etik & Integritas' as WarningViolationCategory,
    defaultLevel: 'SP 3' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan terbukti melakukan tindakan pertikaian fisik / perkataan tidak pantas yang mengganggu ketertiban di lingkungan kerja, melanggar Kode Etik Integritas Perusahaan dan Peraturan Perusahaan Tingkat Berat.',
    consequencesTemplate: '1. Skorsing sementara selama proses investigasi manajemen berlangsung.\n2. Merupakan peringatan terakhir sebelum sanksi Pemutusan Hubungan Kerja (PHK) apabila terjadi pelanggaran disiplin kembali.'
  },
  {
    title: 'Kelalaian Fasilitas / Aset',
    category: 'Kelalaian Fasilitas / Finansial' as WarningViolationCategory,
    defaultLevel: 'SP 1' as WarningLetterLevel,
    chronologyTemplate: 'Karyawan lalai dalam memelihara dan mengamankan aset operasional kantor yang dipercayakan kepadanya, mengakibatkan kerusakan unit peralatan yang menimbulkan hambatan kerja.',
    consequencesTemplate: '1. Tanggung jawab pemulihan aset sesuai prosedur internal perusahaan.\n2. Evaluasi pemakaian fasilitas perusahaan selama 3 bulan.'
  }
];

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

  // Searchable Employee Combobox State
  const [empSearchInput, setEmpSearchInput] = useState('');
  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

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
    setEmpSearchInput('');
    setEmpDropdownOpen(false);
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
      consequences: '1. Pemotongan tunjangan kehadiran secara proporsional sesuai hari pelanggaran.\n2. Pembinaan intensif dan evaluasi mingguan bersama atasan langsung.\n3. Apabila terjadi pelanggaran kembali dalam kurun waktu 6 bulan, sanksi ditingkatkan ke tingkat berikutnya.',
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
    setEmpSearchInput('');
    setEmpDropdownOpen(false);
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

  // Filtered employee suggestions for combobox
  const filteredEmpList = useMemo(() => {
    if (!empSearchInput.trim()) return employees.slice(0, 10);
    const q = empSearchInput.toLowerCase().trim();
    return employees.filter(e =>
      (e.full_name && e.full_name.toLowerCase().includes(q)) ||
      (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
      (e.department && e.department.toLowerCase().includes(q)) ||
      (e.company && e.company.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [employees, empSearchInput]);

  // Apply Violation Preset
  const handleApplyPreset = (preset: typeof VIOLATION_PRESETS[0]) => {
    const today = formData.incidentDate || formData.issuedDate || new Date().toISOString().split('T')[0];
    const chronology = preset.chronologyTemplate.replace('[isi tanggal]', formatDateIndo(today));
    setFormData(prev => ({
      ...prev,
      violationCategory: preset.category,
      spLevel: prev.spLevel || preset.defaultLevel,
      chronology: chronology,
      consequences: preset.consequencesTemplate
    }));
    toast.info(`Template kasus "${preset.title}" diterapkan ke formulir.`);
  };

  // Handle Employee Selection
  const handleSelectEmployee = (empId: string | number) => {
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
    setEmpDropdownOpen(false);
    setEmpSearchInput('');
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
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-5xl md:max-w-5xl lg:max-w-5xl w-full max-h-[92vh] overflow-hidden p-0 border-slate-200/80 dark:border-[#222225] shadow-2xl rounded-2xl flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md px-6 py-4 border-b border-slate-200/80 dark:border-[#222225] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#12346a] text-white flex items-center justify-center shadow-xs">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
                  <span>{isEditing ? 'Perbarui Catatan Surat Peringatan' : 'Penerbitan Surat Peringatan (SP)'}</span>
                  <Badge className="bg-[#12346a]/10 text-[#12346a] dark:bg-blue-900/30 dark:text-blue-300 border-none text-[10px] font-semibold">
                    HCM & Legal Disciplinary
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 normal-case tracking-normal">
                  Dokumen resmi penegakan disiplin kerja dan pembinaan personalia sesuai PP No. 35/2021 & Peraturan Perusahaan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex text-[11px] text-slate-600 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-700">
                PP No. 35/2021
              </span>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Form Body - Scrollable 2-Column Layout */}
          <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:thin]">
            <form id="sp-form" onSubmit={handleSaveRecord} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Input Dossier (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* SECTION 1: IDENTITAS KARYAWAN */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4.5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      <UserCheck className="h-4 w-4 text-[#12346a] dark:text-blue-400" />
                      <span>1. Data Karyawan & Registrasi Surat</span>
                    </div>
                    {formData.employeeName && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            employeeId: '',
                            employeeCode: '',
                            employeeName: '',
                            company: '',
                            department: '',
                            jobTitle: ''
                          }));
                          setEmpSearchInput('');
                        }}
                        className="text-[11px] text-primary hover:underline font-semibold"
                      >
                        Ganti Karyawan
                      </button>
                    )}
                  </div>

                  {/* Searchable Picker when not selected */}
                  {!formData.employeeId ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Cari Nama Karyawan atau NIP <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="text"
                          placeholder="Ketik nama karyawan atau NIP..."
                          value={empSearchInput}
                          onChange={e => {
                            setEmpSearchInput(e.target.value);
                            setEmpDropdownOpen(true);
                          }}
                          onFocus={() => setEmpDropdownOpen(true)}
                          className="pl-9 h-9.5 text-xs rounded-xl"
                        />
                      </div>

                      {/* Dropdown suggestions */}
                      {empDropdownOpen && (
                        <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800 mt-1">
                          {filteredEmpList.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-400">
                              Tidak ada karyawan yang cocok dengan pencarian "{empSearchInput}"
                            </div>
                          ) : (
                            filteredEmpList.map(emp => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => handleSelectEmployee(emp.id)}
                                className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar className="h-7 w-7 rounded-lg shrink-0">
                                    <AvatarFallback className="bg-[#12346a] text-white font-bold text-[10px]">
                                      {emp.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-bold text-slate-800 dark:text-zinc-200 truncate">{emp.full_name}</div>
                                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                      <span className="font-mono">{emp.employee_code || '-'}</span>
                                      <span>&bull;</span>
                                      <span className="truncate">{emp.department || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-medium shrink-0 max-w-[120px] truncate">
                                  {emp.company || 'The Gesit Companies'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* High-end Selected Employee Card */
                    <div className="rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/50 p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-10 w-10 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
                            <AvatarFallback className="bg-[#12346a] text-white font-bold text-xs">
                              {formData.employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-zinc-100 text-sm truncate">
                              {formData.employeeName}
                            </h4>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                              <span className="font-mono font-bold bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200">
                                {formData.employeeCode || '-'}
                              </span>
                              <span>&bull;</span>
                              <span className="truncate font-medium">{formData.jobTitle || 'Staff Karyawan'}</span>
                            </div>
                          </div>
                        </div>

                        <Badge variant="outline" className="text-[10px] bg-white dark:bg-zinc-800 font-semibold border-slate-200 dark:border-zinc-700 shrink-0">
                          {formData.company || 'The Gesit Companies'}
                        </Badge>
                      </div>

                      {/* Active SP Alert if any */}
                      {selectedEmployeeActiveSp && selectedEmployeeActiveSp.length > 0 && (
                        <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold">Peringatan Rekam Disiplin:</span> Karyawan ini memegang{' '}
                            <strong>{selectedEmployeeActiveSp[0].spLevel} aktif</strong> hingga{' '}
                            <strong>{formatDateIndo(selectedEmployeeActiveSp[0].validUntil)}</strong>. Disarankan menaikkan tingkat ke SP berikutnya.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nomor Surat Formatter */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Nomor Registrasi Surat <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const newNo = generateLetterNumber(formData.spLevel, records);
                            setFormData(prev => ({ ...prev, letterNumber: newNo }));
                            toast.success('Nomor surat di-generate otomatis.');
                          }}
                          className="text-[10px] text-primary hover:underline font-semibold"
                        >
                          Generate Ulang
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={formData.letterNumber}
                        onChange={e => setFormData(prev => ({ ...prev, letterNumber: e.target.value }))}
                        className="font-mono text-xs h-9 rounded-xl bg-white dark:bg-zinc-900 font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Departemen / Divisi
                      </label>
                      <Input
                        type="text"
                        value={formData.department}
                        onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                        placeholder="Departemen karyawan"
                        className="text-xs h-9 rounded-xl bg-slate-50/50 dark:bg-zinc-900"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: KLASIFIKASI TINGKAT SP (VISUAL CARDS) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4.5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      <ShieldAlert className="h-4 w-4 text-[#12346a] dark:text-blue-400" />
                      <span>2. Tingkat & Klasifikasi Sanksi</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Pilih salah satu tingkatan</span>
                  </div>

                  {/* 4 Cards Grid */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Card 1: Surat Teguran */}
                    <div
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          spLevel: 'Surat Teguran',
                          letterNumber: !isEditing ? generateLetterNumber('Surat Teguran', records) : prev.letterNumber
                        }));
                      }}
                      className={`rounded-xl p-3 border cursor-pointer transition-all ${
                        formData.spLevel === 'Surat Teguran'
                          ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-800 dark:text-sky-300">Surat Teguran</span>
                        {formData.spLevel === 'Surat Teguran' ? (
                          <BadgeCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Tahap Awal</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                        Teguran tertulis pembinaan awal atas disiplin kerja ringan sebelum sanksi SP.
                      </div>
                    </div>

                    {/* Card 2: SP 1 */}
                    <div
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          spLevel: 'SP 1',
                          letterNumber: !isEditing ? generateLetterNumber('SP 1', records) : prev.letterNumber
                        }));
                      }}
                      className={`rounded-xl p-3 border cursor-pointer transition-all ${
                        formData.spLevel === 'SP 1'
                          ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          SP 1 (Pertama)
                        </span>
                        {formData.spLevel === 'SP 1' ? (
                          <BadgeCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">6 Bulan</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                        Peringatan pertama formal berbobot sedang. Masa berlaku 6 bulan kalender.
                      </div>
                    </div>

                    {/* Card 3: SP 2 */}
                    <div
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          spLevel: 'SP 2',
                          letterNumber: !isEditing ? generateLetterNumber('SP 2', records) : prev.letterNumber
                        }));
                      }}
                      className={`rounded-xl p-3 border cursor-pointer transition-all ${
                        formData.spLevel === 'SP 2'
                          ? 'border-orange-500 bg-orange-50/80 dark:bg-orange-950/40 ring-2 ring-orange-500/20'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-800 dark:text-orange-300 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          SP 2 (Kedua)
                        </span>
                        {formData.spLevel === 'SP 2' ? (
                          <BadgeCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        ) : (
                          <span className="text-[10px] text-orange-600 font-medium">Eskalasi</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                        Pengulangan pelanggaran / pengawasan intensif manajerial.
                      </div>
                    </div>

                    {/* Card 4: SP 3 */}
                    <div
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          spLevel: 'SP 3',
                          letterNumber: !isEditing ? generateLetterNumber('SP 3', records) : prev.letterNumber
                        }));
                      }}
                      className={`rounded-xl p-3 border cursor-pointer transition-all ${
                        formData.spLevel === 'SP 3'
                          ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                          SP 3 (Terakhir)
                        </span>
                        {formData.spLevel === 'SP 3' ? (
                          <BadgeCheck className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <span className="text-[10px] text-rose-600 font-bold">Kritis</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">
                        Sanksi tingkat kritis. Peringatan terakhir sebelum pemutusan hubungan kerja (PHK).
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: KRONOLOGI & TEMPLATE KASUS */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4.5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      <FileText className="h-4 w-4 text-[#12346a] dark:text-blue-400" />
                      <span>3. Berita Acara & Fakta Kejadian</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Pilih template kasus atau tulis bebas</span>
                  </div>

                  {/* Kategori Pelanggaran Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
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

                  {/* Presets Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Template Kasus Standar HR Gesit (Klik untuk mengisi cepat):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {VIOLATION_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-950/30 text-slate-700 dark:text-zinc-300 hover:text-[#12346a] dark:hover:text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span>{preset.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Tanggal Kejadian <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="date"
                        value={formData.incidentDate}
                        onChange={e => setFormData(prev => ({ ...prev, incidentDate: e.target.value }))}
                        className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Tanggal Terbit <span className="text-rose-500">*</span>
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
                        className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                          Berlaku Hingga <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[9px] text-[#12346a] dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-1 rounded">
                          +6 Bulan
                        </span>
                      </div>
                      <Input
                        type="date"
                        value={formData.validUntil}
                        onChange={e => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                        className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900 font-semibold"
                        required
                      />
                    </div>
                  </div>

                  {/* Kronologi Textarea */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Rincian Fakta & Kronologi Pelanggaran <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={formData.chronology}
                      onChange={e => setFormData(prev => ({ ...prev, chronology: e.target.value }))}
                      placeholder="Jelaskan secara formal fakta kejadian, waktu, saksi, dan pasal Peraturan Perusahaan yang dilanggar..."
                      rows={4}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                      required
                    />
                  </div>

                  {/* Sanksi & Pembinaan */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Konsekuensi Sanksi & Ketentuan Pembinaan
                    </label>
                    <textarea
                      value={formData.consequences}
                      onChange={e => setFormData(prev => ({ ...prev, consequences: e.target.value }))}
                      placeholder="Rincian sanksi administratif, pembinaan atasan, atau kewajiban perbaikan kinerja..."
                      rows={3}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                    />
                  </div>
                </div>

                {/* SECTION 4: PEJABAT PENGESAH & LAMPIRAN */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] p-4.5 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-zinc-200">
                      <Briefcase className="h-4 w-4 text-[#12346a] dark:text-blue-400" />
                      <span>4. Pengesahan & Bukti Pendukung</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Pejabat HR Penandatangan
                      </label>
                      <Input
                        type="text"
                        value={formData.issuerName}
                        onChange={e => setFormData(prev => ({ ...prev, issuerName: e.target.value }))}
                        className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                        Saksi / Atasan Langsung (Opsional)
                      </label>
                      <Input
                        type="text"
                        value={formData.witnessName}
                        onChange={e => setFormData(prev => ({ ...prev, witnessName: e.target.value }))}
                        placeholder="Nama Atasan Langsung / Saksi Lapangan"
                        className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Tautan Berkas / Scan Bukti (Google Drive)</span>
                      <span className="text-[10px] text-slate-400 font-normal">URL Cloud Storage</span>
                    </label>
                    <Input
                      type="url"
                      value={formData.attachmentUrl}
                      onChange={e => setFormData(prev => ({ ...prev, attachmentUrl: e.target.value }))}
                      placeholder="https://drive.google.com/..."
                      className="text-xs h-8.5 rounded-xl bg-white dark:bg-zinc-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LIVE OFFICIAL DOCUMENT PREVIEW (5 Cols) */}
              <div className="lg:col-span-5">
                <div className="sticky top-0 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#111114] p-4.5 shadow-sm space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold tracking-wider text-slate-700 dark:text-zinc-200">
                        Pratinjau Surat Resmi
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border-slate-200 dark:border-zinc-700">
                      Live Kop Surat
                    </Badge>
                  </div>

                  {/* Document Sheet Card */}
                  <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0c0c0e] p-4.5 font-serif leading-relaxed shadow-sm space-y-3.5 text-xs text-slate-800 dark:text-zinc-200">
                    {/* Official Kop Surat */}
                    <div className="border-b-2 border-slate-900 dark:border-zinc-600 pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img src="/image/logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                          <div>
                            <div className="text-xs font-black tracking-wide text-[#12346a] dark:text-blue-400 font-sans">
                              THE GESIT COMPANIES
                            </div>
                            <div className="text-[9px] font-sans text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[170px]">
                              {formData.company || 'Corporate Human Capital'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                            {formData.letterNumber || '001/SP-1/HR-GESIT/X/2026'}
                          </div>
                          <div className="text-[9px] text-slate-400 font-sans">
                            {formatDateIndo(formData.issuedDate)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Judul & Nomor Surat */}
                    <div className="text-center py-1">
                      <div className="text-xs font-black uppercase underline tracking-wider text-slate-900 dark:text-zinc-100 font-sans">
                        {formData.spLevel === 'Surat Teguran'
                          ? 'SURAT TEGURAN TERTULIS'
                          : `SURAT PERINGATAN ${formData.spLevel.replace('SP', '').trim() === '1' ? 'PERTAMA (SP I)' : formData.spLevel.replace('SP', '').trim() === '2' ? 'KEDUA (SP II)' : 'KETIGA (SP III)'}`}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                        Status: Sanksi Disipliner Karyawan
                      </div>
                    </div>

                    {/* Recipient Box */}
                    <div className="rounded-lg bg-slate-50 dark:bg-zinc-900/60 p-3 font-sans text-[11px] border border-slate-100 dark:border-zinc-800 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Diberikan Kepada:</div>
                      <div className="font-bold text-slate-900 dark:text-zinc-100 text-xs">
                        {formData.employeeName || '(Nama karyawan belum dipilih)'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 flex flex-wrap items-center gap-1.5 font-mono">
                        <span>NIP: {formData.employeeCode || '-'}</span>
                        <span>&bull;</span>
                        <span>{formData.jobTitle || 'Staff'}</span>
                        <span>&bull;</span>
                        <span>{formData.department || '-'}</span>
                      </div>
                    </div>

                    {/* Legal Validity Banner */}
                    <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 p-2.5 font-sans text-[10px] text-blue-900 dark:text-blue-200 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>Masa Berlaku (6 Bulan):</span>
                      </div>
                      <span className="font-bold font-mono">
                        {formatDateIndo(formData.validFrom)} s/d {formatDateIndo(formData.validUntil)}
                      </span>
                    </div>

                    {/* Violation Excerpt */}
                    <div className="font-sans text-[10px] space-y-1">
                      <div className="text-slate-400 uppercase font-bold text-[9px] tracking-wider">Fakta Pelanggaran:</div>
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-300 italic text-[11px] leading-relaxed border border-slate-100 dark:border-zinc-800/80 max-h-28 overflow-y-auto">
                        {formData.chronology || '(Rincian pelanggaran dan kronologi akan tampil di sini)'}
                      </div>
                    </div>

                    {/* Signatures Preview */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-3 text-center font-sans text-[10px]">
                      <div>
                        <div className="text-slate-400 text-[9px]">Karyawan:</div>
                        <div className="h-7" />
                        <div className="font-bold underline text-slate-800 dark:text-zinc-200 truncate">{formData.employeeName || '(Karyawan)'}</div>
                        <div className="text-[9px] font-mono text-slate-400">NIP: {formData.employeeCode || '-'}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[9px]">Pejabat HR:</div>
                        <div className="h-7" />
                        <div className="font-bold underline text-slate-800 dark:text-zinc-200 truncate">{formData.issuerName || 'HR Manager'}</div>
                        <div className="text-[9px] text-slate-400">{formData.issuerTitle || 'HR Department'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Regulatory Compliance Footer */}
                  <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 p-3 text-[10px] text-slate-500 dark:text-zinc-400 space-y-1 bg-white/80 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-zinc-300">
                      <Scale className="h-3.5 w-3.5 text-[#12346a] dark:text-blue-400" />
                      <span>Kepatuhan Regulasi Ketenagakerjaan</span>
                    </div>
                    <p className="leading-relaxed">
                      Sesuai PP No. 35/2021 Pasal 52, surat peringatan memiliki masa berlaku 6 bulan kalender. Pengulangan dalam masa aktif berhak dinaikkan ke tingkat sanksi berikutnya.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Sticky Modal Footer */}
          <div className="sticky bottom-0 z-30 bg-slate-50 dark:bg-[#0c0c0e] px-6 py-3.5 border-t border-slate-200/80 dark:border-[#222225] flex items-center justify-between shrink-0">
            <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Semua data tersinkronisasi dengan database Gesit People</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="text-xs h-9 rounded-xl px-4 cursor-pointer"
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="sp-form"
                size="sm"
                className="text-xs h-9 rounded-xl bg-[#12346a] hover:bg-[#1a448a] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold shadow-xs px-5 cursor-pointer"
              >
                <Check className="h-4 w-4 mr-1.5" />
                {isEditing ? 'Simpan Perubahan' : 'Terbitkan Surat Peringatan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: DETAIL WARNING LETTER */}
      {/* ========================================================================= */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-2xl md:max-w-2xl w-full max-h-[90vh] overflow-y-auto p-0"
        >
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
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-4xl md:max-w-4xl w-full max-h-[92vh] overflow-y-auto p-0"
        >
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
