'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface DangerConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  isLoading?: boolean;
  entityName?: string; // for confirmation typing
  confirmText?: string;
  /**
   * Variant determines visual theme.
   * 'danger' (default) – clean ShadCN Alert Dialog styling with dark button.
   * 'logout' – blue theme confirm button.
   */
  variant?: 'danger' | 'logout';
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
  variant = 'danger',
}) => {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (entityName ? inputValue !== entityName : false);
  const buttonText = confirmText || (variant === 'logout' ? 'Log out' : 'Delete');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
      <DialogContent showCloseButton={false} className="sm:max-w-[480px] p-6 bg-card text-card-foreground rounded-2xl border border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col space-y-2 text-left">
          <h2 className="text-lg font-semibold text-foreground leading-tight">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground leading-normal font-normal">
            {message}
          </p>
        </div>

        {entityName && (
          <div className="space-y-2 my-4">
            <div className="text-xs font-medium text-muted-foreground">
              Please type <span className="font-bold text-foreground">{entityName}</span> to confirm.
            </div>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={entityName}
              className="h-9 border-border rounded-lg bg-background text-foreground text-sm focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              autoFocus
            />
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0 mt-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setInputValue('');
              onClose();
            }}
            disabled={isLoading}
            className="text-xs font-semibold h-9 px-4 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`text-xs font-semibold h-9 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              variant === 'logout'
                ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
            }`}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
