import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Clock,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Sun
} from '@/components/ui/icons';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import { CompanyNewsManager } from './CompanyNewsManager';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance, normalizeRequest } from '../../lib/workforceData';
import { jakartaDate, isActiveEmployee, resolveApprovalStatus } from '../../lib/workforce-contract';
import { summarizeEmployee, reportDatePreset } from '../../lib/attendanceSummary';
import { loadHolidayDates } from '../../lib/holidayDates';
import { formatTime, isPendingApprovalStatus } from '../attendance/attendanceTypes';

interface HRDashboardProps {
  currentUser?: any;
}

const DEPT_COLORS = ['#1E3A8A', '#3B82F6', '#F59E0B', '#94A3B8', '#10B981', '#8B5CF6', '#EC4899'];
const AVATAR_COLORS = [
  { bg: '#E0E7FF', text: '#4338CA' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#FEF3C7', text: '#B45309' },
  { bg: '#CCFBF1', text: '#0F766E' },
  { bg: '#F3E8FF', text: '#7E22CE' },
  { bg: '#DBEAFE', text: '#1D4ED8' },
];

const LEAVE_LABELS: Record<string, string> = {
  annual: 'Cuti Tahunan',
  tahunan: 'Cuti Tahunan',
  sick: 'Sakit',
  personal: 'Izin Pribadi',
  maternity: 'Cuti Melahirkan',
  paternity: 'Cuti Ayah',
  unpaid: 'Cuti Tanpa Gaji',
  other: 'Cuti Lainnya',
};

const leaveTypeLabel = (t: any): string => {
  const raw = String(t || '').trim();
  return LEAVE_LABELS[raw.toLowerCase()] || raw || 'Cuti';
};

const initialsOf = (name: string): string =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const avatarColorOf = (name: string) => {
  let h = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const shortDate = (d?: string | null): string =>
  d ? new Date(`${d}T00:00:00+07:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-';

const addDays = (d: string, n: number): string => {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
};

interface PendingItem {
  key: string;
  kind: 'leave' | 'attendance';
  name: string;
  description: string;
  createdAt: string;
}

interface AgendaItem {
  date: string;
  title: string;
  subtitle: string;
  tag: string;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const today = useMemo(() => jakartaDate(), []);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [payrollInfo, setPayrollInfo] = useState<{ total: number; status: string } | null>(null);
  const [activeApprovalTab, setActiveApprovalTab] = useState<'all' | 'leave' | 'attendance'>('all');

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const prev = reportDatePreset('lastMonth', today);
        const agendaEnd = addDays(today, 30);
        const accounts = await loadWorkforceAccounts();
        const byId = new Map<string, any>(accounts.map((u: any) => [String(u.id), u]));

        const [recs, lvs, hols, leavePend, corrPend, reqPend, holRows] = await Promise.all([
          fetchAllRows((from, to) => supabase.from('attendance_records').select('*').gte('date', prev.start).lte('date', today).order('date', { ascending: false }).order('id').range(from, to)),
          fetchAllRows((from, to) => supabase.from('leave_requests').select('*').gte('end_date', prev.start).lte('start_date', agendaEnd).order('id').range(from, to)),
          loadHolidayDates(prev.start, agendaEnd),
          fetchAllRows((from, to) => supabase.from('leave_requests').select('*').order('id', { ascending: false }).range(from, to)),
          fetchAllRows((from, to) => supabase.from('attendance_correction_requests').select('*').order('id', { ascending: false }).range(from, to)),
          fetchAllRows((from, to) => supabase.from('attendance_requests').select('*').order('id', { ascending: false }).range(from, to)),
          (async () => {
            const { data } = await supabase.from('company_holidays').select('*').gte('holiday_date', today).lte('holiday_date', agendaEnd).order('holiday_date');
            return data || [];
          })(),
        ]);

        setUsers(accounts);
        setRecords(recs.map(normalizeAttendance));
        setLeaves(lvs);
        setHolidays(hols);

        // Panel persetujuan: data pengajuan asli yang masih menunggu (semua level hierarki)
        const items: PendingItem[] = [];
        for (const r of leavePend.map(normalizeRequest)) {
          if (!isPendingApprovalStatus(r.status)) continue;
          const u = byId.get(String(r.user_id));
          items.push({
            key: `leave-${r.id}`,
            kind: 'leave',
            name: u?.full_name || 'Karyawan',
            description: `${leaveTypeLabel(r.leave_type)} · ${shortDate(r.start_date)} – ${shortDate(r.end_date)} · ${Number(r.total_days || 1)} hari`,
            createdAt: r.created_at || '',
          });
        }
        for (const r of corrPend.map(normalizeRequest)) {
          if (!isPendingApprovalStatus(r.status)) continue;
          const u = byId.get(String(r.user_id));
          items.push({
            key: `corr-${r.id}`,
            kind: 'attendance',
            name: u?.full_name || 'Karyawan',
            description: `Koreksi absensi · ${shortDate(r.attendance_date || r.date)}`,
            createdAt: r.requested_at || r.created_at || '',
          });
        }
        for (const r of reqPend.map(normalizeRequest)) {
          if (!isPendingApprovalStatus(r.status)) continue;
          const u = byId.get(String(r.user_id));
          items.push({
            key: `req-${r.id}`,
            kind: 'attendance',
            name: u?.full_name || 'Karyawan',
            description: `Dinas luar · ${shortDate(r.request_date || r.start_date)}`,
            createdAt: r.requested_at || r.created_at || '',
          });
        }
        items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        setPendingItems(items);

        // Agenda: hari libur perusahaan + karyawan yang mulai cuti (sudah disetujui), 30 hari ke depan
        const agenda: AgendaItem[] = [];
        for (const h of holRows as any[]) {
          agenda.push({
            date: h.holiday_date,
            title: h.holiday_name || h.name || 'Hari Libur',
            subtitle: h.holiday_type === 'national_holiday' ? 'Hari libur nasional' : 'Hari libur perusahaan',
            tag: 'Libur',
          });
        }
        for (const l of lvs as any[]) {
          if (resolveApprovalStatus(l) !== 'approved') continue;
          if (l.start_date > today && l.start_date <= agendaEnd) {
            const u = byId.get(String(l.user_id));
            agenda.push({
              date: l.start_date,
              title: `Mulai cuti · ${u?.full_name || 'Karyawan'}`,
              subtitle: `${leaveTypeLabel(l.leave_type)} · ${Number(l.total_days || 1)} hari`,
              tag: 'Cuti',
            });
          }
        }
        agenda.sort((a, b) => a.date.localeCompare(b.date));
        setAgendaItems(agenda.slice(0, 4));

        // Payroll: baca hasil perhitungan tersimpan dari menu Payroll (kunci localStorage yang sama)
        try {
          const now = new Date();
          const saved = localStorage.getItem(`gesit_payroll_${now.getFullYear()}_${now.getMonth()}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const items = parsed.items || [];
            if (items.length) {
              setPayrollInfo({
                total: items.reduce((s: number, it: any) => s + Number(it.netSalary || 0), 0),
                status: parsed.status || 'Draft',
              });
            }
          }
        } catch { /* abaikan bila cache tidak terbaca */ }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveData();
  }, [today]);

  const activeUsers = useMemo(() => users.filter(isActiveEmployee), [users]);
  const userMap = useMemo(() => new Map<string, any>(users.map(u => [String(u.id), u])), [users]);

  const recordsByUser = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of records) {
      const k = String(r.user_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  }, [records]);

  const leavesByUser = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const l of leaves) {
      const k = String(l.user_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(l);
    }
    return m;
  }, [leaves]);

  // Persentase kehadiran agregat satu rentang tanggal — rumus yang sama dengan lib/attendanceSummary
  const aggregateRate = (start: string, end: string): number | null => {
    let attended = 0, scheduled = 0, leaveDays = 0;
    for (const u of activeUsers) {
      const s = summarizeEmployee(u, recordsByUser.get(String(u.id)) || [], leavesByUser.get(String(u.id)) || [], start, end, holidays, today);
      attended += s.attendedDays;
      scheduled += s.scheduledDays;
      leaveDays += s.leave;
    }
    return scheduled > 0 ? Math.round(((attended + leaveDays) / scheduled) * 1000) / 10 : null;
  };

  const monthStart = `${today.slice(0, 7)}-01`;
  const prevMonth = useMemo(() => reportDatePreset('lastMonth', today), [today]);

  const todayRate = useMemo(() => aggregateRate(today, today), [activeUsers, recordsByUser, leavesByUser, holidays, today]);
  const lastMonthRate = useMemo(() => aggregateRate(prevMonth.start, prevMonth.end), [activeUsers, recordsByUser, leavesByUser, holidays, prevMonth]);
  const thisMonthRate = useMemo(() => aggregateRate(monthStart, today), [activeUsers, recordsByUser, leavesByUser, holidays, monthStart, today]);
  const todayDelta = todayRate !== null && lastMonthRate !== null ? Math.round((todayRate - lastMonthRate) * 10) / 10 : null;

  const trendData = useMemo(() => {
    const buckets: { startDay: number; endDay: number }[] = [
      { startDay: 1, endDay: 7 },
      { startDay: 8, endDay: 14 },
      { startDay: 15, endDay: 21 },
      { startDay: 22, endDay: 28 },
      { startDay: 29, endDay: 31 },
    ];
    const ym = today.slice(0, 7);
    const prevYm = prevMonth.start.slice(0, 7);
    const prevLastDay = Number(prevMonth.end.slice(8, 10));
    return buckets.map((b, i) => {
      const start = `${ym}-${String(b.startDay).padStart(2, '0')}`;
      const end = `${ym}-${String(b.endDay).padStart(2, '0')}`;
      const pStart = `${prevYm}-${String(b.startDay).padStart(2, '0')}`;
      const pEnd = `${prevYm}-${String(Math.min(b.endDay, prevLastDay)).padStart(2, '0')}`;
      return {
        name: `Minggu ${i + 1}`,
        bulanIni: start > today ? null : aggregateRate(start, end > today ? today : end),
        bulanLalu: b.startDay > prevLastDay ? null : aggregateRate(pStart, pEnd),
      };
    });
  }, [activeUsers, recordsByUser, leavesByUser, holidays, today, prevMonth]);

  const newThisMonth = useMemo(
    () => activeUsers.filter(u => String(u.created_at || '').slice(0, 7) === today.slice(0, 7)).length,
    [activeUsers, today]
  );

  const composition = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of activeUsers) {
      const dept = String(u.department || '').trim() || 'Lainnya';
      counts.set(dept, (counts.get(dept) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 4).map(([name, count], i) => ({ name, count, color: DEPT_COLORS[i] }));
    const rest = sorted.slice(4).reduce((s, [, c]) => s + c, 0);
    if (rest > 0) top.push({ name: 'Lainnya', count: rest, color: DEPT_COLORS[4] });
    return top;
  }, [activeUsers]);

  const leaveToday = useMemo(() => {
    const seen = new Set<string>();
    let annual = 0, other = 0;
    for (const l of leaves as any[]) {
      if (resolveApprovalStatus(l) !== 'approved') continue;
      if (l.start_date <= today && l.end_date >= today && !seen.has(String(l.user_id))) {
        seen.add(String(l.user_id));
        if (/tahunan|annual/i.test(String(l.leave_type || ''))) annual++;
        else other++;
      }
    }
    return { total: seen.size, annual, other };
  }, [leaves, today]);

  const todayActivities = useMemo(() => {
    return records
      .filter(r => r.date === today && r.clock_in)
      .sort((a, b) => String(b.clock_in).localeCompare(String(a.clock_in)))
      .slice(0, 6)
      .map(r => {
        const u = userMap.get(String(r.user_id));
        return {
          id: r.id,
          name: u?.full_name || 'Karyawan',
          department: u?.department || '-',
          time: formatTime(r.clock_in),
          late: r.status === 'late',
        };
      });
  }, [records, today, userMap]);

  const checkedInToday = useMemo(() => records.filter(r => r.date === today && r.clock_in).length, [records, today]);

  const filteredPendingList = pendingItems.filter(item => {
    if (activeApprovalTab === 'all') return true;
    return item.kind === activeApprovalTab;
  });

  const greeting = useMemo(() => {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()));
    if (hour >= 4 && hour < 11) return 'Selamat pagi';
    if (hour >= 11 && hour < 15) return 'Selamat siang';
    if (hour >= 15 && hour < 19) return 'Selamat sore';
    return 'Selamat malam';
  }, []);

  const displayName = currentUser?.fullName || currentUser?.full_name || currentUser?.name || currentUser?.username || 'Admin';
  const firstName = String(displayName).split(/\s+/)[0];
  const monthYearLabel = new Date(`${today}T00:00:00+07:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const todayFullLabel = new Date(`${today}T00:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

  const fmtRate = (v: number | null) => (v === null ? '–' : v.toFixed(1).replace('.', ','));
  const payrollDisplay = (() => {
    if (!payrollInfo) return null;
    const v = payrollInfo.total;
    if (v >= 1_000_000_000) return { value: (v / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 }), unit: 'M' };
    if (v >= 1_000_000) return { value: String(Math.round(v / 1_000_000)), unit: 'jt' };
    return { value: v.toLocaleString('id-ID'), unit: '' };
  })();

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Top Greeting & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
            Your people, at a glance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl flex items-center gap-2">
            {greeting}, {firstName} <Sun className="h-6 w-6 text-amber-500 fill-amber-500" />
          </h1>
          <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
            Awali hari dengan gambaran yang jelas tentang tim Anda.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] shadow-2xs hover:bg-[#F8FAFC] transition-colors">
            <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
            <span>{monthYearLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
          </button>
        </div>
      </div>

      {/* Featured Notification / People Operations Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#12346a] to-[#0d2650] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-white/90 backdrop-blur-xs">
              People Operations
            </div>
            <h2 className="text-lg font-bold text-white sm:text-xl">
              Tim yang hebat dimulai dari perhatian kecil.
            </h2>
            <p className="text-xs text-white/80 sm:text-sm">
              {loading
                ? 'Memuat data terbaru tim Anda…'
                : pendingItems.length > 0
                  ? `Ada ${pendingItems.length} pengajuan menunggu tinjauan Anda. Mari bantu tim melangkah lebih lancar.`
                  : 'Tidak ada pengajuan yang menunggu saat ini. Semua sudah beres.'}
            </p>
          </div>

          <button
            onClick={() => navigate('/requests')}
            className="inline-flex items-center gap-2 self-start rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-white/20 transition-all sm:self-center"
          >
            <span>Tinjau pengajuan</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Karyawan */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium text-[#64748B]">Total karyawan</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{loading ? '–' : activeUsers.length}</span>
            <span className="text-xs font-medium text-[#64748B]">orang</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {newThisMonth > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
                <span>+{newThisMonth}</span>
                <span>karyawan baru bulan ini</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#64748B]">Karyawan aktif terdaftar</span>
            )}
          </div>
        </div>

        {/* Card 2: Kehadiran Hari Ini */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium text-[#64748B]">Kehadiran hari ini</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF5] text-[#059669]">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{loading ? '–' : fmtRate(todayRate)}</span>
            <span className="text-xs font-bold text-[#64748B]">%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            {todayDelta !== null ? (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${todayDelta >= 0 ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFF1F2] text-[#E11D48]'}`}>
                {todayDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(todayDelta).toFixed(1).replace('.', ',')} poin vs rata-rata bulan lalu</span>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#64748B]">{todayRate === null && !loading ? 'Tidak ada jadwal kerja hari ini' : `${checkedInToday} karyawan sudah presensi`}</span>
            )}
          </div>
        </div>

        {/* Card 3: Cuti & Izin Hari Ini */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium text-[#64748B]">Cuti & Izin hari ini</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{loading ? '–' : leaveToday.total}</span>
            <span className="text-xs font-medium text-[#64748B]">orang</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-[#64748B]">
            {leaveToday.total > 0 ? (
              <>
                <span>{leaveToday.annual} cuti tahunan</span>
                <span>·</span>
                <span>{leaveToday.other} izin/sakit/lainnya</span>
              </>
            ) : (
              <span>Tidak ada yang cuti hari ini</span>
            )}
          </div>
        </div>

        {/* Card 4: Payroll Bulan Ini */}
        <div
          onClick={() => navigate('/payroll')}
          className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs transition-colors hover:bg-[#F8FAFC]"
          title="Buka menu Payroll"
        >
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium text-[#64748B]">Payroll bulan ini</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            {payrollDisplay ? (
              <>
                <span className="text-sm font-bold text-[#64748B]">Rp</span>
                <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{payrollDisplay.value}</span>
                <span className="text-xs font-bold text-[#64748B]">{payrollDisplay.unit}</span>
              </>
            ) : (
              <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">–</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px]">
            {payrollInfo ? (
              <>
                <span className={`rounded px-1.5 py-0.5 font-bold ${payrollInfo.status === 'Paid' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : payrollInfo.status === 'Approved' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                  {payrollInfo.status}
                </span>
                <span className="text-[#64748B]">Total bersih · {monthYearLabel}</span>
              </>
            ) : (
              <span className="text-[#64748B]">Belum dihitung — klik untuk membuka Payroll</span>
            )}
          </div>
        </div>
      </div>

      {/* Analytic Section: Tren Kehadiran & Komposisi Karyawan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Tren Kehadiran (2/3 width) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xs lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Tren kehadiran</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">Ringkasan kehadiran · {monthYearLabel}</p>
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors">
              <span>Mingguan</span>
              <ChevronDown className="h-3 w-3 text-[#64748B]" />
            </button>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-end gap-5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-[#475569]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
              <span>Bulan ini</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-[#475569]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D97706]" />
              <span>Bulan lalu</span>
            </div>
          </div>

          {/* Area Chart */}
          <div className="mt-3 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBulanIni" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tick={{ fill: '#64748B', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11 }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, '']}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="bulanIni"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorBulanIni)"
                  connectNulls
                />
                <Area
                  type="monotone"
                  dataKey="bulanLalu"
                  stroke="#D97706"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="transparent"
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Footer Bar */}
          <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-xs">
            <span className="text-[#64748B]">
              Rata-rata kehadiran bulan ini: <strong className="font-semibold text-[#0F172A]">{loading ? '–' : `${fmtRate(thisMonthRate)}%`}</strong>
            </span>
            {lastMonthRate !== null && (
              <span className="text-[#64748B]">
                Bulan lalu: <strong className="font-semibold text-[#0F172A]">{fmtRate(lastMonthRate)}%</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Komposisi Karyawan (1/3 width) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Komposisi karyawan</h3>
              <p className="mt-0.5 text-xs text-[#64748B]">Distribusi berdasarkan departemen</p>
            </div>
            <button
              onClick={() => navigate('/employees')}
              className="text-[#94A3B8] hover:text-[#0F172A] transition-colors"
              title="Lihat semua karyawan"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Donut Chart & Legend */}
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Donut with Center Count */}
            <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={composition}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {composition.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-[#0F172A]">{loading ? '–' : activeUsers.length}</span>
                <span className="text-[10px] text-[#64748B]">Total karyawan</span>
              </div>
            </div>

            {/* Department Breakdown List */}
            <div className="flex-1 space-y-2.5 text-xs">
              {composition.length === 0 && !loading && (
                <div className="text-[#64748B]">Belum ada data departemen</div>
              )}
              {composition.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-[#475569]">{dept.name}</span>
                  </div>
                  <span className="font-bold text-[#0F172A]">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlight Badge */}
          <div className="mt-6 border-t border-[#F1F5F9] pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#059669]">
              <span>{newThisMonth > 0 ? `+${newThisMonth} karyawan baru bergabung bulan ini` : `${composition.length} departemen aktif`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Menunggu Persetujuan & Agenda Mendatang */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Menunggu Persetujuan (2/3 width) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xs lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A]">Menunggu persetujuan</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                {pendingItems.length}
              </span>
            </div>
            <button
              onClick={() => navigate('/requests')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#12346a] hover:text-[#2563EB] transition-colors"
            >
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex items-center gap-6 border-b border-[#F1F5F9] text-xs font-medium">
            <button
              onClick={() => setActiveApprovalTab('all')}
              className={`pb-2.5 transition-colors ${
                activeApprovalTab === 'all'
                  ? 'border-b-2 border-amber-500 font-bold text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Semua pengajuan
            </button>
            <button
              onClick={() => setActiveApprovalTab('leave')}
              className={`pb-2.5 transition-colors ${
                activeApprovalTab === 'leave'
                  ? 'border-b-2 border-amber-500 font-bold text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cuti & Izin
            </button>
            <button
              onClick={() => setActiveApprovalTab('attendance')}
              className={`pb-2.5 transition-colors ${
                activeApprovalTab === 'attendance'
                  ? 'border-b-2 border-amber-500 font-bold text-[#0F172A]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Absensi
            </button>
          </div>

          {/* List of Pending Requests — data asli; keputusan diambil di halaman Requests agar hierarki approval tetap satu pintu */}
          <div className="mt-4 divide-y divide-[#F1F5F9]">
            {loading ? (
              <div className="py-6 text-center text-xs text-[#64748B]">Memuat pengajuan…</div>
            ) : filteredPendingList.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#64748B]">Tidak ada pengajuan menunggu saat ini.</div>
            ) : (
              filteredPendingList.slice(0, 5).map((item) => {
                const color = avatarColorOf(item.name);
                return (
                  <div key={item.key} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1">
                    {/* User & Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {initialsOf(item.name)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">{item.name}</div>
                        <div className="text-[11px] text-[#64748B]">{item.description}</div>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Menunggu
                      </span>
                      <button
                        onClick={() => navigate('/requests')}
                        className="inline-flex items-center gap-0.5 rounded-lg border border-[#E2E8F0] px-2 py-1 text-[11px] font-semibold text-[#12346a] hover:bg-[#F8FAFC] transition-colors"
                        title="Tinjau & putuskan di halaman Requests"
                      >
                        Tinjau
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Agenda Mendatang (1/3 width) */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0F172A]">Agenda mendatang</h3>
            <button
              onClick={() => navigate('/calendar')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#12346a] hover:text-[#2563EB] transition-colors"
            >
              <span>Lihat agenda</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Agenda List */}
          <div className="mt-5 space-y-4">
            {loading ? (
              <div className="py-4 text-center text-xs text-[#64748B]">Memuat agenda…</div>
            ) : agendaItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#64748B]">Belum ada agenda dalam 30 hari ke depan.</div>
            ) : (
              agendaItems.map((item, idx) => {
                const d = new Date(`${item.date}T00:00:00+07:00`);
                const monthShort = d.toLocaleDateString('id-ID', { month: 'short', timeZone: 'Asia/Jakarta' }).replace('.', '');
                const dayNum = d.toLocaleDateString('id-ID', { day: 'numeric', timeZone: 'Asia/Jakarta' });
                return (
                  <div key={`${item.date}-${idx}`} className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                      <span className="text-[9px] font-bold uppercase text-[#94A3B8]">{monthShort}</span>
                      <span className="text-base font-extrabold text-[#0F172A]">{dayNum}</span>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="text-xs font-bold text-[#0F172A]">{item.title}</div>
                      <div className="text-[11px] text-[#64748B]">{item.subtitle}</div>
                      <span className="inline-block rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                        {item.tag}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* News & Pengumuman Karyawan (Tampil di Mobile App Absen) */}
      <CompanyNewsManager currentUser={currentUser} />

      {/* Row 3: Aktivitas Absensi Hari Ini */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-2xs">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Aktivitas absensi hari ini</h3>
            <p className="mt-0.5 text-xs text-[#64748B]">{todayFullLabel} · {checkedInToday} karyawan sudah presensi</p>
          </div>
          <button
            onClick={() => navigate('/attendance')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#12346a] hover:text-[#2563EB] transition-colors"
          >
            <span>Lihat semua</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1F5F9] text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                <th className="pb-3 font-semibold">Karyawan</th>
                <th className="pb-3 font-semibold">Departemen</th>
                <th className="pb-3 font-semibold">Check-In</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {todayActivities.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#64748B]">
                    {loading ? 'Memuat presensi…' : 'Belum ada presensi tercatat hari ini.'}
                  </td>
                </tr>
              ) : (
                todayActivities.map((row) => {
                  const color = avatarColorOf(row.name);
                  return (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                            style={{ backgroundColor: color.bg, color: color.text }}
                          >
                            {initialsOf(row.name)}
                          </div>
                          <span className="font-semibold text-[#0F172A]">{row.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-[#64748B]">{row.department}</td>
                      <td className="py-3 font-medium text-[#0F172A]">{row.time}</td>
                      <td className="py-3">
                        {row.late ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                            Terlambat
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Tepat Waktu
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
