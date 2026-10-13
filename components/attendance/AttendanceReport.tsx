import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Filter, RefreshCw, Download, Eye, ChevronDown, ChevronRight,
  ExternalLink, BarChart3, Clock, CheckCircle2, AlertTriangle, Calendar, Building2, User,
  XCircle, Timer, RotateCcw, X, Users, FileText, Sunrise, Sunset, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { isActiveEmployee, isHRAccount, jakartaDate } from '../../lib/workforce-contract';
import { summarizeEmployee, reportDatePreset } from '../../lib/attendanceSummary';
import { loadHolidayDates } from '../../lib/holidayDates';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '../StatCard';
import { UserAvatar } from '../UserAvatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  AttendanceRecord, UserAccount, STATUS_CONFIG, formatTime, formatMinutes, formatDate, renderStatusBadge
} from './attendanceTypes';

const mapsLink = (lat: number | null, lng: number | null) =>
  lat != null && lng != null ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}` : null;

const renderEmploymentBadge = (type?: string) => {
  const norm = (type || 'PKWT').toUpperCase();
  if (norm.includes('PKWTT') || norm.includes('TETAP')) {
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-semibold">PKWTT</Badge>;
  }
  if (norm.includes('MAGANG') || norm.includes('INTERN')) {
    return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-semibold">Magang</Badge>;
  }
  if (norm.includes('PERCOBAAN') || norm.includes('PROBATION')) {
    return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-[10px] font-semibold">Percobaan</Badge>;
  }
  return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold">PKWT</Badge>;
};

export interface AttendanceReportProps {
  currentUser?: any;
  allUsers?: UserAccount[];
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ currentUser, allUsers: propUsers }) => {
  const userId = String(currentUser?.id || '');
  const isManager = isHRAccount(currentUser);

  const [allUsers, setAllUsers] = useState<UserAccount[]>(propUsers || []);
  const [reportStart, setReportStart] = useState(() => {
    return `${jakartaDate().slice(0, 7)}-01`;
  });
  const [reportEnd, setReportEnd] = useState(() => {
    return jakartaDate();
  });
  const [reportDept, setReportDept] = useState('all');
  const [reportCompany, setReportCompany] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [reportLeaves, setReportLeaves] = useState<any[]>([]);
  const [reportHolidays, setReportHolidays] = useState<Set<string>>(new Set());
  const [reportError, setReportError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSort, setReportSort] = useState<'name' | 'present' | 'late' | 'absent' | 'hours'>('name');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewAttendancePhoto, setViewAttendancePhoto] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'summary' | 'logs'>('summary');
  const [reportLogStatus, setReportLogStatus] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const requestVersion = useRef(0);

  const fetchReportRecords = useCallback(async () => {
    if (!userId || !reportStart || !reportEnd) return;
    const currentVersion = ++requestVersion.current;
    setReportLoading(true);
    setReportError('');
    try {
      if (reportStart > reportEnd) throw new Error('Tanggal awal tidak boleh setelah tanggal akhir.');
      const [records, leaves, holidays, users] = await Promise.all([
        fetchAllRows((from, to) => {
          let query = supabase.from('attendance_records').select('*').gte('date', reportStart).lte('date', reportEnd).order('date', { ascending: false }).order('id');
          if (!isManager) query = query.eq('user_id', String(userId));
          return query.range(from, to);
        }),
        fetchAllRows((from, to) => supabase.from('leave_requests').select('*').lte('start_date', reportEnd).gte('end_date', reportStart).order('id').range(from, to)),
        loadHolidayDates(reportStart, reportEnd), loadWorkforceAccounts(),
      ]);
      if (currentVersion !== requestVersion.current) return;
      setReportRecords(records.map(normalizeAttendance) as AttendanceRecord[]);
      setReportLeaves(leaves);
      setReportHolidays(holidays);
      setAllUsers(users);
    } catch (err: any) {
      if (currentVersion !== requestVersion.current) return;
      console.warn('Report fetch error:', err);
      setReportRecords([]);
      setReportLeaves([]);
      setReportError(err.message || 'Gagal memuat laporan.');
    } finally {
      if (currentVersion === requestVersion.current) setReportLoading(false);
    }
  }, [isManager, userId, reportStart, reportEnd]);

  useEffect(() => {
    if (reportStart && reportEnd) fetchReportRecords();
    return () => { requestVersion.current++; };
  }, [fetchReportRecords, reportStart, reportEnd, refreshKey]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

  const reportUsers = useMemo(() => {
    if (!isManager) return allUsers.filter(u => u.id === userId);
    let filtered = allUsers;
    if (reportCompany !== 'all') {
      filtered = filtered.filter(u => u.company === reportCompany);
    }
    if (reportDept !== 'all') {
      filtered = filtered.filter(u => u.department === reportDept);
    }
    const active = filtered.filter(user => isActiveEmployee(user) || reportRecords.some(record => String(record.user_id) === String(user.id)));
    const needle = reportSearch.trim().toLowerCase();
    return needle
      ? active.filter(u =>
          `${u.full_name || ''} ${u.username || ''} ${u.employee_code || ''} ${u.company || ''} ${u.department || ''} ${u.job_title || ''}`
            .toLowerCase()
            .includes(needle)
        )
      : active;
  }, [allUsers, reportRecords, reportCompany, reportDept, reportSearch, isManager, userId]);

  const employeeSummaries = useMemo(() => reportUsers.map(user => summarizeEmployee(user, reportRecords, reportLeaves, reportStart, reportEnd, reportHolidays)), [reportUsers, reportRecords, reportLeaves, reportStart, reportEnd, reportHolidays]);
  const reportSummary = useMemo(() => employeeSummaries.reduce((sum, row) => ({
    present: sum.present + row.present, late: sum.late + row.late, absent: sum.absent + row.absent,
    leave: sum.leave + row.leave, missing: sum.missing + row.missing, totalWork: sum.totalWork + row.totalWork,
    totalOT: sum.totalOT + row.totalOT, total: sum.total + row.total,
  }), { present: 0, late: 0, absent: 0, leave: 0, missing: 0, totalWork: 0, totalOT: 0, total: 0 }), [employeeSummaries]);

  const reportRows = useMemo(() => {
    const sorted = [...employeeSummaries];
    switch (reportSort) {
      case 'present': sorted.sort((a, b) => b.present - a.present); break;
      case 'late': sorted.sort((a, b) => b.late - a.late); break;
      case 'absent': sorted.sort((a, b) => b.absent - a.absent); break;
      case 'hours': sorted.sort((a, b) => b.totalWork - a.totalWork); break;
      default: sorted.sort((a, b) => (a.user.full_name || a.user.username || '').localeCompare(b.user.full_name || b.user.username || '')); break;
    }
    return sorted;
  }, [employeeSummaries, reportSort]);

  const exportReportExcel = () => {
    if (reportRows.length === 0) {
      toast.error('Belum ada data untuk diekspor');
      return;
    }
    const rows = reportRows.map(row => {
      const userTotalDays = row.present + row.late + row.absent + row.missing + row.leave;
      const rate = userTotalDays > 0 ? Math.round(((row.present + row.late) / userTotalDays) * 100) : 0;
      return {
        'NIK Karyawan': row.user.employee_code || '-',
        'Nama Karyawan': row.user.full_name || row.user.username || 'Tanpa Nama',
        'Email': row.user.email || '-',
        'Perusahaan': row.user.company || 'GESIT',
        'Departemen': row.user.department || '-',
        'Jabatan': row.user.job_title || '-',
        'Level': row.user.job_level || 'Staff',
        'Status Kerja': row.user.employment_type || 'PKWT',
        'Tingkat Kehadiran (%)': `${rate}%`,
        'Hadir (Tepat Waktu)': row.present,
        'Terlambat': row.late,
        'Lupa Absen / Tanpa Log': row.missing,
        'Absen': row.absent,
        'Cuti / Izin': row.leave,
        'Hari Libur': row.holiday,
        'Total Hari Kerja': userTotalDays,
        'Jam Kerja Efektif': formatMinutes(row.totalWork),
        'Lembur': formatMinutes(row.totalOT),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 26 }, { wch: 25 }, { wch: 22 }, { wch: 20 },
      { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 16 },
      { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
      { wch: 16 }, { wch: 18 }, { wch: 14 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Kehadiran');

    if (filteredDailyRecords.length > 0) {
      const logRows = filteredDailyRecords.map(r => {
        const u = userMap.get(String(r.user_id));
        return {
          'Tanggal': r.date,
          'NIK Karyawan': u?.employee_code || '-',
          'Nama Karyawan': u?.full_name || u?.username || '-',
          'Perusahaan': u?.company || '-',
          'Departemen': u?.department || '-',
          'Jabatan': u?.job_title || '-',
          'Status Presensi': r.status === 'present' ? 'Hadir' : r.status === 'late' ? 'Terlambat' : r.status === 'absent' ? 'Absen' : r.status === 'leave' ? 'Cuti/Izin' : r.status,
          'Jam Masuk': r.clock_in ? formatTime(r.clock_in) : '-',
          'Jam Pulang': r.clock_out ? formatTime(r.clock_out) : '-',
          'Total Jam Kerja': formatMinutes(r.total_work_minutes),
          'Lembur': formatMinutes(r.total_overtime_minutes),
          'Catatan': r.notes || '-'
        };
      });
      const logSheet = XLSX.utils.json_to_sheet(logRows);
      logSheet['!cols'] = [
        { wch: 14 }, { wch: 14 }, { wch: 26 }, { wch: 22 }, { wch: 20 },
        { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 14 }, { wch: 26 }
      ];
      XLSX.utils.book_append_sheet(workbook, logSheet, 'Log Presensi Harian');
    }

    XLSX.writeFile(workbook, `laporan-kehadiran-lengkap-${reportStart}-sd-${reportEnd}.xlsx`);
    toast.success('Laporan kehadiran full data berhasil diekspor ke Excel');
  };

  const applyDatePreset = (preset: 'today' | 'last7' | 'thisMonth' | 'lastMonth') => {
    const range = reportDatePreset(preset);
    setReportStart(range.start);
    setReportEnd(range.end);
  };

  const activeDatePreset = useMemo((): 'today' | 'last7' | 'thisMonth' | 'lastMonth' | null => {
    for (const preset of ['today', 'last7', 'thisMonth', 'lastMonth'] as const) {
      const range = reportDatePreset(preset);
      if (reportStart === range.start && reportEnd === range.end) return preset;
    }
    return null;
  }, [reportStart, reportEnd]);

  const reportOverallRate = useMemo(() => {
    const totalSlots = reportSummary.present + reportSummary.late + reportSummary.absent + reportSummary.missing + reportSummary.leave;
    if (totalSlots === 0) return 0;
    return Math.round(((reportSummary.present + reportSummary.late) / totalSlots) * 100);
  }, [reportSummary]);

  const filteredDailyRecords = useMemo(() => {
    const scopedIds = new Set(reportUsers.map(user => String(user.id)));
    let list = reportRecords.filter(record => scopedIds.has(String(record.user_id)));
    if (reportDept !== 'all') {
      const deptUserIds = new Set(allUsers.filter(u => u.department === reportDept).map(u => String(u.id)));
      list = list.filter(r => deptUserIds.has(String(r.user_id)));
    }
    if (reportSearch.trim()) {
      const needle = reportSearch.trim().toLowerCase();
      list = list.filter(r => {
        const u = userMap.get(String(r.user_id));
        const str = `${u?.full_name || ''} ${u?.username || ''} ${u?.department || ''} ${r.notes || ''}`.toLowerCase();
        return str.includes(needle);
      });
    }
    if (reportLogStatus !== 'all') {
      list = list.filter(r => r.status === reportLogStatus);
    }
    return list;
  }, [reportRecords, reportUsers, reportDept, reportSearch, reportLogStatus, allUsers, userMap]);

  const renderReport = () => (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <PageHeader
        title="Laporan Kehadiran"
        description="Analisis performa kehadiran, jam kerja efektif, dan audit log harian karyawan."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchReportRecords()}
            disabled={reportLoading}
            className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
          >
            <RefreshCw size={14} className={cn(reportLoading && 'animate-spin text-primary dark:text-blue-400')} />
            <span>Muat Ulang</span>
          </Button>
          <Button
            size="sm"
            onClick={exportReportExcel}
            disabled={reportLoading || !!reportError}
            className="gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 shadow-2xs text-xs font-semibold"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </Button>
        </div>
      </PageHeader>

      {reportError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Laporan belum berhasil dimuat: {reportError}</p>}
      {/* Standardized Tab Switcher */}
      <Tabs value={reportTab} onValueChange={(val) => setReportTab(val as any)} className="w-fit mb-6">
        <TabsList>
          <TabsTrigger value="summary">
            <Users size={14} className="mr-2" /> Rekapitulasi Karyawan
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock size={14} className="mr-2" /> Log Harian Lengkap
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Standard StatCards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Total Karyawan"
          value={reportUsers.length}
          icon={Users}
          subValue={reportDept === 'all' ? 'Semua Dept' : reportDept}
          color="slate"
        />
        <StatCard
          label="Hadir Tepat"
          value={reportSummary.present}
          icon={CheckCircle2}
          subValue={`${reportOverallRate}% rate kehadiran`}
          color="emerald"
          status="on-track"
        />
        <StatCard
          label="Terlambat"
          value={reportSummary.late}
          icon={Clock}
          subValue={reportSummary.late > 0 ? "Lewat batas masuk" : "Nihil terlambat"}
          color="amber"
          status={reportSummary.late > 0 ? "at-risk" : undefined}
        />
        <StatCard
          label="Tanpa Log"
          value={reportSummary.missing}
          icon={XCircle}
          subValue="Belum ada presensi"
          color="rose"
          status={reportSummary.missing > 0 ? "at-risk" : undefined}
        />
        <StatCard
          label="Cuti & Izin"
          value={reportSummary.leave}
          icon={Calendar}
          subValue="Pengajuan disetujui"
          color="purple"
        />
        <StatCard
          label="Jam Kerja"
          value={formatMinutes(reportSummary.totalWork)}
          icon={Timer}
          subValue={`Lembur: ${formatMinutes(reportSummary.totalOT)}`}
          color="blue"
        />
      </div>

      {/* FILTER & PERIODE TOOLBAR (Standard Card) */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              Filter & Periode Kehadiran
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Periode: {reportStart} s/d {reportEnd} &bull; Menampilkan {reportTab === 'summary' ? `${reportRows.length} Karyawan` : `${filteredDailyRecords.length} Log Presensi`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 dark:bg-zinc-900/60 p-0.5">
              {[
                { id: 'today', label: 'Hari Ini' },
                { id: 'last7', label: '7 Hari Terakhir' },
                { id: 'thisMonth', label: 'Bulan Ini' },
                { id: 'lastMonth', label: 'Bulan Lalu' },
              ].map(p => {
                const isActive = activeDatePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyDatePreset(p.id as any)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      isActive
                        ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80 dark:hover:bg-zinc-800/80'
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {(reportSearch || reportDept !== 'all' || reportCompany !== 'all' || reportSort !== 'name') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReportSearch('');
                  setReportDept('all');
                  setReportCompany('all');
                  setReportSort('name');
                }}
                className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <RotateCcw size={13} className="mr-1" /> Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 lg:items-end">
            {/* Dari Tanggal */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Dari Tanggal</Label>
              <Input
                type="date"
                value={reportStart}
                onChange={e => setReportStart(e.target.value)}
                className="h-9 text-xs font-medium border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 focus-visible:ring-primary dark:[color-scheme:dark]"
              />
            </div>

            {/* S/D Tanggal */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sampai Tanggal</Label>
              <Input
                type="date"
                value={reportEnd}
                onChange={e => setReportEnd(e.target.value)}
                min={reportStart}
                className="h-9 text-xs font-medium border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 focus-visible:ring-primary dark:[color-scheme:dark]"
              />
            </div>

            {/* Cari Karyawan */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cari Nama / NIK</Label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={reportSearch}
                  onChange={e => setReportSearch(e.target.value)}
                  placeholder="Nama, NIK, jabatan..."
                  className="h-9 pl-8 pr-7 text-xs border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 text-foreground dark:text-zinc-100 placeholder:text-muted-foreground/50 focus-visible:ring-primary"
                />
                {reportSearch && (
                  <button
                    type="button"
                    onClick={() => setReportSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Perusahaan */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan</Label>
              <select
                value={reportCompany}
                onChange={e => setReportCompany(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Semua Perusahaan</option>
                {[...new Set(allUsers.map(u => u.company).filter(Boolean) as string[])].sort().map(cmp => (
                  <option key={cmp} value={cmp} className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">{cmp}</option>
                ))}
              </select>
            </div>

            {/* Departemen */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Departemen</Label>
              <select
                value={reportDept}
                onChange={e => setReportDept(e.target.value)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Semua Departemen</option>
                {[...new Set(allUsers.map(u => u.department).filter(Boolean) as string[])].sort().map(dep => (
                  <option key={dep} value={dep} className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">{dep}</option>
                ))}
              </select>
            </div>

            {/* Urutkan */}
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Urutkan</Label>
              <select
                value={reportSort}
                onChange={e => setReportSort(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="name" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Nama (A-Z)</option>
                <option value="present" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Hadir Terbanyak</option>
                <option value="late" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Terlambat Terbanyak</option>
                <option value="absent" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Absen Terbanyak</option>
                <option value="hours" className="bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100">Jam Kerja Terbanyak</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VIEW 1: REKAPITULASI KARYAWAN (Standardized Card Data Table) */}
      {reportTab === 'summary' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Rekapitulasi Kehadiran Karyawan
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Periode: {reportStart} s/d {reportEnd} &bull; {reportDept === 'all' ? 'Semua Departemen' : reportDept}
              </p>
            </div>
            {reportLoading && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <RefreshCw size={13} className="animate-spin text-primary dark:text-blue-400" /> Memuat data...
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {reportRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                  <FileText size={40} className="text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">Tidak ada data karyawan yang cocok</p>
                  <p className="text-xs text-muted-foreground">Silakan sesuaikan tanggal atau kata kunci pencarian</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[250px]">Karyawan & NIK</TableHead>
                      <TableHead>Perusahaan & Dept</TableHead>
                      <TableHead className="text-center">Status Kerja</TableHead>
                      <TableHead className="text-center">Kehadiran</TableHead>
                      <TableHead className="text-center">Hadir</TableHead>
                      <TableHead className="text-center">Terlambat</TableHead>
                      <TableHead className="text-center">Tanpa Log</TableHead>
                      <TableHead className="text-center">Cuti / Izin</TableHead>
                      <TableHead className="text-center">Total Hari</TableHead>
                      <TableHead className="text-center">Jam Kerja</TableHead>
                      <TableHead className="text-center">Lembur</TableHead>
                      <TableHead className="text-right">Detail Log</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map(row => {
                      const isExpanded = expandedUserId === String(row.user.id);
                      const dayLogs = reportRecords
                        .filter(r => String(r.user_id) === String(row.user.id))
                        .sort((a, b) => (a.date < b.date ? 1 : -1));
                      const userTotalDays = row.present + row.late + row.absent + row.missing + row.leave;
                      const userRate = userTotalDays > 0 ? Math.round(((row.present + row.late) / userTotalDays) * 100) : 0;

                      return (
                        <React.Fragment key={row.user.id}>
                          <TableRow className={cn('hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors', isExpanded && 'bg-muted/30 dark:bg-zinc-800/50')}>
                            {/* Karyawan & NIK */}
                            <TableCell className="py-3">
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  name={row.user.full_name || row.user.username || 'User'}
                                  url={row.user.avatar_url}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-foreground truncate">
                                    {row.user.full_name || row.user.username || 'Tanpa Nama'}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {row.user.employee_code && (
                                      <span className="font-mono text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded">
                                        {row.user.employee_code}
                                      </span>
                                    )}
                                    {row.user.job_title && (
                                      <span className="text-[11px] text-muted-foreground truncate">{row.user.job_title}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Perusahaan & Dept */}
                            <TableCell className="text-xs">
                              <div className="font-medium text-foreground truncate">{row.user.company || 'GESIT'}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{row.user.department || '-'}</div>
                            </TableCell>

                            {/* Status Kerja */}
                            <TableCell className="text-center">
                              {renderEmploymentBadge(row.user.employment_type)}
                            </TableCell>

                            {/* Tingkat Kehadiran Bar */}
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-bold tabular-nums text-foreground">{userRate}%</span>
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      userRate >= 80 ? 'bg-emerald-500' : userRate >= 50 ? 'bg-amber-500' : userRate > 0 ? 'bg-rose-500' : 'bg-muted-foreground/30'
                                    )}
                                    style={{ width: `${userRate}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* Hadir */}
                            <TableCell className="text-center">
                              {row.present > 0 ? (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 tabular-nums text-xs font-bold">
                                  {row.present}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Terlambat */}
                            <TableCell className="text-center">
                              {row.late > 0 ? (
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 tabular-nums text-xs font-bold">
                                  {row.late}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Tanpa Log */}
                            <TableCell className="text-center">
                              {row.missing > 0 ? (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 tabular-nums text-xs font-bold">
                                  {row.missing}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Cuti / Izin */}
                            <TableCell className="text-center">
                              {row.leave > 0 ? (
                                <Badge variant="outline" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 tabular-nums text-xs font-bold">
                                  {row.leave}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/40 tabular-nums">0</span>
                              )}
                            </TableCell>

                            {/* Total Hari */}
                            <TableCell className="text-center tabular-nums text-xs font-semibold text-muted-foreground">
                              {userTotalDays}
                            </TableCell>

                            {/* Jam Kerja */}
                            <TableCell className="text-center tabular-nums text-xs font-bold text-foreground">
                              {formatMinutes(row.totalWork)}
                            </TableCell>

                            {/* Lembur */}
                            <TableCell className="text-center tabular-nums text-xs">
                              {row.totalOT > 0 ? (
                                <span className="font-bold text-blue-500">{formatMinutes(row.totalOT)}</span>
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                            </TableCell>

                            {/* Detail Button */}
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedUserId(isExpanded ? null : String(row.user.id))}
                                className={cn(
                                   'h-7 gap-1 px-2.5 text-xs font-semibold rounded-lg transition-colors',
                                  isExpanded
                                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground hover:bg-primary/90'
                                    : 'bg-muted/40 text-foreground hover:bg-muted'
                                )}
                              >
                                <span>{dayLogs.length} Log</span>
                                <ChevronDown size={13} className={cn('transition-transform duration-200', isExpanded && 'rotate-180')} />
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Drawer: Log Harian Karyawan */}
                          {isExpanded && (
                            <TableRow className="border-b border-border/30 bg-muted/20 dark:bg-zinc-950/40">
                              <TableCell colSpan={12} className="p-3 sm:p-4">
                                <div className="overflow-hidden rounded-xl border border-border/50 dark:border-zinc-800 bg-card/60 dark:bg-zinc-950/70 shadow-2xs">
                                  {/* Banner */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-muted/40 dark:bg-zinc-900/60 px-4 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <UserAvatar
                                        name={row.user.full_name || row.user.username || 'User'}
                                        url={row.user.avatar_url}
                                        size="xs"
                                      />
                                      <span className="text-xs font-bold text-foreground">
                                        Riwayat Absensi: {row.user.full_name || row.user.username}
                                      </span>
                                      <Badge variant="secondary" className="text-[10px] font-semibold">
                                        {dayLogs.length} Hari Tercatat
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      <span>Total Efektif: <strong className="font-bold text-foreground">{formatMinutes(row.totalWork)}</strong></span>
                                      {row.totalOT > 0 && <span>Lembur: <strong className="font-bold text-blue-500">{formatMinutes(row.totalOT)}</strong></span>}
                                    </div>
                                  </div>

                                  {/* Sub-table */}
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="hover:bg-transparent bg-muted/20 dark:bg-zinc-900/40">
                                          <TableHead className="text-[10px] uppercase font-semibold">Tanggal</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Bukti Foto</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Clock In</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Clock Out</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lokasi Masuk</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lokasi Pulang</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Durasi</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Lembur</TableHead>
                                          <TableHead className="text-[10px] uppercase font-semibold">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {dayLogs.length === 0 ? (
                                          <TableRow>
                                            <TableCell colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                                              Belum ada riwayat absensi untuk karyawan ini pada periode yang dipilih
                                            </TableCell>
                                          </TableRow>
                                        ) : (
                                          dayLogs.map((r, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30 dark:hover:bg-zinc-900/30">
                                              <TableCell className="text-xs font-semibold text-foreground">
                                                {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                              </TableCell>
                                              <TableCell>
                                                {r.photo_url ? (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setViewAttendancePhoto(r.photo_url || null); }}
                                                    className="group relative block h-10 w-14 overflow-hidden rounded-lg border border-border/60 bg-muted shadow-2xs hover:border-primary transition-all"
                                                  >
                                                    <img src={r.photo_url} alt="Bukti absensi" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110" />
                                                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[8px] font-bold text-white">Lihat</span>
                                                  </button>
                                                ) : (
                                                  <span className="text-[11px] text-muted-foreground/60 italic">Tidak ada foto</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-medium text-foreground">
                                                {r.clock_in ? (
                                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <Sunrise size={11} /> {formatTime(r.clock_in)}
                                                  </span>
                                                ) : '-'}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-medium text-foreground">
                                                {r.clock_out ? (
                                                  <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                                    <Sunset size={11} /> {formatTime(r.clock_out)}
                                                  </span>
                                                ) : (
                                                  <span className="text-muted-foreground/60 text-[11px]">Belum pul</span>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                <div className="font-medium text-foreground">{r.clock_in_office_name || 'Lokasi belum tercatat'}</div>
                                                {mapsLink(r.clock_in_lat, r.clock_in_lng) && (
                                                  <a
                                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-500 hover:underline"
                                                    href={mapsLink(r.clock_in_lat, r.clock_in_lng)!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    <MapPin size={10} /> Titik GPS
                                                  </a>
                                                )}
                                              </TableCell>
                                              <TableCell className="text-xs text-muted-foreground">
                                                <div className="font-medium text-foreground">{r.clock_out_office_name || 'Lokasi belum tercatat'}</div>
                                                {mapsLink(r.clock_out_lat, r.clock_out_lng) && (
                                                  <a
                                                    className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-500 hover:underline"
                                                    href={mapsLink(r.clock_out_lat, r.clock_out_lng)!}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                  >
                                                    <MapPin size={10} /> Titik GPS
                                                  </a>
                                                )}
                                              </TableCell>
                                              <TableCell className="tabular-nums text-xs font-semibold text-foreground">
                                                {formatMinutes(r.total_work_minutes)}
                                              </TableCell>
                                              <TableCell className={cn('tabular-nums text-xs', r.total_overtime_minutes ? 'font-bold text-blue-500' : 'text-muted-foreground/50')}>
                                                {formatMinutes(r.total_overtime_minutes)}
                                              </TableCell>
                                              <TableCell>{renderStatusBadge(r.status)}</TableCell>
                                            </TableRow>
                                          ))
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIEW 2: LOG HARIAN LENGKAP (Standardized Card Data Table) */}
      {reportTab === 'logs' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                Seluruh Log Harian Terverifikasi
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                Kronologis presensi dari {reportStart} s/d {reportEnd}
              </p>
            </div>

            {/* Quick Status Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua Status' },
                { id: 'present', label: 'Hadir' },
                { id: 'late', label: 'Terlambat' },
                { id: 'leave', label: 'Cuti / Izin' },
                { id: 'absent', label: 'Absen' },
              ].map(st => {
                const isActive = reportLogStatus === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setReportLogStatus(st.id)}
                    className={cn(
                      'px-2.5 py-1 text-xs font-semibold rounded-md transition-all',
                      isActive
                        ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                        : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                    )}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {filteredDailyRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
                  <FileText size={40} className="text-muted-foreground/40" />
                  <p className="text-sm font-semibold text-foreground">Tidak ada log absensi ditemukan</p>
                  <p className="text-xs text-muted-foreground">Silakan ubah rentang tanggal atau filter status absensi</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[140px]">Tanggal</TableHead>
                      <TableHead>Karyawan</TableHead>
                      <TableHead className="text-center">Clock In</TableHead>
                      <TableHead className="text-center">Clock Out</TableHead>
                      <TableHead className="text-center">Durasi</TableHead>
                      <TableHead className="text-center">Lembur</TableHead>
                      <TableHead>Lokasi Presensi</TableHead>
                      <TableHead className="text-center">Bukti Foto</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDailyRecords.map((r, idx) => {
                      const u = userMap.get(String(r.user_id));
                      return (
                        <TableRow key={r.id || idx} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                          <TableCell className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={u?.full_name || u?.username || 'User'}
                                url={u?.avatar_url}
                                size="sm"
                              />
                              <div>
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <span>{u?.full_name || u?.username || 'Tanpa Nama'}</span>
                                  {u?.employee_code && (
                                    <span className="font-mono text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded">
                                      {u.employee_code}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{u?.company || 'GESIT'} &bull; {u?.department || '-'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium text-foreground">
                            {r.clock_in ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Sunrise size={11} /> {formatTime(r.clock_in)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-medium text-foreground">
                            {r.clock_out ? (
                              <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                <Sunset size={11} /> {formatTime(r.clock_out)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 text-[11px]">Belum pul</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs font-semibold text-foreground">
                            {formatMinutes(r.total_work_minutes)}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-xs">
                            {r.total_overtime_minutes ? (
                              <span className="font-bold text-blue-500">{formatMinutes(r.total_overtime_minutes)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px]">
                            <div className="font-medium text-foreground truncate">{r.clock_in_office_name || 'Lokasi belum tercatat'}</div>
                            {mapsLink(r.clock_in_lat, r.clock_in_lng) && (
                              <a
                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-500 hover:underline"
                                href={mapsLink(r.clock_in_lat, r.clock_in_lng)!}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MapPin size={10} /> Titik GPS
                              </a>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {r.photo_url ? (
                              <button
                                type="button"
                                onClick={() => setViewAttendancePhoto(r.photo_url || null)}
                                className="group relative inline-block h-9 w-12 overflow-hidden rounded-md border border-border/50 bg-muted shadow-2xs hover:border-primary transition-all"
                              >
                                <img src={r.photo_url} alt="Bukti" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-110" />
                                <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[7px] font-bold text-white">Lihat</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {renderStatusBadge(r.status)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );


  return (
    <div className="w-full">
      {renderReport()}
      {viewAttendancePhoto && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewAttendancePhoto(null); }}>
          <DialogContent className="max-w-3xl overflow-hidden rounded-2xl border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 p-2 text-foreground">
            <img src={viewAttendancePhoto} alt="Bukti foto absensi" className="max-h-[78vh] w-full rounded-xl object-contain bg-black/40" />
            <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-muted-foreground">
              <span>Foto bukti absensi dengan watermark GPS</span>
              <a href={viewAttendancePhoto} target="_blank" rel="noreferrer" className="font-bold text-primary dark:text-blue-400 hover:underline">Buka Cloudinary</a>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AttendanceReport;
