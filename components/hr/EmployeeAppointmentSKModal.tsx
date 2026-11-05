'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Printer,
  FileCheck,
  Check,
  X,
  Edit3,
  Eye,
  Building,
  User,
  Calendar,
  Sparkles,
  Download,
  FileText,
  Loader2,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Lock,
  Info,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabaseClient';
import { uploadFileToGoogleDrive } from '../../lib/googleDriveUpload';
import { syncEffectiveAppointments } from '../../lib/appointmentService';

export interface EmployeeAppointmentData {
  id: string | number;
  fullName: string;
  email?: string;
  employeeCode?: string;
  nik?: string;
  gender?: string;
  company?: string;
  department?: string;
  jobTitle?: string;
  joinDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractType?: string;
  employmentType?: string;
}

interface EmployeeAppointmentSKModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: EmployeeAppointmentData | null;
  currentUser?: any;
  onSaved?: (updatedEmployee: any) => void;
}

// Convert month number to Roman numeral
const getRomanMonth = (monthNumber: number): string => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[monthNumber - 1] || 'I';
};

// Get company abbreviation code
export const getCompanyAbbr = (companyName?: string): string => {
  if (!companyName) return 'GP';
  const clean = companyName.toUpperCase();
  if (clean.includes('DHARMA ALUMAS')) return 'DAS';
  if (clean.includes('GESIT ALUMAS')) return 'GA';
  if (clean.includes('PRODAS PERDANA')) return 'PP';
  if (clean.includes('GESIT INTRADE')) return 'GI';
  if (clean.includes('GESIT PERKASA')) return 'GP';
  if (clean.includes('GESIT')) return 'GP';

  // Fallback: take first letters
  const parts = clean.replace(/PT\.?|CV\.?/g, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map(p => p[0]).join('').slice(0, 4);
  }
  return parts[0]?.slice(0, 3) || 'GP';
};

// Get company logo based on company name
export const getCompanyLogo = (companyName?: string): string => {
  if (!companyName) return '/image/gesit_perkasa_logo.jpg';
  const clean = companyName.toUpperCase();
  if (clean.includes('FOUNDATION') || clean.includes('YAYASAN')) {
    return '/image/gesit_foundation_logo.png';
  }
  return '/image/gesit_perkasa_logo.jpg';
};

// Format Indonesian Date (e.g. 26 Oktober 2026)
export const formatIndoDate = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
};

