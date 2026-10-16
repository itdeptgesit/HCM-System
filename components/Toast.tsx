'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from '@/components/ui/icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  title,
  duration = 4000,
  onClose
}) => {
  const configs = {
    success: {
      defaultTitle: 'Berhasil',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20',
      accentBar: 'bg-emerald-500',
      progressBg: 'bg-emerald-500/50 dark:bg-emerald-400/50'
    },
    error: {
      defaultTitle: 'Gagal Diproses',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      iconBg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20',
      accentBar: 'bg-rose-500',
      progressBg: 'bg-rose-500/50 dark:bg-rose-400/50'
    },
    warning: {
      defaultTitle: 'Perhatian',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20',
      accentBar: 'bg-amber-500',
      progressBg: 'bg-amber-500/50 dark:bg-amber-400/50'
    },
    info: {
      defaultTitle: 'Informasi',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
      iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20',
      accentBar: 'bg-blue-500',
      progressBg: 'bg-blue-500/50 dark:bg-blue-400/50'
    }
  };

  const config = configs[type] || configs.info;
  const displayTitle = title || config.defaultTitle;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, y: -10, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className="pointer-events-auto relative group flex items-start gap-3.5 w-full sm:w-[380px] max-w-[420px] p-4 bg-background/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl border border-border/80 dark:border-zinc-800 shadow-xl shadow-black/5 dark:shadow-black/40 overflow-hidden"
    >
      {/* Accent Indicator Bar on the left */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.accentBar}`} />

      {/* Icon Badge */}
      <div className={`p-2 rounded-lg shrink-0 ${config.iconBg}`}>
        {config.icon}
      </div>

      {/* Text Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-semibold text-foreground tracking-tight leading-none mb-1">
          {displayTitle}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed break-words">
          {message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors"
        aria-label="Tutup notifikasi"
      >
        <X size={14} />
      </button>

      {/* Auto-Dismiss Progress Bar */}
      {duration > 0 && (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-[2px] ${config.progressBg}`}
        />
      )}
    </motion.div>
  );
};
