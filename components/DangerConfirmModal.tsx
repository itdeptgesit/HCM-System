'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle, LogOut, ShieldAlert } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export interface DangerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  isLoading?: boolean;
  entityName?: string; // for confirmation typing
  confirmText?: string;
  cancelText?: string;
  /**
   * Variant determines visual theme.
   * 'danger' (default) – soft red badge with destructive confirm button.
   * 'logout' – blue theme confirm button.
   */
  variant?: 'danger' | 'logout' | 'warning';
}

export const DangerConfirmModal: React.FC<DangerConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading,
  entityName,
  confirmText,
  cancelText = 'Batal',
  variant = 'danger',
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (entityName ? inputValue.trim() !== entityName.trim() : false);
  const buttonText = confirmText || (variant === 'logout' ? 'Keluar' : 'Hapus Permanen');

  const isLogout = variant === 'logout';
  const isDanger = variant === 'danger';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isLoading && onClose()}>
      <DialogContent className="sm:max-w-[460px] p-6 bg-card text-card-foreground rounded-2xl border border-border/80 shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center sm:items-start sm:text-left space-y-3 pb-1">
          {/* Nexora Style Icon Badge */}
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
              isLogout
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            }`}
          >
            {isLogout ? (
              <LogOut className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>

          <DialogTitle className="text-lg font-bold text-foreground tracking-tight">
            {title}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed font-normal">
            {message}
          </DialogDescription>
        </DialogHeader>

        {/* Optional Confirmation Typing for Critical Deletions */}
        {entityName && (
          <div className="space-y-2 my-2 rounded-xl bg-muted/40 p-3.5 border border-border/60">
            <label className="text-[11px] font-semibold text-muted-foreground block">
              Ketik <span className="font-bold text-foreground font-mono select-all bg-background px-1.5 py-0.5 rounded border border-border">{entityName}</span> untuk mengonfirmasi:
            </label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Ketik "${entityName}"`}
              className="h-9 text-xs bg-background border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-rose-500 focus-visible:border-rose-500 font-medium"
              autoFocus
              disabled={isLoading}
            />
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInputValue('');
              onClose();
            }}
            disabled={isLoading}
            className="text-xs font-semibold h-9 px-4 rounded-xl border-border/80 text-muted-foreground hover:text-foreground"
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`text-xs font-semibold h-9 px-4.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
              isLogout
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            <span>{buttonText}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DangerConfirmModal;
