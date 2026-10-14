'use client';

import React, { useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X, CheckCircle2, Info, GraduationCap, Upload, ExternalLink, FileText, Loader2, Camera, Trash2 } from 'lucide-react';
import { uploadFileToGoogleDrive } from '../lib/googleDriveUpload';
import { UserAccount, UserGroup, Company, DocumentCategory } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useToast } from './ToastProvider';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from './UserAvatar';
import { normalizeGender, normalizeReligion } from '../lib/utils';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<UserAccount>) => void | Promise<void>;
  initialData?: UserAccount | null;
  availableGroups?: UserGroup[];
  employeeMode?: boolean;
}

type FormState = Partial<UserAccount> & { password?: string };

const steps = [
  { title: 'Personal Info', description: 'Identitas dasar employee' },
  { title: 'Pendidikan', description: 'Jenjang & riwayat pendidikan' },
  { title: 'Info Pekerjaan', description: 'Penempatan, divisi, dan jabatan' },
  { title: 'Kontrak & PKWT', description: 'Status dan periode kontrak' },
  { title: 'Data Payroll', description: 'Data pembayaran gaji dan pajak' },
];

const inputClass = 'mt-1 w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20';
const labelClass = 'text-xs font-semibold text-foreground/80';

// Standalone input field component to ensure DOM node is never unmounted during typing
interface FormFieldProps {
  label: string;
  name: keyof FormState;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value: string;
  error?: string;
  onChange: (key: keyof FormState, value: string) => void;
}


interface DocUploadFieldProps {
  label: string;
  name: keyof FormState;
  fileUrl?: string;
  description?: string;
  accept?: string;
  category?: DocumentCategory;
  targetEmail?: string;
  employeeName?: string;
  employeeCode?: string;
  onUploaded: (key: keyof FormState, url: string) => void;
  onClear: (key: keyof FormState) => void;
}

