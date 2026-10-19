'use client';

import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Check, Loader2, ShieldAlert } from '@/components/ui/icons';
import { UserAccount } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion, AnimatePresence } from 'framer-motion';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSave: (user: UserAccount, newPassword: string) => Promise<boolean>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Confirm passcode does not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Passcode must be at least 6 characters');
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const ok = await onSave(user, newPassword);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 1800);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden font-sans border border-border/80 bg-card text-card-foreground shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-5 relative overflow-hidden border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl border border-amber-500/20 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">Reset Passcode Karyawan</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Atur ulang kata sandi akses akun pengguna secara langsung
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-muted-foreground hover:text-foreground -mr-2 -mt-1"><X size={16} /></Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-sm">
                  <Check size={28} strokeWidth={2.5} />
                </div>
                <h3 className="text-base font-bold text-foreground">Passcode Berhasil Diperbarui</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Kata sandi baru untuk <span className="font-semibold text-foreground">{user?.email}</span> telah aktif dan siap digunakan login.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-muted/40 border border-border/60 p-3.5 rounded-xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shrink-0">
                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">{user?.fullName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email} {user?.employeeCode ? `• ${user?.employeeCode}` : ''}</p>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 p-3 rounded-xl text-xs font-medium text-destructive flex items-center gap-2.5"
                  >
                    <ShieldAlert size={15} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Passcode Baru</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-10 h-10 text-xs rounded-xl border-border/80"
                        placeholder="Minimal 6 karakter..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Konfirmasi Passcode Baru</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang passcode baru..."
                      className="h-10 text-xs rounded-xl border-border/80"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="text-xs font-semibold h-9 px-4 rounded-xl border-border/80"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || !newPassword || !confirmPassword}
                    className="text-xs font-semibold h-9 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="mr-2 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Passcode'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};