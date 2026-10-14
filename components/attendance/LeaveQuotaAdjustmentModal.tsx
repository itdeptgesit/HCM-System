'use client';

import React, { useState } from 'react';
import {
  Calendar, Award, Plus, Minus, Check, Clock, User, Building,
  AlertCircle, ShieldCheck, History, X, Save, Sparkles, HelpCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '../ToastProvider';
import { LeaveQuotaSummary, saveLeaveAdjustment } from '../../lib/leaveQuotaService';
import { formatDateDDMMYYYY } from '../../lib/utils';

interface LeaveQuotaAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quota: LeaveQuotaSummary | null;
  currentUser: any;
  onSuccess: () => void;
}

export const LeaveQuotaAdjustmentModal: React.FC<LeaveQuotaAdjustmentModalProps> = ({
  isOpen,
  onClose,
  quota,
  currentUser,
  onSuccess
}) => {
  const { showToast } = useToast();
  const [adjustmentDays, setAdjustmentDays] = useState<number>(1);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add');
  const [reason, setReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  if (!quota) return null;

  const currentYear = quota.year || new Date().getFullYear();
  const finalDays = adjustmentType === 'add' ? Math.abs(adjustmentDays) : -Math.abs(adjustmentDays);
  const projectedBalance = Math.max(0, quota.remainingBalance + finalDays);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Harap masukkan alasan atau catatan penyesuaian kuota cuti.', 'error');
      return;
    }
    if (adjustmentDays === 0) {
      showToast('Jumlah hari penyesuaian tidak boleh 0.', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveLeaveAdjustment({
        userId: quota.userId,
        userName: quota.fullName,
        year: currentYear,
        adjustmentDays: finalDays,
        reason: reason.trim(),
        adminName: currentUser?.fullName || currentUser?.name || 'Tim HR',
        adminEmail: currentUser?.email || '',
        adminRole: currentUser?.role || 'HR Admin'
      });

      showToast(`Berhasil menyesuaikan kuota cuti ${quota.fullName} sebesar ${finalDays > 0 ? `+${finalDays}` : finalDays} hari!`, 'success');
      setReason('');
      setAdjustmentDays(1);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adjusting leave quota:', err);
      showToast('Gagal menyimpan penyesuaian kuota: ' + (err.message || 'Kesalahan sistem'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border bg-card text-card-foreground shadow-2xl rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Award size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Penyesuaian Kuota Cuti Karyawan
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Tahun Anggaran Cuti: <strong>{currentYear}</strong> &bull; Kebijakan Resmi SDM
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          {/* Employee Summary Card */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-foreground block">{quota.fullName}</span>
                <span className="text-[11px] text-muted-foreground">
                  NIP: {quota.employeeCode || '-'} &bull; Divisi: {quota.department || '-'}
                </span>
              </div>
              <Badge className={
                quota.contractType === 'PKWTT'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold'
              }>
                {quota.contractType}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
              <div className="bg-background rounded-lg p-2 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Hak Cuti Pokok</span>
                <span className="font-bold text-xs text-foreground">{quota.baseQuota} hari</span>
              </div>
              <div className="bg-background rounded-lg p-2 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Cuti Terpakai</span>
                <span className="font-bold text-xs text-rose-500">{quota.leaveTakenDays} hari</span>
              </div>
              <div className="bg-background rounded-lg p-2 border border-border/40">
                <span className="text-[10px] text-muted-foreground block font-medium">Saldo Aktif Saat Ini</span>
                <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{quota.remainingBalance} hari</span>
              </div>
            </div>

            {quota.joinDate && (
              <p className="text-[11px] text-muted-foreground italic">
                * Tanggal Masuk: {formatDateDDMMYYYY(quota.joinDate)} (Masa kerja: {quota.tenureYears} tahun / {quota.tenureMonths} bulan).
              </p>
            )}
          </div>

          {/* Action Choice: Add or Deduct */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Jenis Penyesuaian</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  adjustmentType === 'add'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Plus size={14} />
                <span>Tambah Hari Cuti (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustmentType('deduct')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  adjustmentType === 'deduct'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-2 ring-rose-500/20'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Minus size={14} />
                <span>Kurangi Hari Cuti (-)</span>
              </button>
            </div>
          </div>

          {/* Number of Days */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Jumlah Hari</Label>
            <div className="relative">
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={adjustmentDays}
                onChange={e => setAdjustmentDays(Math.max(0.5, parseFloat(e.target.value) || 0))}
                className="font-bold text-sm h-10 pr-14"
                placeholder="1"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                Hari
              </span>
            </div>
          </div>

          {/* Projected Result Callout */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Proyeksi Saldo Baru Karyawan:</span>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground line-through">{quota.remainingBalance} hari</span>
              <span className="text-primary font-bold text-sm">&rarr; {projectedBalance} hari</span>
            </div>
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Alasan / Keterangan Penyesuaian <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Contoh: Kompensasi lembur event weekend, bonus reward performa, koreksi sisa cuti, dsb."
              className="text-xs resize-none h-20"
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Alasan ini akan tercatat permanen di jejak audit (audit log) sistem HCM.
            </p>
          </div>

          {/* History of Previous Adjustments */}
          {quota.adjustments && quota.adjustments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <History size={13} className="text-primary" /> Riwayat Penyesuaian Tahun {currentYear}
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {quota.adjustments.map((hist, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] flex items-start justify-between gap-2">
                    <div>
                      <span className="font-semibold text-foreground">{hist.reason}</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Oleh: {hist.adjustedBy} &bull; {new Date(hist.adjustedAt).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <Badge variant="outline" className={`font-mono text-[10px] font-bold shrink-0 ${
                      hist.adjustmentDays > 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'
                    }`}>
                      {hist.adjustmentDays > 0 ? `+${hist.adjustmentDays}` : hist.adjustmentDays} hari
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="text-xs font-semibold h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              className="text-xs font-semibold h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Save size={14} />
              <span>{saving ? 'Menyimpan...' : 'Terapkan Penyesuaian'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