const DocUploadField: React.FC<DocUploadFieldProps> = ({
  label,
  name,
  fileUrl,
  description = 'File otomatis tersimpan di Google Drive perusahaan (Restricted)',
  accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx',
  category = 'ktp',
  targetEmail,
  employeeName,
  employeeCode,
  onUploaded,
  onClear,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await uploadFileToGoogleDrive(file, {
        category,
        visibility: 'private',
        targetEmail: (targetEmail || '').trim().toLowerCase(),
        employeeName,
        employeeCode,
        folderType: 'employee_docs'
      });
      if (result.success && result.fileUrl) {
        onUploaded(name, result.fileUrl);
      } else {
        throw new Error(result.error || 'Gagal mengunggah file.');
      }
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah file');
    } finally {
      setUploading(false);
    }
  };

  const isGDrive = fileUrl?.includes('drive.google.com');

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-foreground truncate">{label}</span>
        {fileUrl && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold shrink-0">
            <CheckCircle2 size={11} className="text-emerald-700" /> {isGDrive ? 'Restricted Drive' : 'Terlampir'}
          </span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-1">{description}</p>

      {fileUrl ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-semibold text-emerald-900 hover:text-emerald-950 underline truncate min-w-0"
            >
              <FileText size={14} className="shrink-0 text-emerald-700" />
              <span className="truncate">Lihat di Google Drive</span>
              <ExternalLink size={12} className="shrink-0 text-emerald-700" />
            </a>
            <button
              type="button"
              onClick={() => onClear(name)}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 shrink-0 cursor-pointer ml-1"
            >
              Hapus / Ganti
            </button>
          </div>
          {isGDrive && (
            <p className="text-[10px] text-muted-foreground truncate">
              🔒 <span className="font-semibold text-foreground/80">Restricted:</span> Akses dibuka untuk {targetEmail ? <b className="text-foreground">{targetEmail}</b> : 'email akun'} & HR.
            </p>
          )}
        </div>
      ) : (
        <div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Upload className="h-4 w-4 text-white" />
            )}
            <span>{uploading ? 'Mengunggah ke Google Drive...' : 'Upload Dokumen (PDF / Foto)'}</span>
            <input
              type="file"
              accept={accept}
              disabled={uploading}
              onChange={handleFile}
              className="hidden"
            />
          </label>
          {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
};

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  required = false,
  placeholder = '',
  value,
  error,
  onChange,
}) => (
  <label className="block">
    <span className={labelClass}>
      {label}{required && <span className="text-rose-500"> *</span>}
    </span>
    <input
      type={type}
      required={required}
      aria-invalid={Boolean(error)}
      className={`${inputClass} ${error ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
    />
    {error && (
      <span className="mt-1 block text-xs font-medium text-rose-600">
        {error}
      </span>
    )}
  </label>
);

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen, onClose, onSubmit, initialData, employeeMode = false,
}) => {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({});
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<{ name: string }[]>([]);
  const [existingEmployeeIds, setExistingEmployeeIds] = useState<string[]>([]);
  const [isManualEmployeeId, setIsManualEmployeeId] = useState(false);
  const [saving, setSaving] = useState(false); 
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Ukuran file foto maksimal 10MB.');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError('');
    try {
      const result = await uploadFileToGoogleDrive(file, {
        category: 'foto_profil',
        visibility: 'all_active',
        targetEmail: (form.email || '').trim().toLowerCase(),
        employeeName: form.fullName,
        employeeCode: form.employeeCode,
        folderType: 'employee_docs'
      });
      if (result.success && result.fileUrl) {
        setField('avatarUrl', result.fileUrl);
        showToast('Foto profil karyawan berhasil diunggah', 'success');
      } else {
        throw new Error(result.error || 'Gagal mengunggah foto profil.');
      }
    } catch (err: any) {
      const msg = err.message || 'Gagal mengunggah foto';
      setAvatarError(msg);
      showToast('Gagal upload foto: ' + msg, 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const generatedEmployeeId = (() => {
    if (!form.joinDate) return '';
    const date = new Date(`${form.joinDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `${yy}${mm}`;

    // Nomor urut NIK terakhir perusahaan adalah 0391 (4 digit nomor urut)
    const baseLastSeq = 391;
    const allSequences = existingEmployeeIds
      .map(id => {
        if (!id || typeof id !== 'string') return 0;
        const clean = id.trim();
        // Cek format numeric ID dengan nomor urut
        if (!/^\d{5,10}$/.test(clean)) return 0;
        const seq = Number(clean.slice(-4));
        return Number.isInteger(seq) ? seq : 0;
      })
      .filter(n => n > 0 && n < 9999);

    const maxSeq = allSequences.length > 0 ? Math.max(baseLastSeq, ...allSequences) : baseLastSeq;
    const nextNumber = maxSeq + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  })();

  const clearError = (key: string) => setErrors(prev => {
    if (!prev[key]) return prev;
    const next = { ...prev };
    delete next[key];
    return next;
  });

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Sinkronisasi otomatis: jika joinDate diisi/diubah, samakan contractStartDate (mulai bekerja)
      if (key === 'joinDate' && value) {
        if (!prev.contractStartDate || prev.contractStartDate === prev.joinDate) {
          next.contractStartDate = value;
        }
      }
      return next;
    });
    clearError(String(key));
    if (key === 'joinDate') {
      clearError('contractStartDate');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setIsManualEmployeeId(Boolean(initialData?.employeeCode));
    if (initialData) {
      const type = initialData.contractType || initialData.employmentType || 'PKWT';
      setForm({
        ...initialData,
        contractType: type,
        employmentType: type,
        nik: initialData.nik || '',
        avatarUrl: initialData.avatarUrl || '',
        gender: initialData.gender ? normalizeGender(initialData.gender) : '',
        religion: initialData.religion ? normalizeReligion(initialData.religion) : '',
      });
    } else {
      setForm({
        fullName: '', nickname: '', nik: '', email: '', dateOfBirth: '', company: '', department: '',
        employeeCode: '', joinDate: '', jobTitle: '', jobLevel: '', employmentType: 'PKWT', branch: '',
        gradeClass: '', residentialAddress: '', contractType: 'PKWT', pkwtNumber: '', contractStartDate: '',
        contractEndDate: '', employmentStatus: 'Active', statusEffectiveDate: '', separationDate: '', separationReason: '', payrollStatus: '', taxStatus: '', bankName: '', bankAccountName: '',
        bankAccountNumber: '', bpjsTkNumber: '', bpjsHealthNumber: '', status: 'Active', avatarUrl: '',
        role: 'Employee', groups: ['employee'],
      });
    }
    setErrors({});
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const loadOptions = async () => {
      const [{ data: companyRows }, { data: departmentRows }, { data: employeeRows }] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('departments').select('name').order('name'),
        supabase.from('user_accounts').select('employee_code').not('employee_code', 'is', null),
      ]);
      if (companyRows) setCompanies(companyRows as Company[]);
      if (departmentRows) setDepartments(departmentRows as { name: string }[]);
      if (employeeRows) setExistingEmployeeIds(employeeRows.map((row: { employee_code: string | null }) => row.employee_code).filter((value): value is string => Boolean(value)));
    };
    void loadOptions();
  }, [isOpen]);

  const validate = (targetStep: number) => {
    const nextErrors: Record<string, string> = {};
    if (targetStep === 1) {
      if (!form.fullName?.trim()) nextErrors.fullName = 'Nama lengkap wajib diisi.';
      if (!form.email?.trim()) nextErrors.email = 'Email resmi wajib diisi.';
    }
    if (targetStep === 2) {
      // Step 2: Pendidikan (Opsional / Tidak memblokir)
    }
    if (targetStep === 3) {
      if (!form.company?.trim()) nextErrors.company = 'Company wajib dipilih.';
      if (!form.department?.trim()) nextErrors.department = 'Department wajib dipilih.';
      if (isManualEmployeeId) {
        const code = form.employeeCode?.trim();
        if (!code) {
          nextErrors.employeeCode = 'NIK Karyawan wajib diisi jika memilih input manual.';
        } else if (
          existingEmployeeIds.includes(code) &&
          code !== initialData?.employeeCode
        ) {
          nextErrors.employeeCode = 'NIK Karyawan ini sudah terdaftar di sistem. Gunakan NIK lain.';
        }
      }
    }
    const contractTypeUpper = (form.contractType || '').toUpperCase();
    const employmentTypeUpper = (form.employmentType || '').toUpperCase();
    const isPKWTT = contractTypeUpper === 'PKWTT' || employmentTypeUpper === 'PKWTT' || employmentTypeUpper.includes('PERMANENT');
    const isPKWT = !isPKWTT && (contractTypeUpper === 'PKWT' || employmentTypeUpper === 'PKWT' || employmentTypeUpper.includes('CONTRACT'));

    if (targetStep === 4) {
      if (!form.contractType) {
        nextErrors.contractType = 'Tipe kontrak wajib dipilih.';
      } else if (isPKWT) {
        const effectiveStartDate = form.contractStartDate || form.joinDate;
        if (!effectiveStartDate) nextErrors.contractStartDate = 'Tanggal mulai PKWT wajib diisi.';
        if (!form.contractEndDate) nextErrors.contractEndDate = 'Tanggal selesai PKWT wajib diisi.';
      }
      // Untuk PKWTT: tidak memerlukan tanggal berakhir kontrak
    }
    setErrors(prev => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const next = () => {
    if (validate(step)) {
      // Pastikan contractStartDate tersinkron dari joinDate saat lanjut dari Step 3 ke Step 4
      if (step === 3 && form.joinDate && !form.contractStartDate) {
        setForm(prev => ({ ...prev, contractStartDate: prev.joinDate }));
        clearError('contractStartDate');
      }
      setStep(value => Math.min(5, value + 1));
    }
  };

  const save = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (step !== 5) return; // Hanya boleh disimpan jika pengguna secara sadar sudah di Step 5
    if (!validate(1) || !validate(2) || !validate(3) || !validate(4)) return;
    setSaving(true);
    try {
      let employeeCode = form.employeeCode?.trim() || '';
      // Hanya lakukan auto-generate jika BUKAN mode manual dan employeeCode belum diisi
      if (!isManualEmployeeId && !initialData && form.joinDate) {
        try {
          const { data: generatedCode } = await supabase.rpc('next_employee_code', { p_join_date: form.joinDate });
          if (generatedCode && /^\d{8}$/.test(String(generatedCode))) {
            employeeCode = String(generatedCode);
          }
        } catch (_) {}
        if (!employeeCode || employeeCode.length !== 8) {
          employeeCode = generatedEmployeeId;
        }
      } else if (isManualEmployeeId) {
        employeeCode = form.employeeCode?.trim() || '';
      }
      const selectedType = form.contractType || form.employmentType || 'PKWT';
      const contractTypeUpper = selectedType.toUpperCase();
      const isPKWTT = contractTypeUpper === 'PKWTT' || contractTypeUpper.includes('PERMANENT');

      const effectiveStartDate = form.contractStartDate || form.joinDate || '';
      const isActive = !form.employmentStatus || form.employmentStatus === 'Active';
      const employeePayload: FormState = {
        ...form,
        employmentType: selectedType,
        contractType: selectedType,
        contractStartDate: effectiveStartDate,
        contractEndDate: isPKWTT ? '' : (form.contractEndDate || ''),
        separationDate: isActive ? '' : (form.separationDate || ''),
        separationReason: isActive ? '' : (form.separationReason || ''),
        statusEffectiveDate: isActive ? (form.statusEffectiveDate || form.joinDate || '') : (form.statusEffectiveDate || ''),
        employeeCode: employeeCode || generatedEmployeeId,
        nik: form.nik ? String(form.nik).trim() : '',
        avatarUrl: form.avatarUrl || '',
      };
      delete employeePayload.password;
      await onSubmit(employeePayload);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent showCloseButton={false} className="flex max-h-[92vh] w-[95vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-0 shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-7 py-5 bg-card">
          <div>
            <DialogTitle className="text-xl font-bold text-foreground">
              {initialData ? 'Edit Data Employee' : 'Tambah Employee'}
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrasi data employee. Pengaturan approval berada di modul terpisah.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}><X size={18} /></Button>
        </div>

        {/* Stepper Header */}
        <div className="border-b border-border px-7 py-5 bg-card bg-slate-50/50">
          <div className="flex items-center justify-between gap-1 sm:gap-3">
            {steps.map((item, index) => {
              const number = index + 1;
              const complete = number < step;
              const active = number === step;
              return (
                <React.Fragment key={item.title}>
                  <button
                    type="button"
                    disabled={number > step}
                    onClick={() => setStep(number)}
                    className="flex flex-1 flex-col items-center gap-1.5 text-center group cursor-pointer transition-all min-w-0"
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-primary bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20' : 'border-border bg-card text-muted-foreground group-hover:border-primary/50'}`}>
                      {complete ? <Check size={16} /> : number}
                    </span>
                    <span className={`text-[11px] sm:text-xs font-semibold leading-tight whitespace-nowrap overflow-hidden text-ellipsis ${complete ? 'text-emerald-600' : active ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                      {item.title}
                    </span>
                  </button>
                  {number < steps.length && (
                    <span className={`mb-5 h-0.5 flex-1 transition-colors ${number < step ? 'bg-emerald-500' : 'bg-muted'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form
          id="employee-form"
          onSubmit={save}
          onKeyDown={(e) => {
            // Cegah tombol Enter di input teks memicu submit form otomatis
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
              e.preventDefault();
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 overflow-y-auto px-7 py-6">
            <p className="mb-5 text-sm text-muted-foreground">{steps[step - 1].description}</p>

            {/* STEP 1: Personal Info */}
            {step === 1 && (
              <div className="grid gap-5 sm:grid-cols-2">
                {/* UPLOAD FOTO PROFIL KARYAWAN */}
                <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/20 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* Avatar Preview */}
                    <div className="relative shrink-0">
                      <UserAvatar 
                        name={form.fullName || 'Employee'} 
                        url={form.avatarUrl} 
                        size="xl" 
                        className="h-20 w-20 sm:h-24 sm:w-24 text-xl sm:text-2xl shadow-md border-2 border-border ring-2 ring-border/50"
                      />
                      {form.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setField('avatarUrl', '')}
                          title="Hapus Foto Profil"
                          className="absolute -top-1 -right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Controls & Description */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h4 className="text-sm font-bold text-foreground">Foto Profil Karyawan</h4>
                        {form.avatarUrl && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} /> Terpasang
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Foto resmi karyawan untuk profil HCM, ID Card, dan direktori tim. Format JPG, PNG, atau WEBP (Maksimal 10MB). Tersimpan otomatis ke Google Drive.
                      </p>

                      <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                        <label className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all shadow-xs ${
                          uploadingAvatar 
                            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        }`}>
                          {uploadingAvatar ? (
                            <Loader2 size={14} className="animate-spin text-white" />
                          ) : (
                            <Camera size={14} className="text-white" />
                          )}
                          <span>{uploadingAvatar ? 'Mengunggah ke Drive...' : form.avatarUrl ? 'Ganti Foto Karyawan' : 'Upload Foto Karyawan'}</span>
                          <input 
                            type="file" 
                            accept="image/png,image/jpeg,image/jpg,image/webp" 
                            disabled={uploadingAvatar} 
                            onChange={handleAvatarFile} 
                            className="hidden" 
                          />
                        </label>

                        {form.avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setField('avatarUrl', '')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Hapus Foto</span>
                          </button>
                        )}
                      </div>

                      {avatarError && (
                        <p className="mt-2 text-xs font-medium text-rose-600">{avatarError}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <FormField
                    label="Full Name"
                    name="fullName"
                    required
                    placeholder="Nama lengkap sesuai identitas"
                    value={String(form.fullName || '')}
                    error={errors.fullName}
                    onChange={setField}
                  />
                </div>
                <div>
                  <FormField
                    label="Nama Panggilan"
                    name="nickname"
                    placeholder="Nama yang biasa dipakai"
                    value={String(form.nickname || '')}
                    error={errors.nickname}
                    onChange={setField}
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <FormField
                    label="NIK KTP (16 Digit)"
                    name="nik"
                    placeholder="Nomor Induk Kependudukan (contoh: 3171068039410001)"
                    value={String(form.nik || '')}
                    error={errors.nik}
                    onChange={setField}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Nomor identitas kependudukan resmi Republik Indonesia (16 digit).
                  </p>
                </div>

                <div>
                  <DocUploadField
                    label="Lampiran Dokumen KTP"
                    name="ktpFileUrl"
                    fileUrl={form.ktpFileUrl}
                    category="ktp"
                    targetEmail={form.email}
                    employeeName={form.fullName}
                    employeeCode={form.employeeCode}
                    description="Upload foto KTP / scan PDF (Tersimpan otomatis ke Google Drive)."
                    onUploaded={(k, v) => setField(k, v)}
                    onClear={(k) => setField(k, '')}
                  />
                </div>

                <label className="block">
                  <span className={labelClass}>Jenis Kelamin</span>
                  <select
                    className={inputClass}
                    value={normalizeGender(String(form.gender || ''))}
                    onChange={e => setField('gender', e.target.value)}
                  >
                    <option value="">Pilih jenis kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </label>

                <FormField
                  label="Tempat Lahir"
                  name="birthPlace"
                  value={String(form.birthPlace || '')}
                  error={errors.birthPlace}
                  onChange={setField}
                />

                <FormField
                  label="Tanggal Lahir"
                  name="dateOfBirth"
                  type="date"
                  value={String(form.dateOfBirth || '')}
                  error={errors.dateOfBirth}
                  onChange={setField}
                />

                <label className="block">
                  <span className={labelClass}>Status Pernikahan</span>
                  <select
                    className={inputClass}
                    value={String(form.maritalStatus || '')}
                    onChange={e => setField('maritalStatus', e.target.value)}
                  >
                    <option value="">Pilih status pernikahan</option>
                    <option value="Married">Married</option>
                    <option value="Single">Single</option>
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Agama</span>
                  <select
                    className={inputClass}
                    value={normalizeReligion(String(form.religion || ''))}
                    onChange={e => setField('religion', e.target.value)}
                  >
                    <option value="">Pilih agama</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen Protestan">Kristen Protestan</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Blood Type</span>
                  <select
                    className={inputClass}
                    value={String(form.bloodType || '')}
                    onChange={e => setField('bloodType', e.target.value)}
                  >
                    <option value="">Pilih golongan darah</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </label>

                <FormField
                  label="Official Email"
                  name="email"
                  type="email"
                  required
                  value={String(form.email || '')}
                  error={errors.email}
                  onChange={setField}
                />

                <FormField
                  label="Nomor HP"
                  name="phone"
                  value={String(form.phone || '')}
                  error={errors.phone}
                  onChange={setField}
                />

                <div className="sm:col-span-2">
                  <label className="block">
                    <span className={labelClass}>Alamat Domisili</span>
                    <textarea
                      className={`${inputClass} min-h-24 resize-y`}
                      value={String(form.residentialAddress || '')}
                      onChange={e => setField('residentialAddress', e.target.value)}
                      placeholder="Alamat lengkap tempat tinggal saat ini"
                      rows={4}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Pendidikan */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Riwayat & Jenjang Pendidikan</h4>
                      <p className="text-[11px] text-muted-foreground">Latar belakang pendidikan formal terakhir karyawan</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelClass}>Jenjang Pendidikan Terakhir</span>
                      <select
                        className={inputClass}
                        value={String(form.lastEducation || '')}
                        onChange={e => setField('lastEducation', e.target.value)}
                      >
                        <option value="">Pilih jenjang pendidikan</option>
                        <option value="SMA / SMK">SMA / SMK / Sederajat</option>
                        <option value="D1 / D2">D1 / D2</option>
                        <option value="D3">D3 (Diploma 3)</option>
                        <option value="D4">D4 (Diploma 4)</option>
                        <option value="S1">S1 (Sarjana)</option>
                        <option value="S2">S2 (Magister)</option>
                        <option value="S3">S3 (Doktor)</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </label>

                    <FormField
                      label="Nama Institusi / Universitas / Sekolah"
                      name="institutionName"
                      placeholder="Contoh: Universitas Indonesia / SMA 1"
                      value={String(form.institutionName || '')}
                      error={errors.institutionName}
                      onChange={setField}
                    />

                    <FormField
                      label="Jurusan / Program Studi"
                      name="major"
                      placeholder="Contoh: Manajemen / Teknik Informatika"
                      value={String(form.major || '')}
                      error={errors.major}
                      onChange={setField}
                    />

                    <div className="grid grid-cols-2 gap-2.5">
                      <FormField
                        label="Tahun Masuk"
                        name="educationStartYear"
                        placeholder="Contoh: 2018"
                        value={String(form.educationStartYear || '')}
                        error={errors.educationStartYear}
                        onChange={setField}
                      />
                      <FormField
                        label="Tahun Lulus"
                        name="graduationYear"
                        placeholder="Contoh: 2022"
                        value={String(form.graduationYear || '')}
                        error={errors.graduationYear}
                        onChange={setField}
                      />
                    </div>

                    <FormField
                      label="IPK / Nilai Kelulusan"
                      name="gpa"
                      placeholder="Contoh: 3.75 / 88.5"
                      value={String(form.gpa || '')}
                      error={errors.gpa}
                      onChange={setField}
                    />

                    <FormField
                      label="Nomor Ijazah (Opsional)"
                      name="diplomaNumber"
                      placeholder="Nomor sertifikat / ijazah resmi"
                      value={String(form.diplomaNumber || '')}
                      error={errors.diplomaNumber}
                      onChange={setField}
                    />

                    <div className="sm:col-span-2 pt-2 border-t border-border">
                      <DocUploadField
                        label="Lampiran Dokumen Ijazah (Auto-Save ke Google Drive)"
                        name="ijazahFileUrl"
                        fileUrl={form.ijazahFileUrl}
                        category="ijazah"
                        targetEmail={form.email}
                        employeeName={form.fullName}
                        employeeCode={form.employeeCode}
                        description="Unggah scan Ijazah atau Surat Keterangan Lulus (PDF / Scan Gambar). Otomatis tersimpan di Google Drive perusahaan dengan akses Restricted."
                        onUploaded={(k, v) => setField(k, v)}
                        onClear={(k) => setField(k, '')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Info Pekerjaan */}
            {step === 3 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2 rounded-2xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-foreground">NIK Karyawan (Employee ID)</span>
                      <p className="text-[11px] text-muted-foreground">
                        Pilih apakah NIK dibuat otomatis oleh sistem atau diisi manual (untuk data karyawan lama).
                      </p>
                    </div>
                    <div className="inline-flex rounded-xl bg-muted p-0.5 border border-border/40 text-xs font-medium self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualEmployeeId(false);
                          clearError('employeeCode');
                          setField('employeeCode', '');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          !isManualEmployeeId
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Otomatis (Sistem)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualEmployeeId(true);
                          clearError('employeeCode');
                        }}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          isManualEmployeeId
                            ? 'bg-card text-foreground shadow-sm font-semibold'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Manual (Data Lama)
                      </button>
                    </div>
                  </div>

                  {!isManualEmployeeId ? (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
                      <div>
                        <span className="text-[11px] font-medium text-emerald-800">Preview NIK Karyawan Otomatis:</span>
                        <div className="font-mono text-sm font-bold text-emerald-950">
                          {generatedEmployeeId || (form.joinDate ? 'Menghitung...' : 'Isi Join Date terlebih dahulu')}
                        </div>
                      </div>
                      <span className="text-[11px] text-emerald-700 bg-emerald-100/90 px-2.5 py-1 rounded-full font-medium shrink-0">
                        Format: YYMM + 4 digit (Lanjut dari 0391)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <label className="block">
                        <span className="text-xs font-semibold text-foreground/80">
                          Input NIK Karyawan Lama <span className="text-rose-500">*</span>
                        </span>
                        <input
                          type="text"
                          placeholder="Masukkan NIK lama karyawan (contoh: 20040238, 96110005, 6020017)"
                          className={`${inputClass} font-mono mt-1 ${errors.employeeCode ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                          value={String(form.employeeCode || '')}
                          onChange={e => setField('employeeCode', e.target.value.trim())}
                        />
                      </label>
                      {errors.employeeCode ? (
                        <span className="mt-1 block text-xs font-medium text-rose-600">{errors.employeeCode}</span>
                      ) : (
                        <span className="mt-1 block text-[11px] text-emerald-700 font-medium">
                          ✓ NIK Karyawan ini akan langsung disimpan dan <b>tidak akan di-generate ulang</b> oleh sistem.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <label className="block">
                  <span className={labelClass}>Branch Name</span>
                  <select
                    className={inputClass}
                    value={String(form.company || '')}
                    onChange={e => setField('company', e.target.value)}
                  >
                    <option value="">Pilih branch / company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.name}>{company.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className={labelClass}>Organization *</span>
                  <select
                    required
                    className={inputClass}
                    value={String(form.department || '')}
                    onChange={e => setField('department', e.target.value)}
                  >
                    <option value="">Pilih organization / department</option>
                    {departments.map(department => (
                      <option key={department.name} value={department.name}>{department.name}</option>
                    ))}
                  </select>
                </label>

                <FormField
                  label="Job Position"
                  name="jobTitle"
                  required
                  value={String(form.jobTitle || '')}
                  error={errors.jobTitle}
                  onChange={setField}
                />

                <label className="block">
                  <span className={labelClass}>Job Level</span>
                  <select
                    className={inputClass}
                    value={String(form.jobLevel || '')}
                    onChange={e => setField('jobLevel', e.target.value)}
                  >
                    <option value="">Pilih job level</option>
                    <option value="Vice President">Vice President</option>
                    <option value="Deputy/Manager">Deputy/Manager</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Staff">Staff</option>
                    <option value="Operator">Operator</option>
                  </select>
                </label>

                <div className="block">
                  <FormField
                    label="Join Date"
                    name="joinDate"
                    type="date"
                    value={String(form.joinDate || '')}
                    error={errors.joinDate}
                    onChange={setField}
                  />
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Otomatis menjadi tanggal mulai bekerja / kontrak karyawan.
                  </span>
                </div>

                <FormField
                  label="Grade / Class"
                  name="gradeClass"
                  value={String(form.gradeClass || '')}
                  error={errors.gradeClass}
                  onChange={setField}
                />
              </div>
            )}

            {/* STEP 4: Kontrak & PKWT */}
            {step === 4 && (() => {
              const currentContractTypeUpper = (form.contractType || '').toUpperCase();
              const currentEmploymentTypeUpper = (form.employmentType || '').toUpperCase();
              const isCurrentPKWTT = currentContractTypeUpper === 'PKWTT' || currentEmploymentTypeUpper === 'PKWTT' || currentEmploymentTypeUpper.includes('PERMANENT');
              const isCurrentPKWT = !isCurrentPKWTT && (currentContractTypeUpper === 'PKWT' || currentEmploymentTypeUpper === 'PKWT' || currentEmploymentTypeUpper.includes('CONTRACT'));

              const isSeparated = form.employmentStatus && form.employmentStatus !== 'Active';

              return (
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Dropdown Tipe Kontrak (PKWT / PKWTT) */}
                  <label className="block">
                    <span className={labelClass}>
                      Tipe Kontrak (Contract Type) <span className="text-rose-500">*</span>
                    </span>
                    <select
                      className={`${inputClass} ${errors.contractType ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                      value={String(form.contractType || (isCurrentPKWTT ? 'PKWTT' : isCurrentPKWT ? 'PKWT' : ''))}
                      onChange={e => {
                        const val = e.target.value;
                        setField('contractType', val);
                        setField('employmentType', val);
                        if (val === 'PKWTT') {
                          clearError('contractStartDate');
                          clearError('contractEndDate');
                          clearError('pkwtNumber');
                          setField('contractEndDate', '');
                        }
                      }}
                    >
                      <option value="">Pilih tipe kontrak</option>
                      <option value="PKWT">PKWT (Perjanjian Kerja Waktu Tertentu / Kontrak)</option>
                      <option value="PKWTT">PKWTT (Perjanjian Kerja Waktu Tidak Tertentu / Tetap)</option>
                      <option value="Probation">Probation (Masa Percobaan)</option>
                      <option value="Internship">Internship (Magang)</option>
                    </select>
                    {errors.contractType && (
                      <span className="mt-1 block text-xs font-medium text-rose-600">{errors.contractType}</span>
                    )}
                  </label>

                  <FormField
                    label={
                      isCurrentPKWTT
                        ? 'Nomor SK / PKWTT (Opsional)'
                        : form.contractType === 'Probation'
                        ? 'Nomor SK / Surat Percobaan (Opsional)'
                        : form.contractType === 'Internship'
                        ? 'Nomor Surat Magang (Opsional)'
                        : 'Nomor PKWT'
                    }
                    name="pkwtNumber"
                    placeholder={
                      isCurrentPKWTT
                        ? 'Nomor SK Pengangkatan'
                        : form.contractType === 'Probation'
                        ? 'Contoh: SK-PROB/2026/001'
                        : form.contractType === 'Internship'
                        ? 'Contoh: MAGANG/2026/001'
                        : 'Contoh: PKWT/HR/2026/001'
                    }
                    value={String(form.pkwtNumber || '')}
                    error={errors.pkwtNumber}
                    onChange={setField}
                  />

                  <div className="sm:col-span-2">
                    <DocUploadField
                      label="Lampiran File SK Karyawan / Dokumen PKWT (Auto-Save ke Google Drive)"
                      name="skFileUrl"
                      fileUrl={form.skFileUrl}
                      category="sk_karyawan"
                      targetEmail={form.email}
                      employeeName={form.fullName}
                      employeeCode={form.employeeCode}
                      description="Unggah file SK Pengangkatan, Surat PKWT, atau Perjanjian Kerja resmi (PDF / Word). Otomatis tersimpan di Google Drive perusahaan dengan akses Restricted."
                      onUploaded={(k, v) => setField(k, v)}
                      onClear={(k) => setField(k, '')}
                    />
                  </div>

                  <div className="block">
                    <div className="flex items-center justify-between mb-1">
                      <span className={labelClass}>
                        {isCurrentPKWTT
                          ? 'Tanggal Mulai Bekerja / SK'
                          : form.contractType === 'Probation'
                          ? 'Tanggal Mulai Masa Percobaan'
                          : form.contractType === 'Internship'
                          ? 'Tanggal Mulai Magang'
                          : 'Tanggal Mulai PKWT'}{' '}
                        {isCurrentPKWT && <span className="text-rose-500">*</span>}
                      </span>
                      {form.joinDate && form.contractStartDate !== form.joinDate && (
                        <button
                          type="button"
                          onClick={() => setField('contractStartDate', form.joinDate || '')}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline"
                        >
                          Samakan Join Date ({form.joinDate})
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      className={`${inputClass} ${errors.contractStartDate ? 'border-rose-500 ring-2 ring-rose-500/10' : ''}`}
                      value={String(form.contractStartDate || form.joinDate || '')}
                      onChange={e => setField('contractStartDate', e.target.value)}
                    />
                    {form.joinDate && (form.contractStartDate === form.joinDate || !form.contractStartDate) && (
                      <span className="mt-1 block text-[11px] font-medium text-emerald-600">
                        ✓ Otomatis sama dengan Join Date ({form.joinDate})
                      </span>
                    )}
                    {errors.contractStartDate && (
                      <span className="mt-1 block text-xs font-medium text-rose-600">{errors.contractStartDate}</span>
                    )}
                  </div>

                  {isCurrentPKWTT ? (
                    <div className="block">
                      <span className={labelClass}>Tanggal Selesai Kontrak</span>
                      <input
                        disabled
                        className={`${inputClass} bg-muted/40 text-muted-foreground cursor-not-allowed`}
                        value="Tidak Berlaku (Karyawan Tetap / PKWTT)"
                        readOnly
                      />
                      <span className="mt-1 block text-[11px] text-emerald-600 font-medium">
                        ✓ Karyawan PKWTT tidak memiliki tanggal berakhir kontrak
                      </span>
                    </div>
                  ) : (
                    <FormField
                      label={
                        isCurrentPKWT
                          ? 'Tanggal Selesai PKWT *'
                          : form.contractType === 'Probation'
                          ? 'Tanggal Selesai Masa Percobaan'
                          : form.contractType === 'Internship'
                          ? 'Tanggal Selesai Magang'
                          : 'Tanggal Selesai Kontrak'
                      }
                      name="contractEndDate"
                      type="date"
                      required={isCurrentPKWT}
                      value={String(form.contractEndDate || '')}
                      error={errors.contractEndDate}
                      onChange={setField}
                    />
                  )}

                  <label className="block">
                    <span className={labelClass}>Lifecycle Status</span>
                    <select
                      className={inputClass}
                      value={String(form.employmentStatus || 'Active')}
                      onChange={e => {
                        const val = e.target.value;
                        setField('employmentStatus', val);
                        if (val === 'Active') {
                          setField('separationDate', '');
                          setField('separationReason', '');
                          clearError('separationDate');
                          clearError('separationReason');
                        }
                      }}
                    >
                      <option value="Active">Active (Aktif)</option>
                      <option value="Resigned">Resigned (Mengundurkan Diri)</option>
                      <option value="Terminated">Terminated (Berhenti / PHK)</option>
                    </select>
                  </label>

                  {/* Field Separation & Alasan hanya tampil jika status BUKAN Active */}
                  {isSeparated && (
                    <>
                      <FormField
                        label="Status Effective Date"
                        name="statusEffectiveDate"
                        type="date"
                        value={String(form.statusEffectiveDate || '')}
                        error={errors.statusEffectiveDate}
                        onChange={setField}
                      />

                      <FormField
                        label="Separation Date"
                        name="separationDate"
                        type="date"
                        value={String(form.separationDate || '')}
                        error={errors.separationDate}
                        onChange={setField}
                      />

                      <div className="sm:col-span-2">
                        <FormField
                          label="Separation / Leave Reason"
                          name="separationReason"
                          placeholder="Alasan cuti panjang, resign, atau termination"
                          value={String(form.separationReason || '')}
                          error={errors.separationReason}
                          onChange={setField}
                        />
                      </div>
                    </>
                  )}

                  {isCurrentPKWTT ? (
                    <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-800 flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-950">Status PKWTT (Karyawan Tetap)</p>
                        <p className="mt-0.5 text-emerald-700 leading-relaxed">
                          Karyawan dengan status PKWTT tidak memerlukan tanggal berakhir kontrak. Anda dapat langsung menekan tombol <strong>Next</strong> atau <strong>Save</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-800 flex items-start gap-3">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-950">Status PKWT (Karyawan Kontrak)</p>
                        <p className="mt-0.5 text-amber-700 leading-relaxed">
                          Tanggal mulai dan tanggal selesai kontrak wajib diisi untuk monitoring jatuh tempo masa berlaku kontrak PKWT.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* STEP 5: Data Payroll */}
            {step === 5 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  label="Payroll Status"
                  name="payrollStatus"
                  value={String(form.payrollStatus || '')}
                  error={errors.payrollStatus}
                  onChange={setField}
                />

                <FormField
                  label="Tax Status"
                  name="taxStatus"
                  value={String(form.taxStatus || '')}
                  error={errors.taxStatus}
                  onChange={setField}
                />

                <FormField
                  label="Bank Name"
                  name="bankName"
                  value={String(form.bankName || '')}
                  error={errors.bankName}
                  onChange={setField}
                />

                <FormField
                  label="Bank Account Name"
                  name="bankAccountName"
                  value={String(form.bankAccountName || '')}
                  error={errors.bankAccountName}
                  onChange={setField}
                />

                <FormField
                  label="Bank Account Number"
                  name="bankAccountNumber"
                  value={String(form.bankAccountNumber || '')}
                  error={errors.bankAccountNumber}
                  onChange={setField}
                />

                <FormField
                  label="BPJS Ketenagakerjaan"
                  name="bpjsTkNumber"
                  value={String(form.bpjsTkNumber || '')}
                  error={errors.bpjsTkNumber}
                  onChange={setField}
                />

                <FormField
                  label="BPJS Kesehatan"
                  name="bpjsHealthNumber"
                  value={String(form.bpjsHealthNumber || '')}
                  error={errors.bpjsHealthNumber}
                  onChange={setField}
                />

                <div className="sm:col-span-2">
                  <DocUploadField
                    label="Lampiran Kartu BPJS (Auto-Save ke Google Drive)"
                    name="bpjsFileUrl"
                    fileUrl={form.bpjsFileUrl}
                    category="bpjs"
                    targetEmail={form.email}
                    employeeName={form.fullName}
                    employeeCode={form.employeeCode}
                    description="Unggah foto atau scan kartu BPJS Ketenagakerjaan / BPJS Kesehatan (PDF / Gambar). Otomatis tersimpan di Google Drive perusahaan dengan akses Restricted."
                    onUploaded={(k, v) => setField(k, v)}
                    onClear={(k) => setField(k, '')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-7 py-4 bg-muted/20">
            <Button
              type="button"
              variant="outline"
              onClick={step === 1 ? onClose : () => setStep(value => value - 1)}
            >
              {step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
            </Button>
            {step < 5 ? (
              <Button type="button" onClick={next}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-sm"
              >
                {saving ? 'Menyimpan...' : 'Simpan Data Employee'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UserFormModal;
