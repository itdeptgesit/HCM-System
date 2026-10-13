'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet, Download, CheckCircle2, Layers,
  SlidersHorizontal, Check, RefreshCw, Users, ShieldCheck,
  Building2, Briefcase, GraduationCap, CreditCard, ShieldAlert,
  Calendar, FileText, ChevronRight, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  getContractMeta?: (emp: UserAccount) => { label: string; isExpiring: boolean; isExpired: boolean; daysRemaining: number | null };
}

export const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({
  isOpen,
  onClose,
  allEmployees,
  filteredEmployees,
  activeTab,
  getContractMeta
}) => {
  const { showToast } = useToast();

  // Export Settings State
  const [dataScope, setDataScope] = useState<'filtered' | 'all'>('filtered');
  const [exportMode, setExportMode] = useState<'full' | 'multisheet' | 'activetab' | 'custom'>('full');
  const [isExporting, setIsExporting] = useState(false);

  // Dynamic Column Groups Selection
  const [columnGroups, setColumnGroups] = useState<DynamicColumnGroups>({
    identity: true,
    org: true,
    contract: true,
    personal: true,
    education: true,
    payroll: true,
    tax: true
  });

  // Calculate target employees based on scope
  const targetEmployees = dataScope === 'filtered' ? filteredEmployees : allEmployees;

  // Toggle a single column group
  const toggleGroup = (key: keyof DynamicColumnGroups) => {
    setColumnGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Select all or reset groups
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

  // Tab label helper
  const getTabLabel = () => {
    switch (activeTab) {
      case 'contracts': return 'Monitoring Kontrak & PKWT';
      case 'payroll': return 'Payroll & Rekening Bank';
      case 'transfers': return 'Riwayat Mutasi & Transfer';
      default: return 'Direktori Karyawan';
    }
  };

  // Execution Handler
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
          `GESIT-DATA-KARYAWAN-FULL-LENGKAP-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Berhasil mengekspor Master Data Lengkap (${targetEmployees.length} karyawan)!`, 'success');
      } else if (exportMode === 'multisheet') {
        exportMultiSheetEmployeesExcel(
          targetEmployees,
          `GESIT-BUKU-DATA-KARYAWAN-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Berhasil mengekspor Buku Kerja 4-Sheet (${targetEmployees.length} karyawan)!`, 'success');
      } else if (exportMode === 'activetab') {
        // Export matching current active table tab
        if (activeTab === 'contracts') {
          const data = targetEmployees.map(e => {
            const meta = getContractMeta ? getContractMeta(e) : { label: 'PKWTT', isExpiring: false, isExpired: false, daysRemaining: null };
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
              'Sisa Hari': meta.daysRemaining !== null ? `${meta.daysRemaining} hari` : '-'
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
        showToast(`Berhasil mengekspor format Tab ${getTabLabel()} (${targetEmployees.length} data)!`, 'success');
      } else if (exportMode === 'custom') {
        exportDynamicEmployeesExcel(
          targetEmployees,
          columnGroups,
          `GESIT-DATA-DINAMIS-${dataScope === 'all' ? 'SEMUA' : 'TERFILTER'}`
        );
        showToast(`Berhasil mengekspor Kolom Pilihan (${targetEmployees.length} karyawan)!`, 'success');
      }

      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor file Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Quick 1-Click Handlers
  const handleQuickFull = () => {
    try {
      exportComprehensiveEmployeesExcel(allEmployees, 'GESIT-DATA-KARYAWAN-FULL-LENGKAP');
      showToast(`Master Data Lengkap (${allEmployees.length} karyawan) berhasil diunduh!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor file Excel', 'error');
    }
  };

  const handleQuickMultiSheet = () => {
    try {
      exportMultiSheetEmployeesExcel(allEmployees, 'GESIT-BUKU-DATA-KARYAWAN-4-SHEET');
      showToast(`Buku Kerja 4-Sheet (${allEmployees.length} karyawan) berhasil diunduh!`, 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengekspor file Excel', 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border-border/60 shadow-2xl">
        {/* HEADER */}
        <div className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                Export Data Karyawan (.xlsx)
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-semibold">
                  Excel Full & Dinamis
                </Badge>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Unduh direktori karyawan lengkap dengan 46 kolom komprehensif atau sesuaikan kolom secara dinamis.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* QUICK EXPORT PRESETS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" /> Unduh Instan (1-Klik)
              </span>
              <span className="text-[11px] text-muted-foreground">
                Mencakup seluruh <strong>{allEmployees.length} karyawan</strong>
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleQuickFull}
                className="h-auto p-3 text-left flex items-start gap-3 border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 group transition-all"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                  <FileSpreadsheet size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Master Full Lengkap
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      46 Kolom
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Seluruh profil, identitas, organisasi, kontrak, payroll, bank & pajak dalam 1 sheet.
                  </p>
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleQuickMultiSheet}
                className="h-auto p-3 text-left flex items-start gap-3 border-blue-500/30 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group transition-all"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Layers size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    Buku Kerja 4-Sheet
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-blue-500/15 text-blue-700 dark:text-blue-300">
                      Multi-Sheet
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Terbagi rapi: Master, Monitoring PKWT, Data Payroll Bank, dan Pendidikan.
                  </p>
                </div>
              </Button>
            </div>
          </div>

          <Separator className="opacity-60" />

          {/* SECTION 1: LINGKUP DATA */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Pilih Lingkup Data
            </Label>
            <RadioGroup
              value={dataScope}
              onValueChange={v => setDataScope(v as any)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              <label
                htmlFor="scope-filtered"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  dataScope === 'filtered'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="filtered" id="scope-filtered" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    Data Terfilter Saat Ini
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                      {filteredEmployees.length} Data
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Mengikuti pencarian dan filter departemen/perusahaan yang sedang aktif di tabel.
                  </p>
                </div>
              </label>

              <label
                htmlFor="scope-all"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  dataScope === 'all'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="all" id="scope-all" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    Seluruh Karyawan
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                      {allEmployees.length} Karyawan
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Seluruh karyawan yang terdaftar di sistem Gesit Group tanpa terpotong filter.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* SECTION 2: FORMAT EXPORT */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              2. Pilih Format / Struktur Kolom
            </Label>
            <RadioGroup
              value={exportMode}
              onValueChange={v => setExportMode(v as any)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              <label
                htmlFor="mode-full"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  exportMode === 'full'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="full" id="mode-full" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">⭐ Master Full Lengkap</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Semua kolom (46 kolom) lengkap dengan usia & hitungan masa kerja.
                  </p>
                </div>
              </label>

              <label
                htmlFor="mode-multisheet"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  exportMode === 'multisheet'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="multisheet" id="mode-multisheet" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">📑 Buku Kerja Multi-Sheet</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    4 Sheet: Master Data, Kontrak PKWT, Payroll Bank, & Pendidikan.
                  </p>
                </div>
              </label>

              <label
                htmlFor="mode-activetab"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  exportMode === 'activetab'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="activetab" id="mode-activetab" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">🎯 Sesuai Tab Aktif ({getTabLabel()})</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hanya kolom-kolom yang relevan dengan tabel yang sedang dibuka.
                  </p>
                </div>
              </label>

              <label
                htmlFor="mode-custom"
                className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  exportMode === 'custom'
                    ? 'border-emerald-500/80 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                    : 'border-border/60 hover:bg-muted/40'
                }`}
              >
                <RadioGroupItem value="custom" id="mode-custom" className="mt-0.5" />
                <div>
                  <div className="font-semibold text-foreground">⚙️ Kustomisasi Dinamis</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pilih grup kategori kolom yang diinginkan secara spesifik.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* SECTION 3: KUSTOMISASI KOLOM JIKA MODE = CUSTOM */}
          {exportMode === 'custom' && (
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <SlidersHorizontal size={14} className="text-emerald-500" />
                  Centang Kategori Kolom yang Ingin Disertakan:
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllGroups(true)}
                    className="text-[11px] text-emerald-600 hover:underline font-medium"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.identity} onCheckedChange={() => toggleGroup('identity')} />
                  <span>👤 <strong>Identitas & Akun</strong> (NIP, Nama, Email, Telp, Role, Status)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.org} onCheckedChange={() => toggleGroup('org')} />
                  <span>🏢 <strong>Organisasi & Jabatan</strong> (PT, Cabang, Divisi, Level, Masa Kerja)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.contract} onCheckedChange={() => toggleGroup('contract')} />
                  <span>📑 <strong>Kontrak & Legalitas</strong> (Tipe Kontrak, No PKWT, Tgl Mulai & Akhir)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.personal} onCheckedChange={() => toggleGroup('personal')} />
                  <span>🪪 <strong>Data Pribadi & KTP</strong> (NIK, Usia, Gender, Agama, Alamat)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.education} onCheckedChange={() => toggleGroup('education')} />
                  <span>🎓 <strong>Pendidikan</strong> (Tingkat, Universitas, Jurusan, Lulus, IPK)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.payroll} onCheckedChange={() => toggleGroup('payroll')} />
                  <span>💳 <strong>Payroll & Bank</strong> (Status Payroll, Nama Bank, No Rekening)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2 rounded-lg border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/30">
                  <Checkbox checked={columnGroups.tax} onCheckedChange={() => toggleGroup('tax')} />
                  <span>🛡️ <strong>Pajak & BPJS</strong> (NPWP, PTKP, BPJS TK, BPJS Kesehatan)</span>
                </label>
              </div>
            </div>
          )}

          {/* SUMMARY INFO CARD */}
          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              <span>
                Siap mengekspor <strong>{targetEmployees.length} baris data karyawan</strong> ke file Excel format <strong>.xlsx</strong>
              </span>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
              Ready
            </Badge>
          </div>
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isExporting} className="text-xs">
            Tutup
          </Button>
          <Button
            type="button"
            onClick={handleExecuteExport}
            disabled={isExporting || targetEmployees.length === 0}
            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isExporting ? (
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" /> Menyiapkan File...
              </>
            ) : (
              <>
                <Download size={14} className="mr-2" /> Download Excel (.xlsx)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