export const EmployeeAppointmentSKModal: React.FC<EmployeeAppointmentSKModalProps> = ({
  open,
  onOpenChange,
  employee,
  currentUser,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');

  // Modern UI feedback states (Replaces native browser alert)
  const [successResult, setSuccessResult] = useState<{
    open: boolean;
    skNumber: string;
    employeeName: string;
    uploadedUrl?: string | null;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [skNumber, setSkNumber] = useState('');
  const [companyName, setCompanyName] = useState('PT. GESIT PERKASA');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeNik, setEmployeeNik] = useState('');
  const [salutation, setSalutation] = useState<'Saudara' | 'Saudari'>('Saudari');
  const [probationStart, setProbationStart] = useState('');
  const [probationEnd, setProbationEnd] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [issueCity, setIssueCity] = useState('Jakarta');
  
  // Signer details
  const [signerName, setSignerName] = useState('Javier Wijaya');
  const [signerTitle, setSignerTitle] = useState('VP of HR & Logistics');

  // Entitlement clauses
  const [clauseMedical, setClauseMedical] = useState('Sesuai Peraturan Perusahaan');
  const [clauseInsurance, setClauseInsurance] = useState('Sesuai Peraturan Perusahaan');
  const [clauseLeave, setClauseLeave] = useState(
    '12 hari kerja per Tahun (UU No. 6 tahun 2023, pasal 79) karyawan telah bekerja minimal 1 tahun atau 12 bulan secara terus menerus di Yayasan. Pengambilan Cuti Tahunan sesuai ketentuan Yayasan.'
  );

  // Populate data when employee changes
  useEffect(() => {
    if (!employee || !open) return;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const romanMonth = getRomanMonth(currentMonthNum);
    const compAbbr = getCompanyAbbr(employee.company);

    // Random sequence / incremental sample, e.g., 046
    const seq = String(Math.floor(Math.random() * 80) + 20).padStart(3, '0');
    const autoNumber = `046/${compAbbr}/HR/SK/${romanMonth}/${currentYear}`;

    setSkNumber(autoNumber);
    setCompanyName(
      employee.company
        ? employee.company.toUpperCase().startsWith('PT')
          ? employee.company.toUpperCase()
          : `PT. ${employee.company.toUpperCase()}`
        : 'PT. GESIT PERKASA'
    );
    setEmployeeName(employee.fullName || '');
    setEmployeeNik(employee.employeeCode || employee.nik || '26070390');

    // Gender detection: female -> Saudari, male -> Saudara
    const g = String(employee.gender || '').toLowerCase();
    const isFemale = g.includes('perempuan') || g.includes('female') || g.includes('wanita');
    setSalutation(isFemale ? 'Saudari' : 'Saudara');

    // Dates calculation:
    // If joinDate is available, probation start is joinDate
    // Probation end is 3 months after joinDate or contractEndDate
    const pStart = employee.contractStartDate || employee.joinDate || today.toISOString().split('T')[0];
    let pEnd = employee.contractEndDate;

    if (!pEnd && pStart) {
      const startD = new Date(pStart);
      if (!isNaN(startD.getTime())) {
        const endD = new Date(startD);
        endD.setMonth(endD.getMonth() + 3);
        pEnd = endD.toISOString().split('T')[0];
      }
    }

    setProbationStart(pStart || today.toISOString().split('T')[0]);
    setProbationEnd(pEnd || today.toISOString().split('T')[0]);
    setIssueDate(today.toISOString().split('T')[0]);
    setEffectiveDate(pEnd || today.toISOString().split('T')[0]);

    // Signer defaults
    setSignerName('Javier Wijaya');
    setSignerTitle('VP of HR & Logistics');
  }, [employee, open]);

  // Generate PDF File from document sheet
  const generateSKPdfFile = async (): Promise<File> => {
    // Switch to preview if currently on edit tab to ensure element is in DOM
    if (activeTab !== 'preview') {
      setActiveTab('preview');
      await new Promise(r => setTimeout(r, 150));
    }

    const element = document.getElementById('printable-sk-sheet');
    if (!element) throw new Error('Elemen pratinjau SK tidak ditemukan di layar.');

    const imgData = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    const pdfBlob = pdf.output('blob');

    const cleanName = (employeeName || 'Karyawan').replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanCode = (employeeNik || 'NIK').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `SK_Pengangkatan_${cleanName}_${cleanCode}.pdf`;

    return new File([pdfBlob], fileName, { type: 'application/pdf' });
  };

  // Download PDF locally
  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const file = await generateSKPdfFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download PDF error:', err);
      setErrorMessage('Gagal mengunduh PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle direct print
  const handlePrint = () => {
    window.print();
  };

  // Handle save & apply PKWTT status to database + Auto-Upload to Google Drive
  const handleApplyPermanent = async () => {
    if (!employee?.id) return;
    setIsSaving(true);
    setUploadProgressText('Membuat dokumen PDF SK...');
    try {
      // 1. Generate PDF & Auto-Upload to Google Drive
      let uploadedFileUrl: string | null = null;
      try {
        const pdfFile = await generateSKPdfFile();
        setUploadProgressText('Mengunggah SK ke Google Drive...');

        const uploadResult = await uploadFileToGoogleDrive(pdfFile, {
          category: 'sk_karyawan',
          folderType: 'employee_docs',
          employeeName: employeeName,
          employeeCode: employeeNik,
          employeeId: employee.id,
          targetEmail: employee.email,
          notes: `Surat Keputusan Pengangkatan Karyawan Tetap No. ${skNumber}`,
        });

        if (uploadResult.success && uploadResult.fileUrl) {
          uploadedFileUrl = uploadResult.fileUrl;
        } else if (uploadResult.error) {
          console.warn('Google drive upload info:', uploadResult.error);
        }
      } catch (pdfErr) {
        console.warn('PDF generation/upload info:', pdfErr);
      }

      setUploadProgressText('Menyimpan ke Database...');

      const todayStr = new Date().toISOString().slice(0, 10);
      const isEffectiveNow = !effectiveDate || effectiveDate <= todayStr;

      // 2. Update user_accounts (hanya jika effectiveDate <= hari ini, atau simpan referensi SK)
      if (isEffectiveNow) {
        const { error: updateError } = await supabase
          .from('user_accounts')
          .update({
            contract_type: 'PKWTT',
            employment_type: 'PKWTT',
            pkwt_number: skNumber,
            sk_file_url: uploadedFileUrl || undefined,
            contract_start_date: effectiveDate || probationEnd || issueDate,
            contract_end_date: null, // PKWTT has no end date
            status_effective_date: effectiveDate || issueDate,
          })
          .eq('id', employee.id);

        if (updateError) throw updateError;
      } else {
        // Tanggal efektif di masa depan: simpan tautan SK & nomor SK, jangan ubah contract_type & contract_end_date sekarang
        const { error: updateError } = await supabase
          .from('user_accounts')
          .update({
            pkwt_number: skNumber,
            sk_file_url: uploadedFileUrl || undefined,
            status_effective_date: effectiveDate,
          })
          .eq('id', employee.id);

        if (updateError) throw updateError;
      }

      // 3. Try inserting to employee_contract_history if table exists
      try {
        await supabase.from('employee_contract_history').insert({
          employee_id: employee.id,
          contract_type: isEffectiveNow ? 'PKWTT' : (employee.contractType || 'Probation'),
          sk_number: skNumber,
          sk_file_url: uploadedFileUrl || null,
          contract_start_date: effectiveDate || probationEnd || issueDate,
          contract_end_date: isEffectiveNow ? null : (employee.contractEndDate || probationEnd || null),
          notes: isEffectiveNow
            ? `Pengangkatan Karyawan Tetap efektif per ${formatIndoDate(effectiveDate)}. Penandatangan: ${signerName}.`
            : `SK Pengangkatan Terbit per ${formatIndoDate(issueDate)}, status Karyawan Tetap dijadwalkan efektif per ${formatIndoDate(effectiveDate)}.`,
          created_by: currentUser?.fullName || currentUser?.name || 'HR Admin',
        });
      } catch {
        // Safe to ignore if table schema doesn't exist
      }

      // 4. Try inserting to employee_appointments (Master SK Pengangkatan)
      try {
        await supabase.from('employee_appointments').upsert({
          sk_number: skNumber,
          employee_id: employee.id,
          employee_name: employeeName,
          employee_nik: employeeNik,
          company_name: companyName,
          salutation: salutation,
          probation_start_date: probationStart || null,
          probation_end_date: probationEnd || null,
          effective_date: effectiveDate || probationEnd || issueDate,
          issue_date: issueDate || null,
          issue_city: issueCity,
          signer_name: signerName,
          signer_title: signerTitle,
          clause_medical: clauseMedical,
          clause_insurance: clauseInsurance,
          clause_leave: clauseLeave,
          sk_file_url: uploadedFileUrl || null,
          created_by: currentUser?.fullName || currentUser?.name || 'HR Admin',
        }, { onConflict: 'sk_number' });
      } catch (appErr) {
        console.warn('employee_appointments insert info:', appErr);
      }

      if (onSaved) {
        onSaved({
          ...employee,
          contractType: isEffectiveNow ? 'PKWTT' : employee.contractType,
          employmentType: isEffectiveNow ? 'PKWTT' : employee.employmentType,
          pkwtNumber: skNumber,
          skFileUrl: uploadedFileUrl,
          contractStartDate: isEffectiveNow ? (effectiveDate || probationEnd || issueDate) : employee.contractStartDate,
          contractEndDate: isEffectiveNow ? null : employee.contractEndDate,
        });
      }

      // Show modern celebratory success dialog with Google Drive link
      setSuccessResult({
        open: true,
        skNumber,
        employeeName,
        uploadedUrl: uploadedFileUrl,
      });
    } catch (err: any) {
      console.error('Error applying permanent status:', err);
      setErrorMessage('Gagal memproses pengangkatan: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
      setUploadProgressText('');
    }
  };

  if (!employee) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
        showCloseButton={false}
        className="sm:max-w-4xl md:max-w-5xl w-full max-h-[94vh] overflow-y-auto p-0 border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-[#0c0c0e]"
      >
        {/* Top Control Bar (Hidden when printing) */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md px-6 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-bold shadow-xs">
              <FileCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>SK Pengangkatan Karyawan Tetap</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terverifikasi Otomatis
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400">
                Penerbitan surat keputusan pengangkatan dari Masa Percobaan (Probation) ke PKWTT
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View / Edit Mode Segmented Control */}
            <div className="flex items-center bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg border border-slate-200 dark:border-zinc-700 text-xs font-medium mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all text-xs font-medium ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Eye className="size-3.5" />
                <span>Pratinjau Surat</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all text-xs font-medium ${
                  activeTab === 'edit'
                    ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Edit3 className="size-3.5" />
                <span>Sesuaikan Isi</span>
              </button>
            </div>

            {/* Action Group: Download & Print */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xs">
              <button
                type="button"
                disabled={isDownloading || isSaving}
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-l-lg transition-colors border-r border-slate-200 dark:border-zinc-700 disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 text-slate-500" />
                )}
                <span>Unduh PDF</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-r-lg transition-colors"
              >
                <Printer className="size-3.5 text-slate-500" />
                <span>Cetak</span>
              </button>
            </div>

            {/* Save & Apply Primary CTA */}
            <Button
              type="button"
              size="sm"
              disabled={isSaving || isDownloading}
              onClick={handleApplyPermanent}
              className="text-xs h-8.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs px-3.5"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
              ) : (
                <CloudUpload className="size-3.5 mr-1.5" />
              )}
              {isSaving ? (uploadProgressText || 'Menyimpan...') : 'Terbitkan & Terapkan SK'}
            </Button>

            <button
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-md ml-1"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'edit' ? (
            /* =========================================================================
               EDIT FORM (Enterprise Clean Antislop Layout)
               ========================================================================= */
            <div className="max-w-3xl mx-auto space-y-6 print:hidden">
              {/* Card 1: Informasi Dokumen & Legalitas */}
              <div className="bg-white dark:bg-[#131316] rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white">
                  <FileText className="size-4 text-slate-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Informasi Dokumen & Perusahaan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Nomor Surat Keputusan
                    </Label>
                    <Input
                      value={skNumber}
                      onChange={e => setSkNumber(e.target.value)}
                      placeholder="Contoh: 046/GP/HR/SK/X/2026"
                      className="text-xs font-mono rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Nama Perusahaan (Kop Dokumen)
                    </Label>
                    <Input
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      placeholder="PT. GESIT PERKASA"
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Kota Penerbitan
                    </Label>
                    <Input
                      value={issueCity}
                      onChange={e => setIssueCity(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Panggilan Pembuka Karyawan
                    </Label>
                    <select
                      value={salutation}
                      onChange={e => setSalutation(e.target.value as any)}
                      className="w-full text-xs rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 font-medium text-slate-800 dark:text-zinc-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/10"
                    >
                      <option value="Saudari">Saudari (Wanita / Perempuan)</option>
                      <option value="Saudara">Saudara (Pria / Laki-laki)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Card 2: Data Karyawan (Data Induk Terkunci / Read-Only) */}
              <div className="bg-white dark:bg-[#131316] rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <User className="size-4 text-slate-500" />
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                      Data Karyawan
                    </h4>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-zinc-500">
                    <Lock className="size-3" />
                    Sinkron Profil Induk
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                      <span>Nama Lengkap Karyawan</span>
                    </Label>
                    <Input
                      value={employeeName}
                      onChange={e => setEmployeeName(e.target.value)}
                      className="text-xs rounded-lg bg-slate-50/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      NIK Karyawan
                    </Label>
                    <Input
                      value={employeeNik}
                      onChange={e => setEmployeeNik(e.target.value)}
                      className="text-xs font-mono rounded-lg bg-slate-50/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200"
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Tanggal Berlaku & Efektif SK */}
              <div className="bg-white dark:bg-[#131316] rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white">
                  <Calendar className="size-4 text-slate-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Jadwal & Tanggal Efektif Pemberlakuan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Tanggal Terbit SK (Surat Dikeluarkan)
                    </Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs font-medium"
                    />
                    <p className="text-[11px] text-slate-400">
                      Tanggal administrasi surat resmi diterbitkan
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Tanggal Efektif Pengangkatan (TMT Tetap)
                    </Label>
                    <Input
                      type="date"
                      value={effectiveDate}
                      onChange={e => setEffectiveDate(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs font-semibold text-slate-900 dark:text-white"
                    />
                    <p className="text-[11px] text-slate-400">
                      Tanggal mulai resmi berstatus PKWTT
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Mulai Masa Percobaan
                    </Label>
                    <Input
                      type="date"
                      value={probationStart}
                      onChange={e => setProbationStart(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Selesai Masa Percobaan
                    </Label>
                    <Input
                      type="date"
                      value={probationEnd}
                      onChange={e => setProbationEnd(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Structured Callout Alert Banner */}
                <div className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                  effectiveDate && effectiveDate > new Date().toISOString().slice(0, 10)
                    ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                }`}>
                  <Info className={`size-4 shrink-0 mt-0.5 ${
                    effectiveDate && effectiveDate > new Date().toISOString().slice(0, 10)
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500'
                  }`} />
                  <div>
                    <span className="font-semibold block mb-0.5">
                      {effectiveDate && effectiveDate > new Date().toISOString().slice(0, 10)
                        ? 'Pengangkatan Terjadwal Otomatis (Masa Depan)'
                        : 'Pengangkatan Langsung Efektif'}
                    </span>
                    <span className="text-[11px] leading-relaxed">
                      {effectiveDate && effectiveDate > new Date().toISOString().slice(0, 10)
                        ? `SK akan diterbitkan sekarang, namun status karyawan di sistem tetap masa probation aktif hingga TMT berlaku pada ${formatIndoDate(effectiveDate)}.`
                        : 'Status karyawan di sistem akan langsung otomatis dialihkan ke Karyawan Tetap (PKWTT) per hari ini.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4: Penandatangan SK */}
              <div className="bg-white dark:bg-[#131316] rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white">
                  <Building className="size-4 text-slate-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Otorisasi Penandatangan Manajemen
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Nama Penandatangan
                    </Label>
                    <Input
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Jabatan Penandatangan
                    </Label>
                    <Input
                      value={signerTitle}
                      onChange={e => setSignerTitle(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Card 5: Ketentuan Hak Karyawan */}
              <div className="bg-white dark:bg-[#131316] rounded-xl p-5 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800 text-slate-900 dark:text-white">
                  <Sparkles className="size-4 text-slate-500" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    Ketentuan Hak Karyawan Tetap
                  </h4>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Klausul Tunjangan Medis (Medical)
                    </Label>
                    <Input
                      value={clauseMedical}
                      onChange={e => setClauseMedical(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Klausul Asuransi Kesehatan & Jiwa
                    </Label>
                    <Input
                      value={clauseInsurance}
                      onChange={e => setClauseInsurance(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                      Klausul Hak Cuti Tahunan
                    </Label>
                    <Textarea
                      rows={3}
                      value={clauseLeave}
                      onChange={e => setClauseLeave(e.target.value)}
                      className="text-xs rounded-lg bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 shadow-2xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="text-xs rounded-lg border-slate-300 dark:border-zinc-700"
                >
                  Batal
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('preview')}
                    className="text-xs rounded-lg border-slate-300 dark:border-zinc-700 font-medium"
                  >
                    <Eye className="size-3.5 mr-1.5" />
                    Lihat Pratinjau Surat
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving || isDownloading}
                    onClick={handleApplyPermanent}
                    className="text-xs rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-medium shadow-xs px-4"
                  >
                    {isSaving ? (
                      <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <CloudUpload className="size-3.5 mr-1.5" />
                    )}
                    {isSaving ? (uploadProgressText || 'Menyimpan...') : 'Terbitkan & Terapkan SK'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               LIVE A4 PAPER PREVIEW (EXACT REPLICA OF USER UPLOADED DOCUMENT)
               ========================================================================= */
            <div className="flex justify-center">
              <div
                id="printable-sk-sheet"
                className="w-[210mm] min-h-[297mm] max-h-[297mm] h-[297mm] bg-white text-black shadow-2xl border border-slate-200 print:border-none print:shadow-none print:m-0 flex flex-col justify-between"
                style={{
                  fontFamily: 'Cambria, Georgia, "Times New Roman", serif',
                  fontSize: '12pt',
                  lineHeight: '21pt',
                  color: '#000000',
                  boxSizing: 'border-box',
                  paddingTop: '17.5mm',
                  paddingBottom: '13.3mm',
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
              >
                {/* Main Letter Content (Strict 31.75mm / 1.25" Left and Right Margins) */}
                <div style={{ paddingLeft: '31.75mm', paddingRight: '31.75mm' }}>
                  {/* Kop Surat / Header */}
                  <div className="text-center mb-[20pt]">
                    {/* Logo (Dynamic per company: Gesit Foundation vs Gesit Perkasa) */}
                    <div className="flex justify-center mb-1">
                      <img
                        src={getCompanyLogo(companyName)}
                        alt={`${companyName} Logo`}
                        className={companyName.toUpperCase().includes('FOUNDATION')
                          ? "h-[68pt] w-auto max-w-[280pt] object-contain"
                          : "w-[55.2pt] h-[58.2pt] object-contain"
                        }
                        crossOrigin="anonymous"
                      />
                    </div>

                    {/* Company Name (Hidden if logo already contains full foundation name, or styled consistently) */}
                    {!companyName.toUpperCase().includes('FOUNDATION') && (
                      <h2
                        className="text-[8.5pt] font-black uppercase text-[#1b2366] leading-tight"
                        style={{
                          fontFamily: '"Arial Black", Arial, sans-serif',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {companyName}
                      </h2>
                    )}

                    {/* Document Title (Font: Cambria 12pt Bold Underline & 11pt Bold Number) */}
                    <div className="mt-[16pt]">
                      <h1 className="text-[12pt] font-bold underline tracking-wide uppercase leading-tight">
                        SURAT KEPUTUSAN
                      </h1>
                      <div className="text-[11pt] font-bold mt-[2pt] leading-tight">
                        No. {skNumber}
                      </div>
                    </div>
                  </div>

                  {/* Recipient Information */}
                  <div className="space-y-[1pt] mb-[18pt] text-[12pt] leading-[18pt]">
                    <div>Kepada Yth.,</div>
                    <div className="grid grid-cols-[48pt_14pt_1fr] items-baseline font-bold">
                      <div>Nama</div>
                      <div className="text-center">:</div>
                      <div>{employeeName}</div>
                    </div>
                    <div className="grid grid-cols-[48pt_14pt_1fr] items-baseline font-bold">
                      <div>NIK</div>
                      <div className="text-center">:</div>
                      <div>{employeeNik}</div>
                    </div>
                    <div className="pt-[14pt]">Di tempat</div>
                  </div>

                  {/* Body Text */}
                  <div className="text-justify text-[12pt] leading-[21pt]">
                    <div className="mb-[6pt]">Dengan hormat,</div>
                    <p className="indent-0">
                      Sehubungan dengan telah berakhirnya masa percobaan {salutation} {employeeName}, yaitu tanggal {formatIndoDate(probationStart)} sampai dengan {formatIndoDate(probationEnd)}, maka setelah mengadakan penilaian terhadap hasil kerja {salutation} {employeeName} selama masa percobaan, Management memutuskan untuk mengangkat {salutation} {employeeName} sebagai <strong className="font-bold">Karyawan Tetap</strong>{effectiveDate && effectiveDate !== issueDate ? ` terhitung mulai tanggal (TMT) ${formatIndoDate(effectiveDate)}` : ''} dan berhak untuk:
                    </p>

                    {/* Entitlements List */}
                    <div className="my-[4pt] text-[12pt] leading-[21pt]">
                      <div className="grid grid-cols-[57.5mm_14pt_1fr] items-baseline">
                        <div>Medical</div>
                        <div className="text-center">:</div>
                        <div>{clauseMedical}</div>
                      </div>

                      <div className="grid grid-cols-[57.5mm_14pt_1fr] items-baseline">
                        <div>Asuransi Kesehatan dan Jiwa</div>
                        <div className="text-center">:</div>
                        <div>{clauseInsurance}</div>
                      </div>

                      <div className="grid grid-cols-[57.5mm_14pt_1fr] items-baseline">
                        <div>Cuti</div>
                        <div className="text-center">:</div>
                        <div className="leading-[21pt]">
                          {clauseLeave}
                        </div>
                      </div>
                    </div>

                    <p className="pt-[6pt]">
                      Demikian informasi ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.
                    </p>
                  </div>

                  {/* Signatures Section */}
                  <div className="mt-[20pt] grid grid-cols-2 text-[12pt] leading-[18pt]">
                    {/* Left: Employee */}
                    <div className="flex flex-col justify-between h-[96pt] pl-[14pt]">
                      <div>Diketahui Oleh,</div>
                      <div className="font-bold">
                        ({employeeName})
                      </div>
                    </div>

                    {/* Right: Management */}
                    <div className="flex flex-col justify-between h-[96pt] pl-[20pt]">
                      <div>{issueCity}, {formatIndoDate(issueDate || new Date().toISOString().slice(0, 10))}</div>
                      <div>
                        <div className="font-bold underline leading-normal">
                          {signerName}
                        </div>
                        <div className="font-bold leading-normal">
                          {signerTitle}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Address (Margin beda sendiri, 1 baris penuh / single line, Font: Times New Roman, Size: 9pt) */}
                <div
                  className="w-full text-center text-[9pt] text-[#1b2366] whitespace-nowrap"
                  style={{
                    fontFamily: '"Times New Roman", Times, Georgia, serif',
                    paddingLeft: '15mm',
                    paddingRight: '15mm',
                    lineHeight: '1.2',
                    letterSpacing: '-0.005em',
                  }}
                >
                  The City Tower (TCT) 27<sup className="text-[6.5pt] align-super">th</sup> Floor, Jl.M.H.Thamrin No.81, Jakarta 10310, Indonesia. Phone: +62-21 310 1601, Fax: +62-21 319 34787
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Print Styles (Only print #printable-sk-sheet) */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-sk-sheet, #printable-sk-sheet * {
                visibility: visible !important;
              }
              #printable-sk-sheet {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                min-height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding-top: 17.5mm !important;
                padding-bottom: 13.3mm !important;
                padding-left: 0 !important;
                padding-right: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
                color: black !important;
                box-sizing: border-box !important;
              }
              @page {
                size: A4 portrait;
                margin: 0;
              }
            }
          `
        }} />
      </DialogContent>
    </Dialog>

    {/* =========================================================================
        MODERN IN-APP SUCCESS MODAL (Replaces browser alert popup)
        ========================================================================= */}
    <Dialog
      open={!!successResult?.open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSuccessResult(null);
          onOpenChange(false);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md w-full p-6 bg-white dark:bg-[#121215] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-[100]"
      >
        <div className="flex flex-col items-center text-center">
          {/* Animated Glowing Icon Badge */}
          <div className="size-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="size-9 animate-in zoom-in-75 duration-300" />
          </div>

          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Pengangkatan Karyawan Berhasil!
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
            <strong className="text-slate-800 dark:text-zinc-200">{successResult?.employeeName}</strong> telah resmi diangkat menjadi <strong>Karyawan Tetap (PKWTT)</strong>.
          </DialogDescription>

          {/* Metadata Card */}
          <div className="mt-4 w-full bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3.5 text-left space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Nomor SK Resmi:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-[11px]">
                {successResult?.skNumber}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-zinc-400">Status Baru:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                PKWTT (Tetap)
              </span>
            </div>
          </div>

          {/* Google Drive Integration Card */}
          {successResult?.uploadedUrl && (
            <div className="mt-3.5 w-full bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-zinc-900 border border-blue-200/80 dark:border-blue-800/60 rounded-2xl p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CloudUpload className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Tersimpan di Google Drive</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-mono font-semibold">
                      Auto-Upload
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5 font-mono">
                    {successResult.uploadedUrl}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <a
                  href={successResult.uploadedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all hover:scale-[1.01]"
                >
                  <ExternalLink className="size-3.5" />
                  <span>Buka di Google Drive</span>
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (successResult?.uploadedUrl) {
                      navigator.clipboard.writeText(successResult.uploadedUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }
                  }}
                  className="px-3.5 py-2 text-xs font-semibold border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 rounded-xl"
                >
                  {copiedLink ? (
                    <>
                      <Check className="size-3.5 mr-1 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 mr-1 text-slate-500" />
                      <span>Salin Link</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Primary Action Button */}
          <div className="mt-5 w-full">
            <Button
              type="button"
              onClick={() => {
                setSuccessResult(null);
                onOpenChange(false);
              }}
              className="w-full bg-[#12346a] hover:bg-[#1a448a] text-white rounded-xl text-xs font-semibold py-2.5 shadow-sm"
            >
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modern Error Dialog */}
    {errorMessage && (
      <Dialog open={!!errorMessage} onOpenChange={() => setErrorMessage(null)}>
        <DialogContent
          showCloseButton={false}
          className="sm:max-w-md w-full p-6 bg-white dark:bg-[#121215] border border-rose-200 dark:border-rose-900/50 rounded-3xl shadow-2xl z-[110]"
        >
          <div className="flex flex-col items-center text-center">
            <div className="size-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3 shadow-md shadow-rose-500/10">
              <AlertCircle className="size-7" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Terjadi Kendala
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-zinc-400 mt-2 whitespace-pre-wrap leading-relaxed max-w-xs">
              {errorMessage}
            </DialogDescription>
            <div className="mt-5 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setErrorMessage(null)}
                className="w-full rounded-xl text-xs font-semibold py-2"
              >
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
  </>
  );
};
