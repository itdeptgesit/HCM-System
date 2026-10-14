'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet, Download, Layers, SlidersHorizontal,
  Check, RefreshCw, CheckCircle2, User, Building,
  FileCheck, FileText, GraduationCap, CreditCard, ShieldCheck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { UserAccount } from '../types';
import { useToast } from './ToastProvider';
import {
  exportComprehensiveEmployeesExcel,
  exportMultiSheetEmployeesExcel,
  exportDynamicEmployeesExcel,
  DynamicColumnGroups
} from '../lib/employeeExcelService';
import { exportToExcel } from '../lib/excelExport';

interface EmployeeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allEmployees: UserAccount[];
  filteredEmployees: UserAccount[];
  activeTab: 'directory' | 'contracts' | 'payroll' | 'transfers';
  getContractMeta?: (emp: UserAccount) => {
    status?: string;
    label: string;
    daysLeft?: number | null;
    daysRemaining?: number | null;
    isExpiring: boolean;
    isExpired: boolean;
  };
}

type ExportMode = 'full' | 'multisheet' | 'activetab' | 'custom';
type DataScope = 'filtered' | 'all';

export const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({
  isOpen,
  onClose,
  allEmployees,
  filteredEmployees,
  activeTab,
  getContractMeta
}) => {
  const { showToast } = useToast();

  const [dataScope, setDataScope] = useState<DataScope>('filtered');
  const [exportMode, setExportMode] = useState<ExportMode>('full');
  const [isExporting, setIsExporting] = useState(false);

  // Column Groups Selection
  const [columnGroups, setColumnGroups] = useState<DynamicColumnGroups>({
    identity: true,
    org: true,
    contract: true,
    personal: true,
    education: true,
    payroll: true,
    tax: true
  });

  const targetEmployees = dataScope === 'filtered' ? filteredEmployees : allEmployees;

  const toggleGroup = (key: keyof DynamicColumnGroups) => {
    setColumnGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllGroups = (val: boolean) => {
    setColumnGroups({
      identity: val,
      org: val,
      contract: val,
      personal: val,
      education: val,
      payroll: val,
      tax: val
    });
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'contracts': return 'Monitoring Kontrak & PKWT';
      case 'payroll': return 'Payroll & Rekening Bank';
      case 'transfers': return 'Riwayat Mutasi & Transfer';
      default: return 'Direktori Karyawan';
    }
  };

  const getEstimatedColumns = () => {
    if (exportMode === 'full') return 46;
    if (exportMode === 'multisheet') return '4 Sheet (12-46 Kolom)';
    if (exportMode === 'activetab') {
      if (activeTab === 'contracts') return 12;
      if (activeTab === 'payroll') return 13;
      return 13;
    }
    // Custom
    let count = 0;
    if (columnGroups.identity) count += 7;
    if (columnGroups.org) count += 8;
    if (columnGroups.contract) count += 5;
    if (columnGroups.personal) count += 12;
    if (columnGroups.education) count += 7;
    if (columnGroups.payroll) count += 4;
    if (columnGroups.tax) count += 4;
    return count || 6;
  };

  const handleExecuteExport = () => {
    if (targetEmployees.length === 0) {
      showToast('Tidak ada data karyawan yang dipilih untuk diekspor.', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      if (exportMode === 'full') {
        exportComprehensiveEmployeesExcel(
          targetEmployees,
          `GESIT-DATA-KARYAWAN-FULL-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Master Data Lengkap (${targetEmployees.length} karyawan) berhasil diunduh.`, 'success');
      } else if (exportMode === 'multisheet') {
        exportMultiSheetEmployeesExcel(
          targetEmployees,
          `GESIT-BUKU-DATA-KARYAWAN-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Buku Kerja 4-Sheet (${targetEmployees.length} karyawan) berhasil diunduh.`, 'success');
      } else if (exportMode === 'activetab') {
        if (activeTab === 'contracts') {
          const data = targetEmployees.map(e => {
            const meta = getContractMeta ? getContractMeta(e) : { label: 'PKWTT', isExpiring: false, isExpired: false, daysLeft: null, daysRemaining: null };
            const days = meta.daysRemaining ?? meta.daysLeft ?? null;
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
              'Status Masa Kontrak': meta.label,
              'Sisa Hari': days !== null ? `${days} hari` : '-'
            };
          });
          exportToExcel(data, `GESIT-KONTRAK-PKWT-${todayStr}`);
        } else if (activeTab === 'payroll') {
          const data = targetEmployees.map(e => ({
            'Employee ID': e.employeeCode || '-',
            'Nama Karyawan': e.fullName,
            'Perusahaan': e.company || '-',
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
          const data = targetEmployees.map(e => ({
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
            'Status Kepegawaian': e.employmentType || '-',
            'Status Akun': e.status || 'Active',
            'Tanggal Bergabung': e.joinDate || '-'
          }));
          exportToExcel(data, `GESIT-DIREKTORI-KARYAWAN-${todayStr}`);
        }
        showToast(`Format tabel ${getTabLabel()} (${targetEmployees.length} baris) berhasil diunduh.`, 'success');
      } else if (exportMode === 'custom') {
        exportDynamicEmployeesExcel(
          targetEmployees,
          columnGroups,
          `GESIT-DATA-KARYAWAN-KUSTOM-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Data karyawan pilihan (${targetEmployees.length} karyawan) berhasil diunduh.`, 'success');
      }

      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor file Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border/80 shadow-2xl bg-background">
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20 pr-12">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                  Ekspor Direktori Karyawan
                </DialogTitle>
                <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0 border border-border text-muted-foreground">
                  .xlsx
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unduh data kepegawaian ke dalam format lembar kerja Excel resmi
              </p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. DATA SCOPE */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                1. Cakupan Karyawan
              </span>
              <span className="text-xs text-muted-foreground">
                Target: <strong className="text-foreground">{targetEmployees.length} Karyawan</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDataScope('filtered')}
                className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  dataScope === 'filtered'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  dataScope === 'filtered' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {dataScope === 'filtered' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Data Sesuai Filter Tabel</span>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                      {filteredEmployees.length} data
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Hanya karyawan yang memenuhi kriteria pencarian dan filter aktif saat ini.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDataScope('all')}
                className={`p-3.5 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  dataScope === 'all'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  dataScope === 'all' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {dataScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-foreground flex items-center justify-between">
                    <span>Seluruh Karyawan Aktif</span>
                    <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                      {allEmployees.length} total
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Mengekspor seluruh staf dari 7 unit bisnis Gesit Group tanpa terpotong filter.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Separator className="opacity-50" />

          {/* 2. FORMAT SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                2. Struktur & Format Kolom
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Option A: Master Full Lengkap */}
              <button
                type="button"
                onClick={() => setExportMode('full')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start gap-3.5 ${
                  exportMode === 'full'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  exportMode === 'full' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {exportMode === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Master Data Lengkap
                    </span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium">
                      46 Kolom • Rekomendasi
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Satu lembar kerja komprehensif mencakup identitas, organisasi, masa kerja, NIK/NPWP, nomor SK/PKWT, perbankan, BPJS, dan riwayat pendidikan.
                  </p>
                </div>
              </button>

              {/* Option B: Buku Kerja Multi-Sheet */}
              <button
                type="button"
                onClick={() => setExportMode('multisheet')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start gap-3.5 ${
                  exportMode === 'multisheet'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  exportMode === 'multisheet' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {exportMode === 'multisheet' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Buku Kerja Multi-Sheet
                    </span>
                    <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-700 dark:text-blue-400 font-medium">
                      4 Lembar Kerja Terpisah
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Diorganisir ke dalam 4 sheet tematik: Master Karyawan, Monitoring PKWT, Payroll & Bank, dan Pendidikan/Profil.
                  </p>
                </div>
              </button>

              {/* Option C: Sesuai Tampilan Tab */}
              <button
                type="button"
                onClick={() => setExportMode('activetab')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start gap-3.5 ${
                  exportMode === 'activetab'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  exportMode === 'activetab' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {exportMode === 'activetab' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Sesuai Tab Aktif ({getTabLabel()})
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">
                      Tampilan Tabel
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Hanya kolom-kolom yang sedang ditampilkan pada modul tab aktif saat ini.
                  </p>
                </div>
              </button>

              {/* Option D: Kustomisasi Dinamis */}
              <button
                type="button"
                onClick={() => setExportMode('custom')}
                className={`w-full p-3.5 rounded-lg border text-left transition-all flex items-start gap-3.5 ${
                  exportMode === 'custom'
                    ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600/30'
                    : 'border-border/80 hover:bg-muted/30 bg-card'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                  exportMode === 'custom' ? 'border-emerald-600 bg-emerald-600' : 'border-muted-foreground/40'
                }`}>
                  {exportMode === 'custom' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Kustomisasi Kolom Pilihan
                    </span>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground font-medium">
                      Dinamis
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    Tentukan sendiri kelompok informasi yang akan disertakan dalam laporan.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* DYNAMIC CHECKBOX ACCORDION IF MODE IS CUSTOM */}
          {exportMode === 'custom' && (
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                  Centang Kategori Kolom yang Ingin Disertakan:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllGroups(true)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-muted-foreground text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => setAllGroups(false)}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Kosongkan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.identity} onCheckedChange={() => toggleGroup('identity')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Identitas & Akun</div>
                    <div className="text-[10px] text-muted-foreground truncate">NIP, Nama, Email, Telp, Role, Status</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.org} onCheckedChange={() => toggleGroup('org')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Organisasi & Jabatan</div>
                    <div className="text-[10px] text-muted-foreground truncate">Perusahaan, Divisi, Level, Masa Kerja</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.contract} onCheckedChange={() => toggleGroup('contract')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Kontrak & Legalitas</div>
                    <div className="text-[10px] text-muted-foreground truncate">Tipe Kontrak, No. PKWT, Tgl Mulai/Akhir</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.personal} onCheckedChange={() => toggleGroup('personal')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Data Pribadi & Kependudukan</div>
                    <div className="text-[10px] text-muted-foreground truncate">NIK KTP, Usia, Gender, Agama, Alamat</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.education} onCheckedChange={() => toggleGroup('education')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Riwayat Pendidikan</div>
                    <div className="text-[10px] text-muted-foreground truncate">Jenjang, Universitas, Jurusan, IPK</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors">
                  <Checkbox checked={columnGroups.payroll} onCheckedChange={() => toggleGroup('payroll')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Payroll & Rekening Bank</div>
                    <div className="text-[10px] text-muted-foreground truncate">Status Payroll, Nama Bank, No. Rekening</div>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 rounded-md border border-border/80 bg-background text-xs cursor-pointer hover:bg-muted/40 transition-colors sm:col-span-2">
                  <Checkbox checked={columnGroups.tax} onCheckedChange={() => toggleGroup('tax')} />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">Perpajakan & Jaminan Sosial</div>
                    <div className="text-[10px] text-muted-foreground truncate">NPWP 16 Digit, Status PTKP, BPJS Ketenagakerjaan, BPJS Kesehatan</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER STRIP */}
        <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Akan mengunduh <strong>{targetEmployees.length} baris</strong> ({getEstimatedColumns()} kolom data)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isExporting}
              className="text-xs h-9 px-4"
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting || targetEmployees.length === 0}
              className="text-xs h-9 px-4 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyiapkan Berkas...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Unduh Berkas Excel (.xlsx)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default EmployeeExportModal;
