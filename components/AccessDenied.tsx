'use client';

import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, LifeBuoy, Copy, Check, Lock, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from './UserAvatar';
import { toast } from 'sonner';
import { UserAccount } from '../types';

interface AccessDeniedProps {
  moduleName?: string;
  description?: string;
  requiredAccess?: string;
  currentUser: UserAccount | null;
  onBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  moduleName = 'Halaman Ini',
  description = 'Anda tidak memiliki hak akses untuk membuka halaman ini.',
  requiredAccess = 'Administrator atau Human Resources (HR)',
  currentUser,
  onBack
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const userRole = currentUser?.role || 'User';
  const userGroups = currentUser?.groups || [];
  const userName = currentUser?.fullName || 'Pengguna';
  const userEmail = currentUser?.email || '-';

  const referenceCode = `SEC-403-${(moduleName || 'MOD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

  const handleCopyDetails = () => {
    const details = [
      `[Gesit People - Laporan Izin Akses]`,
      `Referensi: ${referenceCode}`,
      `Modul: ${moduleName}`,
      `Akun: ${userName} (${userEmail})`,
      `Role: ${userRole}`,
      `Grup: ${userGroups.join(', ') || 'None'}`,
      `Akses Diperlukan: ${requiredAccess}`
    ].join('\n');

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true);
      toast.success('Rincian akses disalin ke clipboard untuk tiket Helpdesk');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      toast.error('Gagal menyalin rincian akses');
    });
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        {/* Header section with refined security emblem */}
        <div className="p-6 sm:p-8 pb-5 border-b border-border/60">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  Akses Tidak Diizinkan
                </h2>
                <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 dark:bg-muted/30 px-2 py-0.5 rounded border border-border/50 shrink-0">
                  HTTP 403
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Akses ke modul <span className="font-medium text-foreground">{moduleName}</span> dibatasi berdasarkan kebijakan wewenang peran (role-based access control). {description}
              </p>
            </div>
          </div>
        </div>

        {/* Credentials & Access Specification Table */}
        <div className="p-6 sm:p-8 py-5 space-y-4">
          <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Informasi Sesi & Wewenang
          </div>

          <div className="rounded-lg border border-border/80 bg-muted/20 divide-y divide-border/60 text-xs">
            {/* User Account */}
            <div className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Identitas Pengguna</span>
              <div className="flex items-center gap-2 min-w-0 text-right">
                <UserAvatar name={userName} url={currentUser?.avatarUrl} size="xs" />
                <div className="truncate">
                  <span className="font-medium text-foreground">{userName}</span>
                  <span className="text-muted-foreground ml-1 hidden sm:inline">({userEmail})</span>
                </div>
              </div>
            </div>

            {/* Current Role */}
            <div className="p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Role Saat Ini</span>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="font-medium text-xs rounded-md">
                  {userRole}
                </Badge>
              </div>
            </div>

            {/* Required Entitlement */}
            <div className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3">
              <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                Hak Diperlukan
              </span>
              <span className="font-medium text-foreground text-right">
                {requiredAccess}
              </span>
            </div>

            {/* Registered Groups */}
            <div className="p-3 sm:px-4 sm:py-3 flex items-start justify-between gap-3">
              <span className="text-muted-foreground shrink-0">Grup Akses</span>
              <div className="flex flex-wrap justify-end gap-1 text-right">
                {userGroups.length > 0 ? (
                  userGroups.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded bg-background border border-border text-[11px] text-muted-foreground font-mono"
                    >
                      {g}
                    </span>
                  ))
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Tidak ada grup terdaftar</span>
                )}
              </div>
            </div>
          </div>

          {/* Helpdesk & Support Resolution Box */}
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3.5 sm:p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">Prosedur Permohonan Akses</span>
              <span className="text-[11px] font-mono text-muted-foreground">{referenceCode}</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Bila tugas operasional Anda memerlukan modul ini, ajukan permohonan melalui Gesit Helpdesk dengan mencantumkan persetujuan atasan langsung.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleCopyDetails}
                className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 -mx-1 py-0.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Rincian berhasil disalin' : 'Salin rincian akses untuk tiket Helpdesk'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-8 pt-0 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="w-full sm:w-auto text-xs font-medium gap-1.5 h-9"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Beranda
          </Button>

          <Button
            onClick={() => navigate('/helpdesk')}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 h-9 bg-brand-navy hover:bg-brand-navy/90 text-white dark:bg-primary dark:text-primary-foreground"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            Ajukan Tiket Helpdesk
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
