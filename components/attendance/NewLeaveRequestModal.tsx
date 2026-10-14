'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Award, Plus, Check, Clock, User, Building,
  AlertCircle, ShieldCheck, X, Send, FileText, Info, AlertTriangle, Sparkles
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../ToastProvider';
import { supabase } from '../../lib/supabaseClient';
import { trackActivity } from '../../lib/auditLogger';
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
  const isAdminOrHR = useMemo(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    return role.includes('admin') || role.includes('hr') || role.includes('manager');
  }, [currentUser]);

  // Target employee (default currentUser)
  const [targetUserId, setTargetUserId] = useState<string>(String(currentUser?.id || ''));
  const [leaveCategory, setLeaveCategory] = useState<'annual' | 'pasal_22' | 'sick' | 'personal' | 'maternity' | 'unpaid'>('annual');
  const [article22Id, setArticle22Id] = useState<string>('marriage_self');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTargetUserId(String(currentUser?.id || ''));
      setLeaveCategory('annual');
      setArticle22Id('marriage_self');
      setReason('');
      // Default besok
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
    return calculateWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

  const selectedArticle22 = useMemo(() => {
    return ARTICLE_22_LEAVE_TYPES.find(a => a.id === article22Id);
  }, [article22Id]);

  // Validasi Kuota Cuti
  const isDeductingQuota = leaveCategory === 'annual' || leaveCategory === 'personal';
  const remainingBalance = myQuota?.remainingBalance ?? 12;
  const isOverQuota = isDeductingQuota && durationDays > remainingBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      showToast('Harap pilih tanggal mulai dan selesai cuti.', 'error');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      showToast('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 'error');
      return;
    }
    if (durationDays <= 0) {
      showToast('Durasi hari cuti harus minimal 1 hari kerja.', 'error');
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
      showToast('Harap berikan alasan / keterangan pengajuan cuti.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let finalLeaveType = 'annual';
      let fullReason = reason.trim();

      if (leaveCategory === 'pasal_22' && selectedArticle22) {
        finalLeaveType = selectedArticle22.id;
        fullReason = `[${selectedArticle22.articleClause} - ${selectedArticle22.label}] ${reason.trim()}`;
      } else if (leaveCategory === 'sick') {
        finalLeaveType = 'sick';
      } else if (leaveCategory === 'personal') {
        finalLeaveType = 'personal';
      } else if (leaveCategory === 'maternity') {
        finalLeaveType = 'maternity';
      } else if (leaveCategory === 'unpaid') {
        finalLeaveType = 'unpaid';
      }

      const payload = {
        user_id: Number(targetUserId) || targetUserId,
        leave_type: finalLeaveType,
        start_date: startDate,
        end_date: endDate,
        total_days: durationDays,
        reason: fullReason,
        status: 'pending',
        approval_status: 'pending',
        current_approval_level: 1
      };

      const { data, error } = await supabase.from('leave_requests').insert(payload).select().single();
      if (error) throw error;

      showToast('Permohonan cuti berhasil diajukan dan masuk ke antrean persetujuan!', 'success');

      trackActivity({
        userId: currentUser?.id,
        userName: currentUser?.fullName || currentUser?.name || 'Karyawan',
        userRole: currentUser?.role || 'Employee',
        userEmail: currentUser?.email,
        module: 'Cuti & Izin',
        action: 'SUBMIT_LEAVE_REQUEST',
        details: `Mengajukan permohonan cuti (${finalLeaveType}, ${durationDays} hari kerja: ${startDate} s/d ${endDate})`,
        metadata: payload
      }).catch(console.error);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit leave error:', err);
      showToast('Gagal mengajukan cuti: ' + (err.message || 'Kesalahan sistem'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden font-sans border border-border bg-card text-card-foreground shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Calendar size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Formulir Pengajuan Cuti &amp; Izin
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Pengajuan terintegrasi dengan Kuota Resmi &amp; Ketentuan Pasal 22
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1 text-xs">
          {/* Target employee if Admin/HR */}
          {isAdminOrHR && allUsers.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Ajukan Untuk Karyawan</Label>
              <select
                value={targetUserId}
                onChange={e => setTargetUserId(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.department || 'Staff'}) {String(u.id) === String(currentUser?.id) ? '- Diri Sendiri' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Leave Quota Indicator Card */}
          {myQuota && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Sisa Kuota Cuti Tahunan:</span>
                <span className="text-base font-bold text-primary">
                  {myQuota.remainingBalance} Hari Kerja
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Status: <strong>{myQuota.contractType}</strong> &bull; Hak Dasar: {myQuota.baseQuota} hari
                </span>
              </div>
              <div className="text-right text-[11px] space-y-0.5">
                <span className="text-muted-foreground block">Cuti Terpakai: <strong className="text-rose-500">{myQuota.leaveTakenDays} hr</strong></span>
                {myQuota.carryForwardQuota > 0 && !myQuota.carryForwardExpired && (
                  <span className="text-emerald-600 dark:text-emerald-400 block font-semibold">Carry Forward: +{myQuota.carryForwardQuota} hr (s.d 30 Jun)</span>
                )}
                {myQuota.totalAdjustmentDays !== 0 && (
                  <span className="text-primary block font-medium">Penyesuaian HR: {myQuota.totalAdjustmentDays > 0 ? `+${myQuota.totalAdjustmentDays}` : myQuota.totalAdjustmentDays} hr</span>
                )}
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Kategori Cuti / Izin</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLeaveCategory('annual')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'annual'
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">🏖️</span>
                <span className="font-semibold block text-[11px]">Cuti Tahunan</span>
                <span className="text-[10px] text-muted-foreground font-normal">Memotong Kuota</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('pasal_22')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'pasal_22'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">📜</span>
                <span className="font-semibold block text-[11px]">Izin Khusus (Pasal 22)</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">Tetap Dapat Upah</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('sick')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'sick'
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">🤒</span>
                <span className="font-semibold block text-[11px]">Sakit</span>
                <span className="text-[10px] text-muted-foreground font-normal">Surat Dokter</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('personal')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'personal'
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">📋</span>
                <span className="font-semibold block text-[11px]">Izin Pribadi</span>
                <span className="text-[10px] text-muted-foreground font-normal">Memotong Kuota</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('maternity')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'maternity'
                    ? 'border-pink-500/50 bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-2 ring-pink-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">👶</span>
                <span className="font-semibold block text-[11px]">Cuti Melahirkan</span>
                <span className="text-[10px] text-muted-foreground font-normal">3 Bulan Kalender</span>
              </button>

              <button
                type="button"
                onClick={() => setLeaveCategory('unpaid')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  leaveCategory === 'unpaid'
                    ? 'border-zinc-500/50 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 ring-2 ring-zinc-500/20 font-bold'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                }`}
              >
                <span className="block text-sm mb-0.5">💰</span>
                <span className="font-semibold block text-[11px]">Cuti Tanpa Gaji</span>
                <span className="text-[10px] text-muted-foreground font-normal">Potong Upah</span>
              </button>
            </div>
          </div>

          {/* Sub-options for Pasal 22 */}
          {leaveCategory === 'pasal_22' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                <ShieldCheck size={15} />
                <span>Ketentuan Pasal 22 - Izin Meninggalkan Pekerjaan dengan Upah</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-foreground">Pilih Alasan Izin Khusus Resmi:</Label>
                <select
                  value={article22Id}
                  onChange={e => setArticle22Id(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-emerald-500"
                >
                  {ARTICLE_22_LEAVE_TYPES.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.label} — Maksimal {art.maxDays} Hari Kerja ({art.articleClause})
                    </option>
                  ))}
                </select>
              </div>

              {selectedArticle22 && (
                <div className="text-[11px] text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/50 space-y-1">
                  <p className="font-semibold text-foreground">
                    ✓ {selectedArticle22.label} (Maks {selectedArticle22.maxDays} Hari Kerja)
                  </p>
                  <p>{selectedArticle22.description}</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                    &bull; Sesuai Pasal 22, izin ini <strong>TIDAK MEMOTONG kuota cuti tahunan</strong> karyawan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Date Range Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Tanggal Mulai Cuti</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Tanggal Selesai Cuti</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Calculated Duration & Warning */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
            <span className="text-muted-foreground">Total Durasi Hari Kerja:</span>
            <span className="font-bold text-foreground">{durationDays} Hari Kerja (Exclude Libur/Sabtu/Minggu)</span>
          </div>

          {/* Over Quota Warning */}
          {isOverQuota && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Peringatan: Kuota Cuti Tidak Mencukupi</span>
                <span>Durasi permohonan ({durationDays} hari) melebihi sisa kuota cuti tahunan Anda ({remainingBalance} hari). Silakan kurangi periode atau hubungi Tim HR.</span>
              </div>
            </div>
          )}

          {/* Reason Field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Alasan &amp; Keterangan Cuti <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Contoh: Mengurus keperluan keluarga, acara pernikahan, istirahat sakit, dll."
              className="text-xs resize-none h-20"
              required
            />
          </div>

          {/* Notice Article 22 clause 3 */}
          <p className="text-[11px] text-muted-foreground italic">
            * Berdasarkan Pasal 22 Ayat 3: Alasan-alasan lain di luar ketentuan izin khusus ayat 1 akan memotong Hak Cuti Tahunan karyawan.
          </p>

          {/* Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs font-semibold h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || isOverQuota}
              className="text-xs font-semibold h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Send size={14} />
              <span>{submitting ? 'Mengirimkan...' : 'Kirim Pengajuan Cuti'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
