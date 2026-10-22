'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Check, X, AlertCircle, Info, RefreshCw, Plus, Trash2,
  SlidersHorizontal, CheckCircle2, ShieldCheck, Calendar
} from '@/components/ui/icons';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  CollectiveLeaveItemState,
  getCompanyCollectiveLeavePolicy,
  saveCompanyCollectiveLeavePolicy
} from '../../lib/leaveQuotaService';
import { toast } from 'sonner';

interface CollectiveLeaveConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  onSuccess?: (totalDeductDays: number) => void;
  adminName?: string;
}

export const CollectiveLeaveConfigModal: React.FC<CollectiveLeaveConfigModalProps> = ({
  open,
  onOpenChange,
  year,
  onSuccess,
  adminName = 'Tim HR'
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [items, setItems] = useState<CollectiveLeaveItemState[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // New custom holiday state
  const [showAddCustom, setShowAddCustom] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [customDeduct, setCustomDeduct] = useState<boolean>(true);

  // Load data whenever modal opens or year changes
  const loadPolicy = async (y: number) => {
    setLoading(true);
    try {
      const res = await getCompanyCollectiveLeavePolicy(y);
      setItems(res.items);
    } catch (err) {
      toast.error('Gagal memuat pengaturan cuti bersama.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedYear(year);
      loadPolicy(year);
    }
  }, [open, year]);

  const handleYearChange = (newYear: number) => {
    setSelectedYear(newYear);
    loadPolicy(newYear);
  };

  // Toggle active status for an item
  const handleToggleActive = (index: number) => {
    setItems(prev => {
      const updated = [...prev];
      const cur = updated[index];
      const nextActive = !cur.isActive;
      updated[index] = {
        ...cur,
        isActive: nextActive,
        // Jika tidak aktif, otomatis tidak memotong cuti
        deductAnnualLeave: nextActive ? cur.deductAnnualLeave : false
      };
      return updated;
    });
  };

  // Toggle deduct annual leave for an item
  const handleToggleDeduct = (index: number) => {
    setItems(prev => {
      const updated = [...prev];
      const cur = updated[index];
      if (!cur.isActive) return prev; // Cannot deduct if not active
      updated[index] = {
        ...cur,
        deductAnnualLeave: !cur.deductAnnualLeave
      };
      return updated;
    });
  };

  // Add custom collective leave
  const handleAddCustomItem = () => {
    if (!customDate || !customName.trim()) {
      toast.error('Mohon isi tanggal dan nama cuti bersama.');
      return;
    }
    if (!customDate.startsWith(String(selectedYear))) {
      toast.error(`Tanggal harus berada di tahun ${selectedYear}.`);
      return;
    }
    if (items.some(i => i.date === customDate)) {
      toast.error('Tanggal cuti bersama ini sudah ada di daftar.');
      return;
    }

    const newItem: CollectiveLeaveItemState = {
      date: customDate,
      name: customName.trim(),
      isActive: true,
      deductAnnualLeave: customDeduct,
      isCustom: true
    };

    setItems(prev => [...prev, newItem].sort((a, b) => a.date.localeCompare(b.date)));
    setCustomDate('');
    setCustomName('');
    setCustomDeduct(true);
    setShowAddCustom(false);
    toast.success('Cuti bersama khusus ditambahkan ke daftar.');
  };

  // Remove a custom item
  const handleRemoveCustomItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculations
  const stats = useMemo(() => {
    const totalDays = items.length;
    const activeDays = items.filter(i => i.isActive).length;
    const deductDays = items.filter(i => i.isActive && i.deductAnnualLeave).length;
    return { totalDays, activeDays, deductDays };
  }, [items]);

  // Save handler
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await saveCompanyCollectiveLeavePolicy({
        year: selectedYear,
        items,
        adminName
      });

      if (!res.success) {
        throw new Error(res.error || 'Gagal menyimpan');
      }

      toast.success(
        `Pengaturan cuti bersama tahun ${selectedYear} berhasil disimpan! Potongan kuota cuti bersama: ${res.totalDeductDays} hari.`
      );
      if (onSuccess) {
        onSuccess(res.totalDeductDays);
      }
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Gagal menyimpan kebijakan: ${err.message || 'Terjadi kesalahan'}`);
    } finally {
      setSaving(false);
    }
  };

  // Format date helper (e.g. "Senin, 23 Mar 2026")
  const formatDateLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Kebijakan Cuti Bersama Perusahaan
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Atur apakah cuti bersama berlaku di PT Gesit dan apakah memotong kuota tahunan karyawan.
                </DialogDescription>
              </div>
            </div>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              disabled={loading || saving}
              className="h-8.5 rounded-lg border border-border bg-background px-3 text-xs font-bold text-foreground outline-none focus:border-primary cursor-pointer"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>Tahun {y}</option>
              ))}
            </select>
          </div>
        </DialogHeader>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <Card className="border-border/60 bg-muted/30 shadow-none">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground block">Terdaftar di Kalender</span>
                <span className="text-lg font-bold text-foreground mt-0.5 block">{stats.totalDays} Hari</span>
                <span className="text-[10px] text-muted-foreground">SKB + Khusus</span>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-muted/30 shadow-none">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-semibold text-muted-foreground block">Libur Perusahaan (Aktif)</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{stats.activeDays} Hari</span>
                <span className="text-[10px] text-muted-foreground">Karyawan libur</span>
              </CardContent>
            </Card>

            <Card className="border-amber-500/30 bg-amber-500/5 shadow-none">
              <CardContent className="p-3 text-center">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block">Memotong Kuota Cuti</span>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">-{stats.deductDays} Hari</span>
                <span className="text-[10px] text-muted-foreground">Dipotong dari 12 hari</span>
              </CardContent>
            </Card>
          </div>

          {/* Legal / Policy Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 text-xs leading-relaxed">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Ketentuan Cuti Bersama Sektor Swasta (SE Menaker):</strong> Cuti bersama bagi perusahaan swasta bersifat <em>fakultatif</em> (pilihan). Manajemen HR berwenang menentukan apakah cuti bersama berlaku libur dan apakah memotong hak cuti tahunan karyawan.
            </div>
          </div>

          {/* List of Collective Leaves */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-foreground">Daftar Cuti Bersama Tahun {selectedYear}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddCustom(!showAddCustom)}
                className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Tambah Cuti Khusus</span>
              </Button>
            </div>

            {/* Add Custom Inline Form */}
            {showAddCustom && (
              <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3 mb-2">
                <span className="text-xs font-bold text-primary block">Tambah Hari Cuti Bersama Tambahan Perusahaan</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Tanggal</label>
                    <Input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">Nama Hari Libur</label>
                    <Input
                      placeholder="Contoh: Cuti Bersama Ulang Tahun PT Gesit"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <Checkbox
                      checked={customDeduct}
                      onCheckedChange={(c) => setCustomDeduct(!!c)}
                    />
                    <span>Memotong kuota cuti tahunan karyawan</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddCustom(false)}
                      className="h-7 text-xs"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCustomItem}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Tambahkan</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                <span>Memuat daftar cuti bersama...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                Tidak ada data cuti bersama untuk tahun {selectedYear}.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.date}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border transition-all gap-3 ${
                      item.isActive
                        ? item.deductAnnualLeave
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : 'border-border/70 bg-card'
                        : 'border-border/40 bg-muted/20 opacity-60'
                    }`}
                  >
                    {/* Left: Date & Name */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] font-bold bg-background text-foreground"
                        >
                          {formatDateLabel(item.date)}
                        </Badge>
                        {item.isCustom && (
                          <Badge className="bg-primary/10 text-primary text-[10px] font-semibold border-primary/20">
                            Khusus Kantor
                          </Badge>
                        )}
                        {!item.isActive && (
                          <Badge variant="secondary" className="text-[10px]">
                            Tidak Libur
                          </Badge>
                        )}
                        {item.isActive && item.deductAnnualLeave && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                            Potong Cuti (-1 hr)
                          </Badge>
                        )}
                        {item.isActive && !item.deductAnnualLeave && (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                            Libur Gratis (Tidak Potong)
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-foreground block truncate">
                        {item.name}
                      </span>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {/* Active toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <span className="text-[11px] font-medium text-muted-foreground">Libur:</span>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggleActive(idx)}
                        />
                      </label>

                      {/* Deduct checkbox */}
                      <label
                        className={`flex items-center gap-1.5 text-[11px] font-medium cursor-pointer ${
                          !item.isActive ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <Checkbox
                          checked={item.deductAnnualLeave}
                          disabled={!item.isActive}
                          onCheckedChange={() => handleToggleDeduct(idx)}
                        />
                        <span className={item.deductAnnualLeave ? 'font-bold text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
                          Potong Cuti
                        </span>
                      </label>

                      {/* Remove custom */}
                      {item.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                          title="Hapus cuti khusus ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex-row items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            Total Potongan: <strong className="text-amber-600 dark:text-amber-400 font-bold">{stats.deductDays} hari</strong> dari jatah cuti 12 hari
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onOpenChange(false)}
              className="h-8.5 text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || loading}
              onClick={handleSave}
              className="h-8.5 gap-1.5 bg-primary text-primary-foreground text-xs font-semibold shadow-xs"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Menerapkan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Terapkan ke Seluruh Karyawan</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
