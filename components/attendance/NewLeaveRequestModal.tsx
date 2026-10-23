'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar, Award, Plus, Check, Clock, User, Building,
  AlertCircle, ShieldCheck, X, Send, FileText, Info, AlertTriangle,
  Stethoscope, HeartHandshake, CreditCard, ChevronDown, Search,
  Paperclip, Upload, Trash2
} from '@/components/ui/icons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../ToastProvider';
import { supabase } from '../../lib/supabaseClient';
import { trackActivity } from '../../lib/auditLogger';
import { UserAvatar } from '../UserAvatar';
import {
  ARTICLE_22_LEAVE_TYPES,
  calculateWorkingDays,
  LeaveQuotaSummary
} from '../../lib/leaveQuotaService';

interface NewLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  allUsers: any[];
  myQuota: LeaveQuotaSummary | null;
  onSuccess: () => void;
}

export const NewLeaveRequestModal: React.FC<NewLeaveRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  myQuota,
  onSuccess
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdminOrHR = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('hr') || role.includes('manager');
  }, [currentUser]);

  // Form states
  const [targetUserId, setTargetUserId] = useState<string>(String(currentUser?.id || ''));
  const [leaveCategory, setLeaveCategory] = useState<'annual' | 'pasal_22' | 'sick' | 'personal' | 'maternity' | 'unpaid'>('annual');
  const [article22Id, setArticle22Id] = useState<string>('marriage_self');
  const [requestType, setRequestType] = useState<'full_day' | 'half_day_morning' | 'half_day_afternoon'>('full_day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Delegate Approval states (Talenta style)
  const [delegateUserId, setDelegateUserId] = useState<string>('');
  const [delegateUserName, setDelegateUserName] = useState<string>('');
  const [delegateDropdownOpen, setDelegateDropdownOpen] = useState(false);
  const [delegateSearch, setDelegateSearch] = useState('');

  // Attachment upload states
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentBase64, setAttachmentBase64] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setTargetUserId(String(currentUser?.id || ''));
      setLeaveCategory('annual');
      setArticle22Id('marriage_self');
      setRequestType('full_day');
      setReason('');
      setDelegateUserId('');
      setDelegateUserName('');
      setDelegateDropdownOpen(false);
      setDelegateSearch('');
      setAttachedFile(null);
      setAttachmentBase64('');

      // Default tanggal besok
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const str = tomorrow.toISOString().slice(0, 10);
      setStartDate(str);
      setEndDate(str);
    }
  }, [isOpen, currentUser]);

  const targetEmployee = useMemo(() => {
    return allUsers.find(u => String(u.id) === targetUserId) || currentUser;
  }, [allUsers, targetUserId, currentUser]);

  // Hitung jumlah hari kerja (Senin - Jumat)
  const durationDays = useMemo(() => {
    if (requestType !== 'full_day') return 0.5;
    return calculateWorkingDays(startDate, endDate);
  }, [startDate, endDate, requestType]);

  const selectedArticle22 = useMemo(() => {
    return ARTICLE_22_LEAVE_TYPES.find(a => a.id === article22Id);
  }, [article22Id]);

  // Sisa Kuota Cuti
  const isDeductingQuota = leaveCategory === 'annual' || leaveCategory === 'personal';
  const remainingBalance = myQuota?.remainingBalance ?? 12;
  const isOverQuota = isDeductingQuota && durationDays > remainingBalance;

  // Rekan kerja yang tersedia untuk delegasi approval (kecuali diri sendiri / target)
  const availableDelegates = useMemo(() => {
    return allUsers.filter(u => String(u.id) !== targetUserId && (
      u.full_name?.toLowerCase().includes(delegateSearch.toLowerCase()) ||
      u.name?.toLowerCase().includes(delegateSearch.toLowerCase()) ||
      u.employee_code?.toLowerCase().includes(delegateSearch.toLowerCase()) ||
      u.department?.toLowerCase().includes(delegateSearch.toLowerCase())
    ));
  }, [allUsers, targetUserId, delegateSearch]);

  const selectedDelegate = useMemo(() => {
    return allUsers.find(u => String(u.id) === delegateUserId);
  }, [allUsers, delegateUserId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran berkas melebihi batas maksimal 10 MB.', 'error');
      return;
    }

    setAttachedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentBase64(String(reader.result));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setAttachedFile(null);
    setAttachmentBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeSubmit = async (createAnother: boolean = false) => {
    if (!startDate) {
      showToast('Harap tentukan tanggal mulai cuti.', 'error');
      return;
    }
    if (requestType === 'full_day' && !endDate) {
      showToast('Harap tentukan tanggal selesai cuti.', 'error');
      return;
    }
    if (requestType === 'full_day' && new Date(endDate) < new Date(startDate)) {
      showToast('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 'error');
      return;
    }
    if (durationDays <= 0) {
      showToast('Durasi hari cuti harus minimal 0.5 hari.', 'error');
      return;
    }

    // Validasi Cuti Tahunan vs Saldo
    if (isOverQuota) {
      showToast(`Permohonan cuti tahunan (${durationDays} hari) melebihi sisa kuota aktif Anda (${remainingBalance} hari).`, 'error');
      return;
    }

    // Validasi Pasal 22 max days
    if (leaveCategory === 'pasal_22' && selectedArticle22) {
      if (durationDays > selectedArticle22.maxDays) {
        showToast(`Izin ${selectedArticle22.label} dibatasi maksimal ${selectedArticle22.maxDays} hari kerja sesuai ${selectedArticle22.articleClause}.`, 'error');
        return;
      }
    }

    if (!reason.trim()) {
      showToast('Harap berikan alasan atau keterangan pengajuan cuti.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalLeaveType = 'annual';
      let fullReason = reason.trim();

      if (leaveCategory === 'pasal_22' && selectedArticle22) {
        finalLeaveType = selectedArticle22.id;
        fullReason = `[${selectedArticle22.articleClause}: ${selectedArticle22.label}] ${reason.trim()}`;
      } else if (leaveCategory === 'sick') {
        finalLeaveType = 'sick';
      } else if (leaveCategory === 'personal') {
        finalLeaveType = 'personal';
      } else if (leaveCategory === 'maternity') {
        finalLeaveType = 'maternity';
      } else if (leaveCategory === 'unpaid') {
        finalLeaveType = 'unpaid';
      }

      if (requestType === 'half_day_morning') {
        fullReason = `[Half Day: Pagi] ${fullReason}`;
      } else if (requestType === 'half_day_afternoon') {
        fullReason = `[Half Day: Siang] ${fullReason}`;
      }

      if (delegateUserName) {
        fullReason = `${fullReason} (Delegasi approval: ${delegateUserName})`;
      }

      const payload: any = {
        user_id: Number(targetUserId) || targetUserId,
        leave_type: finalLeaveType,
        start_date: startDate,
        end_date: requestType === 'full_day' ? endDate : startDate,
        total_days: durationDays,
        reason: fullReason,
        status: 'pending',
        approval_status: 'pending',
        current_approval_level: 1,
        attachment_url: attachmentBase64 || null,
      };

      // Tambahkan data delegasi & request_type
      if (delegateUserId) payload.delegate_user_id = delegateUserId;
      if (delegateUserName) payload.delegate_user_name = delegateUserName;
      if (requestType) payload.request_type = requestType;

      const { data, error } = await supabase
        .from('leave_requests')
        .insert([payload])
        .select()
        .single();

      if (error) {
        // Fallback jika kolom baru belum dimigrasi di database remote
        delete payload.delegate_user_id;
        delete payload.delegate_user_name;
        delete payload.request_type;

        const retry = await supabase.from('leave_requests').insert([payload]);
        if (retry.error) throw retry.error;
      }

      await trackActivity({
        userId: currentUser?.id,
        userName: currentUser?.fullName || currentUser?.name || 'User',
        userRole: currentUser?.role || 'Staff',
        module: 'Leave',
        action: 'LEAVE_REQUEST_SUBMITTED',
        details: `Pengajuan cuti ${finalLeaveType} diajukan untuk ${targetEmployee?.full_name || targetUserId} (${durationDays} hari)`,
        metadata: { target_user_id: targetUserId, days: durationDays, delegate: delegateUserName }
      });

      showToast('Pengajuan cuti berhasil dikirim dan menunggu persetujuan atasan.', 'success');
      onSuccess();

      if (createAnother) {
        // Reset form untuk input berikutnya
        setReason('');
        setAttachedFile(null);
        setAttachmentBase64('');
        setDelegateUserId('');
        setDelegateUserName('');
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error submitting leave request:', err);
      showToast(err.message || 'Gagal mengajukan permohonan cuti.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-2xl p-0 overflow-hidden font-sans border border-border bg-card text-card-foreground shadow-2xl rounded-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Calendar size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Request Time Off
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pengajuan cuti, izin khusus Pasal 22, dan pelimpahan wewenang approval.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => { e.preventDefault(); executeSubmit(false); }}
          className="overflow-y-auto px-6 py-5 space-y-4 flex-1 text-xs"
        >
          {/* Target employee selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Employee name <span className="text-rose-500">*</span>
            </Label>
            {isAdminOrHR && allUsers.length > 1 ? (
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.name || u.email} ({u.employee_code || 'EMP'} · {u.department || 'Staff'}) {String(u.id) === String(currentUser?.id) ? '— Diri Sendiri' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-lg border border-border bg-muted/30 flex items-center gap-2.5">
                <UserAvatar
                  name={targetEmployee?.full_name || targetEmployee?.name || 'User'}
                  url={targetEmployee?.avatar_url || targetEmployee?.avatarUrl}
                  size="xs"
                />
                <span className="font-semibold text-foreground text-xs">
                  {targetEmployee?.full_name || targetEmployee?.name} ({targetEmployee?.employee_code || 'EMP'} · {targetEmployee?.department || 'Staff'})
                </span>
              </div>
            )}
          </div>

          {/* Time Off Policy (Category Selector) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Time off policy <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Remaining balance: {isDeductingQuota ? `${remainingBalance} hari` : 'unlimited'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLeaveCategory('annual')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'annual'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold block text-[11px]">Cuti Tahunan</span>
                <span className="text-[10px] opacity-75 font-normal">Sisa: {remainingBalance} hari</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('pasal_22')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'pasal_22'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mb-1 text-emerald-600 dark:text-emerald-400" />
                <span className="font-semibold block text-[11px]">Izin Khusus (Pasal 22)</span>
                <span className="text-[10px] opacity-75 font-normal">Upah Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('sick')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'sick'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ring-2 ring-rose-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <Stethoscope className="w-4 h-4 mb-1 text-rose-600 dark:text-rose-400" />
                <span className="font-semibold block text-[11px]">Cuti Sakit</span>
                <span className="text-[10px] opacity-75 font-normal">Surat Dokter</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('personal')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'personal'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-2 ring-amber-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <FileText className="w-4 h-4 mb-1 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold block text-[11px]">Izin Pribadi</span>
                <span className="text-[10px] opacity-75 font-normal">Potong Kuota</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('maternity')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'maternity'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 ring-2 ring-purple-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <HeartHandshake className="w-4 h-4 mb-1 text-purple-600 dark:text-purple-400" />
                <span className="font-semibold block text-[11px]">Melahirkan / Haid</span>
                <span className="text-[10px] opacity-75 font-normal">Sesuai Kebijakan</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('unpaid')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  leaveCategory === 'unpaid'
                    ? 'border-slate-600 bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-zinc-200 ring-2 ring-slate-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <CreditCard className="w-4 h-4 mb-1 text-slate-600 dark:text-zinc-400" />
                <span className="font-semibold block text-[11px]">Unpaid Leave</span>
                <span className="text-[10px] opacity-75 font-normal">Tanpa Gaji</span>
              </button>
            </div>
          </div>

          {/* Sub-dropdown jika Pasal 22 */}
          {leaveCategory === 'pasal_22' && (
            <div className="space-y-1.5 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <Label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                Pilih Alasan Izin Khusus Pasal 22:
              </Label>
              <select
                value={article22Id}
                onChange={e => setArticle22Id(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {ARTICLE_22_LEAVE_TYPES.map(art => (
                  <option key={art.id} value={art.id}>
                    {art.label} (Maks {art.maxDays} hari · {art.articleClause})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Request Type (Full Day vs Half Day) & Date Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Request type <span className="text-rose-500">*</span>
              </Label>
              <select
                value={requestType}
                onChange={e => {
                  const val = e.target.value as any;
                  setRequestType(val);
                  if (val !== 'full_day') setEndDate(startDate);
                }}
                className="w-full h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
              >
                <option value="full_day">Full day</option>
                <option value="half_day_morning">Half day (Pagi: 08:30 - 12:30)</option>
                <option value="half_day_afternoon">Half day (Siang: 13:30 - 17:30)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                {requestType === 'full_day' ? 'Time off start' : 'Time off date'} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (requestType !== 'full_day') setEndDate(e.target.value);
                }}
                className="h-9 text-xs"
                required
              />
            </div>

            {requestType === 'full_day' && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">
                  Time off end <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            )}
          </div>

          {/* Duration Summary */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <span className="text-muted-foreground">Total Durasi Hari Kerja:</span>
            <span className="font-bold text-foreground">
              {durationDays} Hari {requestType !== 'full_day' ? '(Setengah Hari)' : '(Exclude Libur/Akhir Pekan)'}
            </span>
          </div>

          {/* DELEGATE APPROVAL DURING ABSENCE (MATCHING TALENTA SCREENSHOT 4) */}
          <div className="space-y-1.5 relative">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Delegate approval during absence to
              </Label>
              <span className="text-[10px] text-muted-foreground">Opsional</span>
            </div>

            {selectedDelegate ? (
              <div className="flex items-center justify-between p-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    name={selectedDelegate.full_name || selectedDelegate.name || 'User'}
                    url={selectedDelegate.avatar_url || selectedDelegate.avatarUrl}
                    size="xs"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {selectedDelegate.full_name || selectedDelegate.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {selectedDelegate.employee_code || 'EMP'} | {selectedDelegate.job_title || selectedDelegate.department || 'Rekan Kerja'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDelegateUserId('');
                    setDelegateUserName('');
                  }}
                  className="p-1 text-muted-foreground hover:text-rose-600 rounded-md transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setDelegateDropdownOpen(!delegateDropdownOpen)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-left text-muted-foreground flex items-center justify-between hover:border-blue-600 transition-colors cursor-pointer"
                >
                  <span>Select employee...</span>
                  <ChevronDown size={14} className="opacity-60" />
                </button>

                {delegateDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 space-y-2 animate-in fade-in-50 zoom-in-95">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search employee name or NIP..."
                        value={delegateSearch}
                        onChange={e => setDelegateSearch(e.target.value)}
                        className="w-full text-xs bg-muted/40 border border-border rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-border/20 pr-1">
                      {availableDelegates.map(u => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setDelegateUserId(String(u.id));
                            setDelegateUserName(u.full_name || u.name || u.email);
                            setDelegateDropdownOpen(false);
                            setDelegateSearch('');
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <UserAvatar
                            name={u.full_name || u.name || 'User'}
                            url={u.avatar_url || u.avatarUrl}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {u.full_name || u.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {u.employee_code || 'EMP'} | {u.job_title || u.department || 'Staff'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reason / Notes Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Notes / Reason <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">{reason.length}/200</span>
            </div>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value.slice(0, 200))}
              placeholder="Jelaskan keperluan cuti atau izin Anda..."
              className="text-xs resize-none h-20"
              required
            />
          </div>

          {/* Attachment Upload (Matching Talenta max 10MB) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Attachment (Surat Dokter / Dokumen Pendukung)
            </Label>
            {attachedFile ? (
              <div className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <Paperclip size={14} className="text-blue-600 shrink-0" />
                  <span className="text-xs truncate font-medium text-foreground">{attachedFile.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 text-muted-foreground hover:text-rose-600 rounded"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-blue-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Choose file to upload (max size of 10 MB)</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons (Matching Talenta: Save & create another + Save) */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs font-semibold h-9 px-4 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => executeSubmit(true)}
              disabled={submitting || isOverQuota}
              className="text-xs font-semibold h-9 px-4 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
            >
              Save &amp; create another
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || isOverQuota}
              className="text-xs font-semibold h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm"
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
