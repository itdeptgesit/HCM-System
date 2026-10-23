'use client';

import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle,
  XCircle, ArrowRight, Loader2, RefreshCw, Users, ShieldAlert,
  HelpCircle, Eye, Info, X
} from '@/components/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase, ensureAuthUserWithPassword } from '../lib/supabaseClient';
import { trackActivity } from '../lib/auditLogger';
import { useToast } from './ToastProvider';
import {
  generateEmployeeImportTemplate,
  parseEmployeeImportExcel,
  ParsedEmployeeRow,
  InvalidEmployeeRow,
  ParseResult
} from '../lib/employeeExcelService';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  currentUserEmail?: string;
}

export const EmployeeImportModal: React.FC<EmployeeImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  currentUserEmail
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File & Parsing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid');

  // Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [importReport, setImportReport] = useState<{ successCount: number; failedCount: number; errors: string[] } | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsParsing(false);
    setParseResult(null);
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0, currentName: '' });
    setImportReport(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showToast('Format file harus berupa Excel (.xlsx atau .xls)', 'error');
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    setImportReport(null);

    try {
      const result = await parseEmployeeImportExcel(file);
      setParseResult(result);
      if (result.validRows.length === 0 && result.invalidRows.length > 0) {
        setActiveTab('invalid');
      } else {
        setActiveTab('valid');
      }

      if (result.totalRows === 0) {
        showToast('File Excel tidak memiliki data baris karyawan', 'warning');
      } else if (result.invalidRows.length > 0) {
        showToast(`Ditemukan ${result.validRows.length} data valid dan ${result.invalidRows.length} data bermasalah`, 'warning');
      } else {
        showToast(`Berhasil membaca ${result.validRows.length} data karyawan valid`, 'success');
      }
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      showToast(err.message || 'Gagal membaca berkas Excel. Pastikan format sesuai template.', 'error');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  // Self-healing database insert (strip missing columns if not present in schema)
  const executeSaveToSupabase = async (payload: any, retries = 8): Promise<void> => {
    const { error } = await supabase.from('user_accounts').insert([payload]);
    if (error) {
      const match = error.message?.match(/Could not find the '([^']+)' column of 'user_accounts'/i);
      if (match && match[1] && retries > 0) {
        const missingCol = match[1];
        console.warn(`[Import Excel] Kolom '${missingCol}' belum ada di database, mencoba simpan kembali tanpa kolom...`);
        const cleaned = { ...payload };
        delete cleaned[missingCol];
        return executeSaveToSupabase(cleaned, retries - 1);
      }
      throw error;
    }
  };

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    const itemsToImport = parseResult.validRows;
    setIsImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length, currentName: '' });

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < itemsToImport.length; i++) {
      const row = itemsToImport[i];
      setImportProgress({ current: i + 1, total: itemsToImport.length, currentName: row.fullName });

      try {
        // 1. Buat user Supabase Auth jika password tersedia
        let authUserId: string | null = null;
        try {
          authUserId = await ensureAuthUserWithPassword(
            row.email,
            row.password || 'Gesit#2026',
            row.fullName
          );
        } catch (authErr: any) {
          console.warn(`Gagal membuat auth user untuk ${row.email}:`, authErr);
        }

        // 2. Siapkan payload database
        const payload: Record<string, any> = {
          email: row.email,
          username: row.email.split('@')[0],
          full_name: row.fullName,
          nik: row.nik,
          role: row.role || 'Staff',
          status: row.status || 'Active',
          employment_status: row.status === 'Disabled' ? 'Resigned' : (row.status || 'Active'),
          separation_date: row.status === 'Disabled' ? (row.contractEndDate || row.joinDate || null) : null,
          separation_reason: row.status === 'Disabled' ? 'Resigned / Non-Active Company Record' : null,
          groups: ['HCM', row.role || 'Staff'],
          phone: row.phone || null,
          birth_place: row.birthPlace || null,
          date_of_birth: row.dateOfBirth || null,
          gender: row.gender || null,
          religion: row.religion || null,
          marital_status: row.maritalStatus || null,
          blood_type: row.bloodType || null,
          address: row.address || null,
          residential_address: row.residentialAddress || null,
          // Pendidikan
          last_education: row.lastEducation || null,
          institution_name: row.institutionName || null,
          major: row.major || null,
          education_start_year: row.educationStartYear || null,
          graduation_year: row.graduationYear || null,
          gpa: row.gpa || null,
          diploma_number: row.diplomaNumber || null,
          // Pekerjaan
          employee_code: row.employeeCode || null,
          company: row.company || null,
          branch: row.branch || null,
          department: row.department || 'Other',
          job_title: row.jobTitle || null,
          job_level: row.jobLevel || 'Staff',
          employment_type: row.employmentType || 'Full-Time',
          join_date: row.joinDate || null,
          // Kontrak
          contract_type: row.contractType || 'PKWT 1',
          pkwt_number: row.pkwtNumber || null,
          contract_start_date: row.contractStartDate || null,
          contract_end_date: row.contractEndDate || null,
          // Payroll
          payroll_status: row.payrollStatus || 'Active',
          bank_name: row.bankName || null,
          bank_account_number: row.bankAccountNumber || null,
          bank_account_name: row.bankAccountName || null,
          tax_status: row.taxStatus || null,
          npwp: row.npwp || null,
          bpjs_tk_number: row.bpjsTkNumber || null,
          bpjs_health_number: row.bpjsHealthNumber || null,
          passport_number: row.passportNumber || null
        };

        if (authUserId) {
          payload.auth_id = authUserId;
        }

        // 3. Simpan ke Supabase tabel user_accounts
        await executeSaveToSupabase(payload);
        successCount++;
      } catch (err: any) {
        console.error(`Gagal mengimpor ${row.fullName}:`, err);
        failedCount++;
        errors.push(`Baris ${row.rowNumber} (${row.fullName}): ${err.message || 'Gagal menyimpan data'}`);
      }
    }

    setIsImporting(false);
    setImportReport({ successCount, failedCount, errors });

    // Catat log aktivitas jika ada yang berhasil
    if (successCount > 0) {
      await trackActivity(
        currentUserEmail || 'System Admin',
        'Admin',
        'Bulk Import Karyawan',
        'Employee Data',
        `Berhasil mengimpor ${successCount} data karyawan dari berkas Excel (${failedCount} gagal)`
      );
      showToast(`Sukses mengimpor ${successCount} data karyawan!`, 'success');
      onImportSuccess();
    } else {
      showToast('Seluruh proses import gagal. Periksa pesan error.', 'error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/80 shadow-2xl">
        {/* HEADER */}
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Import Data Karyawan via Excel
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tambahkan banyak data karyawan sekaligus secara massal menggunakan format template Excel resmi.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateEmployeeImportTemplate}
              className="text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Download size={14} /> Unduh Template Excel
            </Button>
          </div>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* UPLOAD / DROPZONE AREA */}
          <div className="space-y-3">
            <div
              onClick={() => !isImporting && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                selectedFile
                  ? 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10'
                  : 'border-border/80 hover:border-primary/60 hover:bg-muted/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
                disabled={isImporting}
              />
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                {isParsing ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Upload size={24} />
                )}
              </div>
              <div>
                {selectedFile ? (
                  <>
                    <p className="text-sm font-bold text-foreground">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB (Klik untuk mengganti berkas)
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      Pilih berkas Excel (.xlsx) atau seret ke area ini
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pastikan berkas telah disesuaikan dengan Template Import Karyawan
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                <Info size={12} className="text-primary" />
                Kolom wajib: Nama Lengkap, Email Login, Password Akun, NIK KTP.
              </span>
              <span>Format: .XLSX / .XLS</span>
            </div>
          </div>

          {/* IMPORT PROGRESS STATE */}
          {isImporting && (
            <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 shadow-sm animate-in fade-in">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    Sedang mengimpor data ke database Supabase...
                  </span>
                  <span>{importProgress.current} / {importProgress.total}</span>
                </div>
                <div className="w-full bg-blue-200/50 dark:bg-blue-900/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(importProgress.current / (importProgress.total || 1)) * 100}%`
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground italic truncate">
                  Memproses: <span className="font-semibold text-foreground">{importProgress.currentName}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* REPORT SUMMARY AFTER IMPORT */}
          {importReport && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              importReport.failedCount === 0
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> Laporan Hasil Import
                </span>
                <span>
                  Berhasil: {importReport.successCount} | Gagal: {importReport.failedCount}
                </span>
              </div>
              {importReport.errors.length > 0 && (
                <div className="mt-2 p-2 bg-background/80 rounded-lg max-h-32 overflow-y-auto space-y-1 text-red-600 dark:text-red-400 font-mono text-[11px]">
                  {importReport.errors.map((err, idx) => (
                    <p key={idx}>• {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PARSE RESULT PREVIEW */}
          {parseResult && !isImporting && (
            <div className="space-y-4">
              {/* STATS BADGES */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Baris</p>
                    <p className="text-xl font-black text-foreground mt-0.5">{parseResult.totalRows}</p>
                  </div>
                  <Users size={18} className="text-muted-foreground" />
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Valid (Siap Import)</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{parseResult.validRows.length}</p>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-600" />
                </div>
                <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">Error (Invalid)</p>
                    <p className="text-xl font-black text-red-600 dark:text-red-400 mt-0.5">{parseResult.invalidRows.length}</p>
                  </div>
                  <AlertTriangle size={18} className="text-red-600" />
                </div>
              </div>

              {/* TABS PREVIEW TABLE */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid grid-cols-2 max-w-sm h-8">
                  <TabsTrigger value="valid" className="text-xs">
                    Data Valid ({parseResult.validRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="invalid" className="text-xs">
                    Data Bermasalah ({parseResult.invalidRows.length})
                  </TabsTrigger>
                </TabsList>

                {/* TAB DATA VALID */}
                <TabsContent value="valid" className="mt-3">
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/50 sticky top-0">
                          <TableRow>
                            <TableHead className="w-12 text-center">#</TableHead>
                            <TableHead>Nama Karyawan</TableHead>
                            <TableHead>Email Login</TableHead>
                            <TableHead>NIK KTP</TableHead>
                            <TableHead>Departemen / Jabatan</TableHead>
                            <TableHead>Status Kontrak</TableHead>
                            <TableHead>Status Akun</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parseResult.validRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                                Tidak ada data valid untuk diimport
                              </TableCell>
                            </TableRow>
                          ) : (
                            parseResult.validRows.map((row) => (
                              <TableRow key={row.rowNumber} className="hover:bg-muted/30">
                                <TableCell className="text-center font-mono text-[10px] text-muted-foreground">
                                  {row.rowNumber}
                                </TableCell>
                                <TableCell className="font-semibold text-foreground">
                                  {row.fullName}
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono text-[11px]">
                                  {row.email}
                                </TableCell>
                                <TableCell className="font-mono text-[11px]">
                                  {row.nik}
                                </TableCell>
                                <TableCell>
                                  <span className="text-foreground font-medium">{row.department}</span>
                                  {row.jobTitle && <span className="text-muted-foreground text-[10px] block">{row.jobTitle}</span>}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px] font-normal">
                                    {row.contractType || 'PKWT 1'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-medium ${
                                      row.status === 'Disabled'
                                        ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    }`}
                                  >
                                    {row.status === 'Disabled' ? 'Non-Aktif' : 'Aktif'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB DATA INVALID */}
                <TabsContent value="invalid" className="mt-3">
                  <div className="border border-border/60 rounded-xl overflow-hidden">
                    <div className="max-h-60 overflow-y-auto">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/50 sticky top-0">
                          <TableRow>
                            <TableHead className="w-16 text-center">Baris Excel</TableHead>
                            <TableHead>Identitas</TableHead>
                            <TableHead>Penyebab Error / Perlu Diperbaiki</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parseResult.invalidRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-emerald-600 font-medium">
                                <CheckCircle2 size={16} className="inline mr-1" /> Semua baris valid! Tidak ada data bermasalah.
                              </TableCell>
                            </TableRow>
                          ) : (
                            parseResult.invalidRows.map((row) => (
                              <TableRow key={row.rowNumber} className="hover:bg-red-500/5">
                                <TableCell className="text-center font-bold text-red-600">
                                  Baris {row.rowNumber}
                                </TableCell>
                                <TableCell>
                                  <p className="font-semibold text-foreground">{row.fullName}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{row.email}</p>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {row.errors.map((err, i) => (
                                      <span
                                        key={i}
                                        className="inline-block mr-1.5 px-2 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 font-medium"
                                      >
                                        • {err}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/20 flex items-center justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isImporting}
            className="text-xs"
          >
            Tutup
          </Button>

          <div className="flex items-center gap-2">
            {parseResult && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetState}
                disabled={isImporting}
                className="text-xs"
              >
                Reset Berkas
              </Button>
            )}

            <Button
              onClick={handleExecuteImport}
              disabled={isImporting || !parseResult || parseResult.validRows.length === 0}
              className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Mengimpor ({importProgress.current}/{importProgress.total})...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Mulai Import ({parseResult?.validRows.length || 0} Karyawan)
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
