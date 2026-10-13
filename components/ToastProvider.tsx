'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from './ui/sonner';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = useCallback((message: string, type: ToastType = 'success', title?: string, duration: number = 4000) => {
    const defaultTitles: Record<ToastType, string> = {
      success: 'Berhasil',
      error: 'Terjadi Kesalahan',
      warning: 'Perhatian',
      info: 'Informasi',
    };

    const toastTitle = title || defaultTitles[type] || 'Notifikasi';
    const toastOptions = {
      description: message,
      duration: duration || 4000,
    };

    switch (type) {
      case 'success':
        toast.success(toastTitle, toastOptions);
        break;
      case 'error':
        toast.error(toastTitle, { ...toastOptions, duration: duration || 5000 });
        break;
      case 'warning':
        toast.warning(toastTitle, toastOptions);
        break;
      case 'info':
      default:
        toast.info(toastTitle, toastOptions);
        break;
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster position="top-right" closeButton />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
