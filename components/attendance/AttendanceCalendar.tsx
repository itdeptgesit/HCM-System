import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Calendar, Plus, Search, Filter, RefreshCw, Trash2, Edit3,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download, Eye, ExternalLink,
  Loader2, Info, Building2, Sun, Moon, ArrowUpDown, List, Grid, Shield,
  Clock, Sunrise, AlertTriangle, Check, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '../StatCard';
import { MONTH_NAMES, DAY_NAMES } from './attendanceTypes';

// Official SKB 3 Menteri No 1205/2026, No 3/2026, No 2/2026 tentang Hari Libur Nasional & Cuti Bersama Tahun 2027
const SKB_2027_OFFICIAL: Array<{ holiday_date: string; name: string; holiday_type: 'national' | 'collective_leave' }> = [
  // A. HARI LIBUR NASIONAL TAHUN 2027 (18 Hari Kalender)
  { holiday_date: '2027-01-01', name: 'Tahun Baru 2027 Masehi', holiday_type: 'national' },
  { holiday_date: '2027-01-05', name: 'Isra Mikraj Nabi Muhammad S.A.W. 1448 Hijriah', holiday_type: 'national' },
  { holiday_date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili', holiday_type: 'national' },
  { holiday_date: '2027-03-08', name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', holiday_type: 'national' },
  { holiday_date: '2027-03-10', name: 'Idul Fitri 1448 Hijriah', holiday_type: 'national' },
  { holiday_date: '2027-03-11', name: 'Idul Fitri 1448 Hijriah (Hari Kedua)', holiday_type: 'national' },
  { holiday_date: '2027-03-26', name: 'Wafat Yesus Kristus', holiday_type: 'national' },
  { holiday_date: '2027-03-28', name: 'Kebangkitan Yesus Kristus (Paskah)', holiday_type: 'national' },
  { holiday_date: '2027-05-01', name: 'Hari Buruh Internasional', holiday_type: 'national' },
  { holiday_date: '2027-05-06', name: 'Kenaikan Yesus Kristus', holiday_type: 'national' },
  { holiday_date: '2027-05-17', name: 'Idul Adha 1448 Hijriah', holiday_type: 'national' },
  { holiday_date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE', holiday_type: 'national' },
  { holiday_date: '2027-06-01', name: 'Hari Lahir Pancasila', holiday_type: 'national' },
  { holiday_date: '2027-06-06', name: '1 Muharam Tahun Baru Islam 1449 Hijriah', holiday_type: 'national' },
  { holiday_date: '2027-08-15', name: 'Maulid Nabi Muhammad S.A.W.', holiday_type: 'national' },
  { holiday_date: '2027-08-17', name: 'Proklamasi Kemerdekaan', holiday_type: 'national' },
  { holiday_date: '2027-12-25', name: 'Kelahiran Yesus Kristus', holiday_type: 'national' },
  { holiday_date: '2027-12-26', name: 'Isra Mikraj Nabi Muhammad S.A.W. 1449 Hijriah', holiday_type: 'national' },

  // B. CUTI BERSAMA TAHUN 2027 (8 Hari)
  { holiday_date: '2027-02-05', name: 'Cuti Bersama Tahun Baru Imlek 2578 Kongzili', holiday_type: 'collective_leave' },
  { holiday_date: '2027-03-09', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
  { holiday_date: '2027-03-12', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
  { holiday_date: '2027-03-15', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
  { holiday_date: '2027-03-25', name: 'Cuti Bersama Wafat Yesus Kristus', holiday_type: 'collective_leave' },
  { holiday_date: '2027-05-18', name: 'Cuti Bersama Idul Adha 1448 Hijriah', holiday_type: 'collective_leave' },
  { holiday_date: '2027-05-19', name: 'Cuti Bersama Hari Raya Waisak 2571 BE', holiday_type: 'collective_leave' },
  { holiday_date: '2027-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus', holiday_type: 'collective_leave' },
];

const CompanyCalendarManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [rows, setRows] = useState<any[]>([]);
  const [officialRows, setOfficialRows] = useState<any[]>([]);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('collective_leave');
  const [deduct, setDeduct] = useState(true);
  const [editingHoliday, setEditingHoliday] = useState<any | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  // Table filter states
  const [searchTableQuery, setSearchTableQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'national' | 'collective_leave' | 'company' | 'working_day'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('company_holidays').select('*').order('holiday_date');
      setRows(data || []);
      const year = selectedYear;

      if (year === 2027) {
        // Ambil langsung dari Keputusan Bersama Menteri Agama, Menaker, MenPAN-RB No 1205/2026, No 3/2026, No 2/2026
        const rows2027 = SKB_2027_OFFICIAL.map(item => ({
          holiday_date: item.holiday_date,
          name: item.name,
          holiday_type: item.holiday_type,
          source: 'skb_2027_decree',
          is_active: true,
          isOfficial: true,
        }));
        setOfficialRows(rows2027);
      } else {
        try {
          const response = await fetch(`https://tanggalmerah.upset.dev/api/holidays?year=${encodeURIComponent(year)}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000)
          });
          if (!response.ok) throw new Error(`holiday API ${response.status}`);
          const payload = await response.json();
          const sourceRows = Array.isArray(payload) ? payload : payload?.data || payload?.holidays || [];
          const normalized = sourceRows.map((row: any) => ({
            holiday_date: String(row.date || row.tanggal || row.holiday_date || '').slice(0, 10),
            name: row.name || row.nama || row.holiday || row.description || 'Hari Libur',
            holiday_type: /cuti bersama/i.test(String(row.name || row.nama || row.holiday || row.description || '')) || String(row.type || '').toLowerCase() === 'leave' ? 'collective_leave' : 'national',
            source: 'api',
            is_active: true,
          })).filter((row: any) => /^\d{4}-\d{2}-\d{2}$/.test(row.holiday_date) && row.holiday_date.startsWith(String(year)));
          if (!normalized.length) throw new Error('holiday API returned no valid rows');
          setOfficialRows(normalized);
        } catch (error) {
          console.warn('Official holiday API unavailable, using SKB fallback:', error);
          const skb: Record<number, any[]> = {
            2025: [
              ['01-01', 'Tahun Baru 2025 Masehi', 'national'],
              ['01-27', 'Isra Mikraj Nabi Muhammad SAW', 'national'],
              ['01-28', 'Cuti Bersama Tahun Baru Imlek', 'collective_leave'],
              ['01-29', 'Tahun Baru Imlek 2576 Kongzili', 'national'],
              ['03-28', 'Cuti Bersama Hari Suci Nyepi', 'collective_leave'],
              ['03-29', 'Hari Suci Nyepi', 'national'],
              ['03-31', 'Idulfitri 1446 Hijriah', 'national'],
              ['04-01', 'Idulfitri 1446 Hijriah', 'national'],
              ['04-02', 'Cuti Bersama Idulfitri', 'collective_leave'],
              ['04-03', 'Cuti Bersama Idulfitri', 'collective_leave'],
              ['04-04', 'Cuti Bersama Idulfitri', 'collective_leave'],
              ['04-07', 'Cuti Bersama Idulfitri', 'collective_leave'],
              ['04-18', 'Wafat Yesus Kristus', 'national'],
              ['04-20', 'Kebangkitan Yesus Kristus (Paskah)', 'national'],
              ['05-01', 'Hari Buruh Internasional', 'national'],
              ['05-12', 'Hari Raya Waisak 2569 BE', 'national'],
              ['05-13', 'Cuti Bersama Hari Raya Waisak', 'collective_leave'],
              ['05-29', 'Kenaikan Yesus Kristus', 'national'],
              ['05-30', 'Cuti Bersama Kenaikan Yesus Kristus', 'collective_leave'],
              ['06-01', 'Hari Lahir Pancasila', 'national'],
              ['06-06', 'Iduladha 1446 Hijriah', 'national'],
              ['06-09', 'Cuti Bersama Iduladha', 'collective_leave'],
              ['06-27', '1 Muharam 1447 Hijriah', 'national'],
              ['08-17', 'Proklamasi Kemerdekaan RI', 'national'],
              ['09-05', 'Maulid Nabi Muhammad SAW', 'national'],
              ['12-25', 'Kelahiran Yesus Kristus (Natal)', 'national'],
              ['12-26', 'Cuti Bersama Natal', 'collective_leave']
            ],
            2026: [
              ['01-01', 'Tahun Baru 2026', 'national'], ['01-16', 'Isra Mikraj Nabi Muhammad SAW', 'national'], ['02-16', 'Cuti Bersama Tahun Baru Imlek', 'collective_leave'], ['02-17', 'Tahun Baru Imlek 2577', 'national'], ['03-18', 'Cuti Bersama Nyepi', 'collective_leave'], ['03-19', 'Hari Suci Nyepi', 'national'], ['03-20', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-21', 'Idulfitri 1447 H', 'national'], ['03-22', 'Idulfitri 1447 H', 'national'], ['03-23', 'Cuti Bersama Idulfitri', 'collective_leave'], ['03-24', 'Cuti Bersama Idulfitri', 'collective_leave'], ['04-03', 'Wafat Yesus Kristus', 'national'], ['04-05', 'Paskah', 'national'], ['05-01', 'Hari Buruh Internasional', 'national'], ['05-14', 'Kenaikan Yesus Kristus', 'national'], ['05-15', 'Cuti Bersama Kenaikan Yesus Kristus', 'collective_leave'], ['05-27', 'Iduladha 1447 H', 'national'], ['05-28', 'Cuti Bersama Iduladha', 'collective_leave'], ['05-31', 'Waisak 2570 BE', 'national'], ['06-01', 'Hari Lahir Pancasila', 'national'], ['06-16', '1 Muharam 1448 H', 'national'], ['08-17', 'Proklamasi Kemerdekaan RI', 'national'], ['08-25', 'Maulid Nabi Muhammad SAW', 'national'], ['12-24', 'Cuti Bersama Natal', 'collective_leave'], ['12-25', 'Kelahiran Yesus Kristus', 'national']
            ],
            2027: SKB_2027_OFFICIAL.map(i => [i.holiday_date.slice(5), i.name, i.holiday_type])
          };
          setOfficialRows(Object.entries(skb).flatMap(([yr, items]) => items.map(([d, n, ht]) => ({ holiday_date: `${yr}-${d}`, name: n, holiday_type: ht, source: 'skb', is_active: true, isOfficial: true }))));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedYear]);

  // Merged rows: official SKB rows overridden by company_holidays custom rows
  const mergedRows = useMemo(() => {
    const map = new Map<string, any>();
    officialRows.forEach(r => map.set(r.holiday_date, {
      ...r,
      holiday_type: r.holiday_type === 'national_holiday' ? 'national' : r.holiday_type,
      isOfficial: true
    }));
    rows.forEach(r => {
      const existing = map.get(r.holiday_date);
      const hType = r.holiday_type === 'national_holiday' ? 'national' : (r.holiday_type || existing?.holiday_type || 'national');
      map.set(r.holiday_date, {
        ...r,
        holiday_type: hType,
        isOfficial: Boolean(existing?.isOfficial || r.source?.includes('skb')),
        originalOfficialName: existing?.name || r.name
      });
    });
    return Array.from(map.values()).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date));
  }, [rows, officialRows]);

  // Current month's holidays
  const monthRows = useMemo(() => {
    return mergedRows.filter((row) => {
      const d = new Date(`${row.holiday_date}T00:00:00`);
      return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
    });
  }, [mergedRows, selectedYear, selectedMonth]);

  // Stats calculation
  const stats = useMemo(() => {
    const currentYearRows = mergedRows.filter(r => r.holiday_date.startsWith(String(selectedYear)));
    const total = currentYearRows.filter(r => r.is_active !== false).length;
    const nationalCount = currentYearRows.filter(r => r.holiday_type === 'national' && r.is_active !== false).length;
    const collectiveCount = currentYearRows.filter(r => r.holiday_type === 'collective_leave' && r.is_active !== false).length;
    const totalCollective = currentYearRows.filter(r => r.holiday_type === 'collective_leave').length;
    const inactiveCollectiveCount = currentYearRows.filter(r => r.holiday_type === 'collective_leave' && r.is_active === false).length;
    const monthActiveCount = monthRows.filter(r => r.is_active !== false).length;
    return { total, nationalCount, collectiveCount, totalCollective, inactiveCollectiveCount, monthActiveCount };
  }, [mergedRows, monthRows, selectedYear]);

  // Filtered table rows with search, category, and status filter
  const filteredTableRows = useMemo(() => {
    return mergedRows.filter(r => {
      if (!r.holiday_date.startsWith(String(selectedYear))) return false;
      if (searchTableQuery.trim()) {
        const q = searchTableQuery.toLowerCase().trim();
        if (!r.name.toLowerCase().includes(q) && !r.holiday_date.includes(q)) return false;
      }
      if (typeFilter !== 'all' && r.holiday_type !== typeFilter) return false;
      if (statusFilter === 'active' && r.is_active === false) return false;
      if (statusFilter === 'inactive' && r.is_active !== false) return false;
      return true;
    });
  }, [mergedRows, selectedYear, searchTableQuery, typeFilter, statusFilter]);

  // Helper aman untuk update / upsert company_holidays tanpa crash jika kolom belum di-migrate
  const safeSaveHoliday = async (payload: any, id?: string | number) => {
    let currentPayload = { ...payload };

    // Pastikan year selalu terisi dari holiday_date agar not-null constraint terpenuhi
    if (currentPayload.holiday_date && !currentPayload.year) {
      currentPayload.year = parseInt(currentPayload.holiday_date.split('-')[0], 10) || new Date().getFullYear();
    }

    const executeOp = async (p: any) => {
      if (id) {
        return await supabase.from('company_holidays').update(p).eq('id', id);
      }
      return await supabase.from('company_holidays').upsert(p, { onConflict: 'holiday_date,name' });
    };

    let res = await executeOp(currentPayload);

    // 1. Tangani jika kolom deduct_annual_leave atau source belum ada di schema cache
    if (res.error && (res.error.message?.includes('deduct_annual_leave') || res.error.message?.includes('source') || res.error.code === 'PGRST204')) {
      delete currentPayload.deduct_annual_leave;
      delete currentPayload.source;
      res = await executeOp(currentPayload);
    }

    // 2. Tangani jika constraint onConflict holiday_date,name belum terpasang di database
    if (res.error && (res.error.message?.includes('constraint') || res.error.code === '42P10')) {
      const { data: existing } = await supabase
        .from('company_holidays')
        .select('id')
        .eq('holiday_date', currentPayload.holiday_date)
        .maybeSingle();

      if (existing?.id) {
        res = await supabase.from('company_holidays').update(currentPayload).eq('id', existing.id);
      } else {
        res = await supabase.from('company_holidays').insert(currentPayload);
      }
    }

    return res;
  };

  const save = async () => {
    if (!date || !name.trim()) {
      toast.error('Pilih tanggal dan isi nama hari libur');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        holiday_date: date,
        name: name.trim(),
        holiday_name: name.trim(),
        holiday_type: type,
        deduct_annual_leave: (type === 'collective_leave' || type === 'company') && deduct,
        source: editingHoliday?.source || 'company_policy',
        is_active: true,
        updated_at: new Date().toISOString()
      };
      
      const res = await safeSaveHoliday(payload, editingHoliday?.id);
      if (res.error) throw res.error;
      
      toast.success(editingHoliday ? 'Perubahan hari libur berhasil disimpan' : 'Hari libur berhasil ditambahkan');
      setDate('');
      setName('');
      setType('collective_leave');
      setDeduct(true);
      setEditingHoliday(null);
      await load();
    } catch (err: any) {
      toast.error('Gagal menyimpan hari libur: ' + (err.message || 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (row: any) => {
    try {
      const nextActive = row.is_active === false;
      const payload = {
        holiday_date: row.holiday_date,
        name: row.name,
        holiday_name: row.name,
        holiday_type: row.holiday_type || 'national_holiday',
        deduct_annual_leave: Boolean(row.deduct_annual_leave),
        source: row.source || 'company_policy',
        is_active: nextActive,
        updated_at: new Date().toISOString()
      };

      const res = await safeSaveHoliday(payload, row.id);
      if (res.error) throw res.error;

      toast.success(
        nextActive
          ? `Hari libur "${row.name}" diaktifkan kembali untuk perusahaan`
          : `Hari libur "${row.name}" dinonaktifkan / dikecualikan dari kalender kerja`
      );
      if (editingHoliday?.holiday_date === row.holiday_date) {
        setEditingHoliday({ ...editingHoliday, is_active: nextActive });
      }
      await load();
    } catch (err: any) {
      toast.error('Gagal memperbarui status: ' + (err.message || 'Error'));
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    try {
      const isOfficial = deleteTarget.isOfficial || officialRows.some(o => o.holiday_date === deleteTarget.holiday_date);
      if (isOfficial) {
        // Mark as excluded/inactive in company_holidays so it won't count as a working holiday
        const payload = {
          holiday_date: deleteTarget.holiday_date,
          name: deleteTarget.name,
          holiday_name: deleteTarget.name,
          holiday_type: deleteTarget.holiday_type || 'national_holiday',
          deduct_annual_leave: Boolean(deleteTarget.deduct_annual_leave),
          source: deleteTarget.source || 'company_policy',
          is_active: false,
          updated_at: new Date().toISOString()
        };

        const res = await safeSaveHoliday(payload, deleteTarget.id);
        if (res.error) throw res.error;
        toast.success(`Cuti bersama / hari libur "${deleteTarget.name}" berhasil dihapus dari kalender kerja perusahaan`);
      } else {
        // Purely custom company holiday
        if (deleteTarget.id) {
          const { error } = await supabase.from('company_holidays').delete().eq('id', deleteTarget.id);
          if (error) throw error;
        }
        toast.success(`Hari libur "${deleteTarget.name}" berhasil dihapus`);
      }
      setDeleteTarget(null);
      if (editingHoliday?.holiday_date === deleteTarget.holiday_date) {
        setEditingHoliday(null);
        setDate('');
        setName('');
      }
      await load();
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + (err.message || 'Error'));
    }
  };

  // Calendar cells
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const calendarCells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index < firstDay ? null : index - firstDay + 1);

  const selectCalendarDate = (day: number) => {
    const selectedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const mergedRow = mergedRows.find((r) => r.holiday_date === selectedDate);
    setDate(selectedDate);
    if (mergedRow) {
      setEditingHoliday(mergedRow);
      setName(mergedRow.name);
      setType(mergedRow.holiday_type);
      setDeduct(Boolean(mergedRow.deduct_annual_leave));
    } else {
      setEditingHoliday(null);
      setName('');
      setType('collective_leave');
      setDeduct(true);
    }
  };

  const goToPrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    setDate(todayStr);
    const existing = mergedRows.find(r => r.holiday_date === todayStr);
    if (existing) {
      setEditingHoliday(existing);
      setName(existing.name);
      setType(existing.holiday_type);
      setDeduct(Boolean(existing.deduct_annual_leave));
    }
  };

  const getHolidayTypeInfo = (hType: string) => {
    switch (hType) {
      case 'national':
        return {
          label: 'Libur Nasional',
          badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
          dotClass: 'bg-rose-500'
        };
      case 'collective_leave':
        return {
          label: 'Cuti Bersama',
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
          dotClass: 'bg-amber-500'
        };
      case 'company':
        return {
          label: 'Libur Perusahaan',
          badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25',
          dotClass: 'bg-blue-500'
        };
      case 'working_day':
        return {
          label: 'Kerja Pengganti',
          badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
          dotClass: 'bg-emerald-500'
        };
      default:
        return {
          label: hType || 'Hari Libur',
          badgeClass: 'bg-muted text-muted-foreground border border-border/50',
          dotClass: 'bg-muted-foreground'
        };
    }
  };

  const today = new Date();

  return (
    <TooltipProvider delay={100}>
      <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Standard PageHeader */}
      <PageHeader
        title="Kalender Perusahaan"
        description="Kelola jadwal hari libur nasional resmi SKB, cuti bersama, dan kalender operasional kerja perusahaan."
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedYear === 2027 && (
            <Badge variant="outline" className="h-8 px-2.5 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              <Shield size={13} className="text-emerald-500" />
              <span>SKB 3 Menteri 2027 (No. 1205/2026, 3/2026, 2/2026)</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
          >
            <RefreshCw size={14} className={cn(loading && 'animate-spin text-primary dark:text-blue-400')} />
            <span>Sinkronisasi SKB</span>
          </Button>
        </div>
      </PageHeader>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-fit mb-6">
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar size={14} className="mr-1.5" />
            <span>Tampilan Kalender</span>
          </TabsTrigger>
          <TabsTrigger value="list">
            <List size={14} className="mr-1.5" />
            <span>Daftar Hari Libur</span>
            <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold">
              {stats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* StatCards Grid (Interactive: Click to Filter) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('all'); setStatusFilter('all'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk melihat semua hari libur di daftar"
        >
          <StatCard
            label={`Total Libur (${selectedYear})`}
            value={stats.total}
            subValue="Hari libur aktif"
            icon={Calendar}
            color="slate"
          />
        </div>
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('national'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk filter Libur Nasional"
        >
          <StatCard
            label="Libur Nasional"
            value={stats.nationalCount}
            subValue="SKB Pemerintah"
            icon={CheckCircle2}
            color="emerald"
            status="on-track"
          />
        </div>
        <div
          onClick={() => { setActiveTab('list'); setTypeFilter('collective_leave'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Klik untuk memeriksa Cuti Bersama"
        >
          <StatCard
            label="Cuti Bersama"
            value={stats.collectiveCount}
            subValue={stats.inactiveCollectiveCount > 0 ? `${stats.inactiveCollectiveCount} cuti bersama dikecualikan` : `${stats.totalCollective} dari SKB`}
            icon={Clock}
            color="amber"
          />
        </div>
        <div
          onClick={() => { setActiveTab('calendar'); }}
          className="cursor-pointer transition-transform hover:-translate-y-0.5"
          title="Kembali ke kalender bulan ini"
        >
          <StatCard
            label={`Libur ${MONTH_NAMES[selectedMonth]}`}
            value={stats.monthActiveCount}
            subValue="Hari libur aktif bulan ini"
            icon={Sunrise}
            color="blue"
          />
        </div>
      </div>

      {/* Tab Content: Calendar View */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid Card */}
          <Card className="lg:col-span-8 border-border/60 shadow-sm overflow-hidden flex flex-col">
            {/* Calendar Controls Header */}
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft size={16} />
                </Button>
                <div className="text-sm font-bold text-foreground min-w-[150px] text-center sm:text-left">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="h-8 px-2.5 text-xs font-semibold border-border/60"
                >
                  Hari Ini
                </Button>
              </div>
            </CardHeader>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-border/40 bg-muted/10 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> Libur Nasional
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Cuti Bersama
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Libur Kantor
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Kerja Pengganti
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400/50" /> Dikecualikan / Tidak Libur
              </span>
            </div>

            {/* Grid */}
            <CardContent className="p-3 sm:p-4 flex-1">
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Day of Week Headers */}
                {DAY_NAMES.map((d, idx) => (
                  <div
                    key={d}
                    className={cn(
                      'py-2 text-[11px] font-bold uppercase tracking-wider',
                      idx === 0 ? 'text-rose-500 dark:text-rose-400' : idx === 6 ? 'text-slate-400 dark:text-zinc-500' : 'text-muted-foreground'
                    )}
                  >
                    {d}
                  </div>
                ))}

                {/* Day Cells */}
                {calendarCells.map((day, idx) => {
                  if (day === null) {
                    return <div key={`empty-${idx}`} className="min-h-20 sm:min-h-24 rounded-lg bg-muted/10 border border-transparent" />;
                  }
                  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const cellDate = new Date(selectedYear, selectedMonth, day);
                  const dayOfWeek = cellDate.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isToday = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() && day === today.getDate();
                  const isSelected = date === dateStr;
                  const dayHolidays = monthRows.filter(r => r.holiday_date === dateStr && r.is_active !== false);
                  const inactiveHolidays = monthRows.filter(r => r.holiday_date === dateStr && r.is_active === false);

                  return (
                    <div
                      key={dateStr}
                      onClick={() => selectCalendarDate(day)}
                      className={cn(
                        'min-h-20 sm:min-h-24 rounded-lg border p-1 sm:p-1.5 text-left transition-all cursor-pointer flex flex-col justify-between group',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/40 bg-primary/5 dark:bg-primary/10'
                          : dayHolidays.length > 0
                          ? 'border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-500/[0.07] hover:border-rose-500/50'
                          : inactiveHolidays.length > 0
                          ? 'border-dashed border-border/80 bg-muted/20 hover:border-border hover:bg-muted/40'
                          : isSunday
                          ? 'border-border/40 bg-rose-500/[0.02] dark:bg-rose-500/[0.03] hover:border-border hover:bg-muted/40'
                          : isSaturday
                          ? 'border-border/40 bg-muted/20 hover:border-border hover:bg-muted/40'
                          : 'border-border/40 bg-card hover:border-border hover:bg-muted/30 dark:bg-zinc-900/60'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-bold inline-flex items-center justify-center h-5 w-5 rounded-full',
                            isToday
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : isSunday || dayHolidays.length > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : isSaturday
                              ? 'text-muted-foreground'
                              : 'text-foreground'
                          )}
                        >
                          {day}
                        </span>
                        {dayHolidays.length > 0 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        ) : inactiveHolidays.length > 0 ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400/60 shrink-0" title="Dikecualikan / Tidak Libur" />
                        ) : null}
                      </div>

                      <div className="mt-1 space-y-1 overflow-hidden">
                        {dayHolidays.map((h, hIdx) => {
                          const info = getHolidayTypeInfo(h.holiday_type);
                          return (
                            <div
                              key={hIdx}
                              className={cn(
                                'text-[10px] leading-tight font-semibold px-1 py-0.5 rounded truncate',
                                info.badgeClass
                              )}
                              title={h.name}
                            >
                              {h.name}
                            </div>
                          );
                        })}
                        {inactiveHolidays.map((h, hIdx) => (
                          <div
                            key={`inactive-${hIdx}`}
                            className="text-[9px] leading-tight font-medium px-1 py-0.5 rounded truncate bg-muted/50 text-muted-foreground line-through border border-border/40"
                            title={`Dikecualikan di perusahaan: ${h.name}`}
                          >
                            {h.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Form & Month Holiday List Card */}
          <div className="lg:col-span-4 space-y-6">
            {/* Event Form Card */}
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  {editingHoliday ? (editingHoliday.is_active === false ? 'Status Libur Dikecualikan' : 'Edit Hari Libur') : 'Tambah Hari Libur'}
                </CardTitle>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Sesuaikan hari libur khusus atau cuti bersama perusahaan
                </p>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5">
                {editingHoliday?.is_active === false && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
                    <div className="min-w-0">
                      <div className="font-bold">Hari Libur Ini Dikecualikan</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Tercatat di SKB resmi tapi dinonaktifkan untuk perusahaan (karyawan masuk kerja normal).
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Tanggal
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Nama Hari Libur
                  </Label>
                  <Input
                    placeholder="Contoh: Libur Operasional Akhir Tahun"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Jenis Libur
                  </Label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="collective_leave">Cuti Bersama</option>
                    <option value="national">Libur Nasional</option>
                    <option value="company">Libur Perusahaan</option>
                    <option value="working_day">Hari Kerja Pengganti</option>
                  </select>
                </div>

                <div className="pt-1">
                  <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={deduct}
                      onChange={e => setDeduct(e.target.checked)}
                      disabled={type !== 'collective_leave' && type !== 'company'}
                      className="rounded border-border/60 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Potong kuota cuti tahunan karyawan</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-end gap-2">
                  {editingHoliday && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingHoliday(null);
                        setDate('');
                        setName('');
                        setType('collective_leave');
                        setDeduct(true);
                      }}
                      className="h-8 text-xs font-semibold"
                    >
                      Batal
                    </Button>
                  )}

                  {editingHoliday && (
                    editingHoliday.is_active === false ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => toggle(editingHoliday)}
                        className="h-8 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
                      >
                        <Check size={13} />
                        <span>Aktifkan Kembali</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggle(editingHoliday)}
                        className="h-8 gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        title="Nonaktifkan / Kecualikan dari Kalender"
                      >
                        <EyeOff size={13} />
                        <span>Nonaktifkan Libur</span>
                      </Button>
                    )
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={save}
                    disabled={saving}
                    className="h-8 gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 text-xs font-semibold"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    <span>{editingHoliday ? 'Simpan Perubahan' : 'Tambah Libur'}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Selected Month Holidays List Preview */}
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Hari Libur {MONTH_NAMES[selectedMonth]}</span>
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {monthRows.filter(r => r.is_active !== false).length} Aktif / {monthRows.length} Total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {monthRows.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada hari libur di bulan {MONTH_NAMES[selectedMonth]}
                  </div>
                ) : (
                  <div className="divide-y divide-border/40 max-h-[300px] overflow-y-auto">
                    {monthRows.map((item, idx) => {
                      const info = getHolidayTypeInfo(item.holiday_type);
                      const dObj = new Date(`${item.holiday_date}T00:00:00`);
                      const isInactive = item.is_active === false;
                      return (
                        <div key={idx} className={cn('p-3 flex items-start justify-between gap-2 transition-colors', isInactive ? 'bg-muted/10 opacity-70' : 'hover:bg-muted/30')}>
                          <div className="min-w-0">
                            <div className={cn('text-xs font-semibold truncate', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>
                              {item.name}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                              <span className={cn('text-[10px] font-semibold px-1.5 py-px rounded', info.badgeClass)}>
                                {info.label}
                              </span>
                              {isInactive && (
                                <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-600 dark:text-amber-400">
                                  Dikecualikan
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => {
                                      setDate(item.holiday_date);
                                      setName(item.name);
                                      setType(item.holiday_type);
                                      setDeduct(Boolean(item.deduct_annual_leave));
                                      setEditingHoliday(item);
                                    }}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Edit Hari Libur"
                                    aria-label="Edit Hari Libur"
                                  />
                                }
                              >
                                <Edit3 size={12} />
                              </TooltipTrigger>
                              <TooltipContent side="top">Edit Hari Libur</TooltipContent>
                            </Tooltip>
                            {isInactive ? (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => toggle(item)}
                                      className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 bg-emerald-500/10 border border-emerald-500/30"
                                      title="Aktifkan Kembali"
                                      aria-label="Aktifkan Kembali"
                                    />
                                  }
                                >
                                  <Check size={12} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Aktifkan Kembali</TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => toggle(item)}
                                      className="h-7 w-7 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                                      title="Nonaktifkan / Kecualikan dari Kalender"
                                      aria-label="Nonaktifkan / Kecualikan dari Kalender"
                                    />
                                  }
                                >
                                  <EyeOff size={12} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Nonaktifkan / Kecualikan</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab Content: List View */}
      {activeTab === 'list' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col gap-3 pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <List size={16} className="text-primary" />
                  Daftar Lengkap Hari Libur &amp; Cuti Bersama ({selectedYear})
                </CardTitle>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Menampilkan {filteredTableRows.length} dari total {stats.total} hari libur aktif ({stats.inactiveCollectiveCount > 0 ? `${stats.inactiveCollectiveCount} cuti bersama dikecualikan` : 'semua cuti bersama aktif'})
                </p>
              </div>

              {/* Year quick switcher */}
              <div className="flex items-center gap-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground">Tahun:</Label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="h-8 rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-semibold text-foreground outline-none focus:border-primary"
                >
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter toolbar inside list header: Search + Category + Status */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1 border-t border-border/40">
              <div className="relative md:col-span-6">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTableQuery}
                  onChange={e => setSearchTableQuery(e.target.value)}
                  placeholder="Cari nama hari libur atau tanggal (YYYY-MM-DD)..."
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <div className="md:col-span-3">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                  className="h-8 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Semua Kategori Libur</option>
                  <option value="collective_leave">Cuti Bersama Saja</option>
                  <option value="national">Libur Nasional Saja</option>
                  <option value="company">Libur Perusahaan Saja</option>
                  <option value="working_day">Hari Kerja Pengganti</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  className="h-8 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground outline-none focus:border-primary"
                >
                  <option value="all">Semua Status (Aktif &amp; Nonaktif)</option>
                  <option value="active">Hanya Aktif Berlaku</option>
                  <option value="inactive">Hanya Dikecualikan / Nonaktif</option>
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {filteredTableRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <Calendar size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Tidak ada hari libur yang sesuai</p>
                <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau reset filter kategori / status</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[180px]">Tanggal &amp; Hari</TableHead>
                      <TableHead>Nama Hari Libur</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Potong Cuti</TableHead>
                      <TableHead>Sumber Referensi</TableHead>
                      <TableHead>Status Perusahaan</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTableRows.map((row, idx) => {
                      const info = getHolidayTypeInfo(row.holiday_type);
                      const dObj = new Date(`${row.holiday_date}T00:00:00`);
                      const dayName = dObj.toLocaleDateString('id-ID', { weekday: 'long' });
                      const formattedDate = dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                      const isInactive = row.is_active === false;

                      return (
                        <TableRow key={row.id || `${row.holiday_date}-${idx}`} className={cn('transition-colors', isInactive ? 'bg-muted/10 opacity-70 hover:bg-muted/20' : 'hover:bg-muted/30 dark:hover:bg-zinc-800/40')}>
                          <TableCell className="py-3">
                            <div className={cn('font-mono text-xs font-semibold', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>{formattedDate}</div>
                            <div className="text-[11px] text-muted-foreground">{dayName}</div>
                          </TableCell>
                          <TableCell>
                            <span className={cn('text-xs font-bold', isInactive ? 'line-through text-muted-foreground' : 'text-foreground')}>
                              {row.name}
                            </span>
                            {isInactive && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                Dikecualikan di perusahaan (Karyawan masuk kerja normal)
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded inline-block', info.badgeClass)}>
                              {info.label}
                            </span>
                          </TableCell>
                          <TableCell>
                            {row.deduct_annual_leave ? (
                              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                                Ya
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-border/60 bg-muted/40 text-muted-foreground text-[10px]">
                                Tidak
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground font-medium">
                              {row.source === 'company_policy' ? 'Kebijakan Perusahaan' : 'SKB Resmi Pemerintah'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-semibold gap-1.5 px-2 py-0.5',
                                !isInactive
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', !isInactive ? 'bg-emerald-500' : 'bg-amber-500')} />
                              {!isInactive ? 'Aktif Berlaku' : 'Dikecualikan / Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Button with Tooltip */}
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() => {
                                        setDate(row.holiday_date);
                                        setName(row.name);
                                        setType(row.holiday_type);
                                        setDeduct(Boolean(row.deduct_annual_leave));
                                        setEditingHoliday(row);
                                        setActiveTab('calendar');
                                      }}
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                                      title="Edit Hari Libur"
                                      aria-label="Edit Hari Libur"
                                    />
                                  }
                                >
                                  <Edit3 size={14} />
                                </TooltipTrigger>
                                <TooltipContent side="top">Edit Hari Libur</TooltipContent>
                              </Tooltip>

                              {/* Nonaktifkan / Aktifkan Button with Tooltip */}
                              {!isInactive ? (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => toggle(row)}
                                        className="h-8 w-8 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                                        title="Nonaktifkan / Kecualikan dari Kalender"
                                        aria-label="Nonaktifkan / Kecualikan dari Kalender"
                                      />
                                    }
                                  >
                                    <EyeOff size={14} />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Nonaktifkan / Kecualikan</TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => toggle(row)}
                                        className="h-8 w-8 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"
                                        title="Aktifkan Kembali Libur Ini"
                                        aria-label="Aktifkan Kembali Libur Ini"
                                      />
                                    }
                                  >
                                    <Check size={14} />
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Aktifkan Kembali</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete / Exclude Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/40 px-6 py-4 bg-muted/20">
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold text-foreground">
              <div className={cn(
                'h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              )}>
                {deleteTarget?.holiday_type === 'collective_leave' ? (
                  <Clock size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
              </div>
              <span>
                {deleteTarget?.holiday_type === 'collective_leave' ? 'Kecualikan Cuti Bersama' : 'Hapus Hari Libur'}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs normal-case tracking-normal text-muted-foreground mt-0.5">
              {deleteTarget?.holiday_type === 'collective_leave'
                ? 'Konfirmasi pengecualian status cuti bersama pada kalender kerja.'
                : 'Konfirmasi penghapusan hari libur dari kalender perusahaan.'}
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="p-6 space-y-4">
            {deleteTarget && (() => {
              const dObj = new Date(`${deleteTarget.holiday_date}T00:00:00`);
              const fullDate = dObj.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
              return (
                <div className="rounded-xl border border-border/60 bg-muted/30 dark:bg-zinc-800/50 p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">
                      {deleteTarget.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                      {fullDate}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px] font-semibold px-2 py-0.5',
                      deleteTarget.holiday_type === 'collective_leave'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    )}
                  >
                    {deleteTarget.holiday_type === 'collective_leave' ? 'Cuti Bersama' : 'Libur Nasional'}
                  </Badge>
                </div>
              );
            })()}

            <div className={cn(
              'rounded-xl border p-3.5 flex items-start gap-3 text-xs leading-relaxed',
              deleteTarget?.holiday_type === 'collective_leave'
                ? 'border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 text-muted-foreground'
                : 'border-rose-500/25 bg-rose-500/5 dark:bg-rose-500/10 text-muted-foreground'
            )}>
              <Info size={16} className={cn(
                'shrink-0 mt-0.5',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              )} />
              <div className="space-y-1">
                <div className="font-semibold text-foreground text-xs">
                  {deleteTarget?.holiday_type === 'collective_leave'
                    ? 'Karyawan tetap masuk kerja seperti biasa'
                    : 'Hari libur akan dihapus dari kalender perusahaan'}
                </div>
                <p className="text-[11px] leading-relaxed">
                  {deleteTarget?.holiday_type === 'collective_leave'
                    ? 'Tanggal ini akan dinonaktifkan dari kalender libur. Jam kerja operasional dan absensi karyawan berlaku normal seperti biasa.'
                    : 'Jadwal operasional perusahaan pada tanggal ini akan kembali normal sebagai hari kerja.'}
                </p>
                <p className="text-[10px] text-muted-foreground/80 pt-0.5">
                  💡 HR dapat memeriksa kembali dan mengaktifkannya sewaktu-waktu melalui tab <strong>Daftar Hari Libur</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-3.5 bg-muted/15 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              className="h-8 px-3.5 text-xs font-semibold border-border/60 hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={executeDelete}
              className={cn(
                'h-8 px-3.5 gap-1.5 text-xs font-semibold text-white shadow-xs',
                deleteTarget?.holiday_type === 'collective_leave'
                  ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              <Trash2 size={13} />
              <span>
                {deleteTarget?.holiday_type === 'collective_leave'
                  ? 'Ya, Kecualikan Libur'
                  : 'Ya, Hapus Libur'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
};

export const AttendanceCalendar = CompanyCalendarManager;
export { CompanyCalendarManager };
export default AttendanceCalendar;
