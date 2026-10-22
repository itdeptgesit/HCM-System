import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, Bell, CalendarDays, Clock, ContactRound, FileText,
  FileWarning, Home, Lock, Mail, MapPin, MessageCircle, Phone, Plus, Radar, Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { isActiveEmployee, jakartaDate, requestApprovalLevel, resolveApprovalStatus } from '../../lib/workforce-contract';
import { loadHolidayDates } from '../../lib/holidayDates';

/**
 * EmployeeInformation — halaman profil karyawan bergaya "ElevateX"
 * (satu jendela membulat di atas gradasi pastel, statistik tanpa kotak,
 * rail ikon navy, panel profil blush).
 *
 * Menu di top bar & rail mengikuti modul HCM yang sebenarnya
 * (Dashboard, Data Karyawan, Absensi + submenunya, Pengajuan & Approval,
 * Catatan SP, News, Analitik, Pengaturan) dan menaut ke route aslinya.
 *
 * Data diambil dari sumber yang sama dengan HRDashboard
 * (user_accounts, attendance_records, leave_requests,
 * attendance_correction_requests, company_holidays). Bila data belum
 * tersedia (mis. preview tanpa koneksi), halaman jatuh ke data contoh
 * agar tampilannya tetap bisa dinilai.
 */

// ---------------------------------------------------------------------------
// Data contoh (fallback preview)
// ---------------------------------------------------------------------------
const DEMO = {
  activeCount: 72,
  entityCount: 16,
  pendingCount: 3,
  monthRate: 94,
  funnelTotal: 12,
  funnel: [12, 5, 3, 2],
  subject: {
    id: 'demo', full_name: 'Sinta Maharani', job_title: 'Staff HR & Logistics',
    company: 'PT Gesit Perkasa', department: 'HR & Logistics',
    email: 'sinta.maharani@gesit.co.id', phone: '+62 812-3456-7890',
    employee_code: 'GS-0142', employment_status: 'PKWTT', status: 'PKWTT',
    join_date: '2021-03-15', avatar_url: '',
  } as any,
  cards: [
    { date: 'Oct 22', title: 'Clock-in Tepat Waktu — Kantor Pusat', big: '08:44', tone: 'blue', meta: '' },
    { date: 'Oct 21', title: 'Cuti Tahunan Disetujui Supervisor & HR', big: '2 hari', tone: 'teal', meta: '' },
    { date: 'Oct 20', title: 'Dinas Luar — Live Attendance Berhasil', big: '', tone: 'dark', meta: 'Jakarta • Client Visit' },
    { date: 'Oct 18', title: 'Lembur Disetujui — Proyek IT', big: '3 jam', tone: 'yellow', meta: '' },
    { date: 'Oct 16', title: 'Koreksi Presensi — Lupa Clock-out', big: '', tone: 'white', meta: 'Selesai • Diverifikasi HR' },
    { date: 'Oct 15', title: 'Renewal Kontrak PKWT — Annual Review', big: '17 Nov', tone: 'white', meta: '' },
  ] as ActivityCard[],
};

type ActivityCard = { date: string; title: string; big: string; tone: string; meta: string };

const TONE: Record<string, string> = {
  blue: 'bg-gradient-to-br from-[#2e6be6] to-[#1f4fc4] text-white',
  teal: 'bg-gradient-to-br from-[#18b79b] to-[#0a9484] text-white',
  dark: 'bg-[#12161d] text-white',
  yellow: 'bg-[#ffd234] text-[#241c00]',
  white: 'bg-white dark:bg-zinc-900 border-[1.5px] border-[#e7eef5] dark:border-zinc-800 text-[#101c2e] dark:text-zinc-100',
};

const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—';
}
function fmtDateShort(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDayMonth(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? '—' : `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}
function fmtTime(ts?: string | null) {
  if (!ts) return '—';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', ':');
}
function leaveTypeLabel(raw?: string) {
  const t = String(raw || '').toLowerCase();
  if (/tahunan|annual/.test(t)) return 'Cuti Tahunan';
  if (/sakit|sick/.test(t)) return 'Izin Sakit';
  if (/melahir|matern/.test(t)) return 'Cuti Melahirkan';
  if (/penting|emergency/.test(t)) return 'Cuti Alasan Penting';
  if (/izin|permission/.test(t)) return 'Izin';
  return raw ? String(raw) : 'Cuti';
}
function isServiceAccount(a: any) {
  const n = String(a?.full_name || '').toLowerCase();
  return n.includes('muse') || n.includes('hr-admin') || n.includes('hr admin') || n.includes('bot');
}

// ---------------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------------
export function EmployeeInformation({ currentUser }: { currentUser: any }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<Set<string>>(new Set());
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = jakartaDate();
  const [ty, tm] = today.split('-').map(Number);
  const monthStart = `${ty}-${String(tm).padStart(2, '0')}-01`;
  const monthEnd = new Date(ty, tm, 0).toISOString().slice(0, 10);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [accs, reqs, atts, cors, hols] = await Promise.all([
          loadWorkforceAccounts(),
          fetchAllRows((f, t) => supabase.from('leave_requests').select('*').order('id', { ascending: false }).range(f, t)),
          fetchAllRows((f, t) => supabase.from('attendance_records').select('*').gte('date', monthStart).lte('date', today).order('date', { ascending: false }).order('id').range(f, t)),
          fetchAllRows((f, t) => supabase.from('attendance_correction_requests').select('*').order('id', { ascending: false }).range(f, t)),
          loadHolidayDates(monthStart, monthEnd).catch(() => new Set<string>()),
        ]);
        if (!alive) return;
        if (!accs.length) { setDemo(true); return; }
        setAccounts(accs);
        setRequests(reqs);
        setAttendance(atts.map(normalizeAttendance));
        setCorrections(cors);
        setHolidays(hols);
      } catch {
        if (alive) setDemo(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const employees = useMemo(
    () => accounts.filter(a => isActiveEmployee(a)).sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''))),
    [accounts],
  );

  const subject = useMemo(() => {
    if (demo) return DEMO.subject;
    const byId = employees.find(e => String(e.id) === String(searchParams.get('id') || ''));
    return byId || employees.find(e => !isServiceAccount(e)) || employees[0] || null;
  }, [demo, employees, searchParams]);

  const stats = useMemo(() => {
    if (demo) return DEMO;
    const active = employees.length;
    const entities = new Set(employees.map(e => String(e.company || '—'))).size;
    const pending = requests.filter(r => resolveApprovalStatus(r).startsWith('pending')).length;
    // Tingkat kehadiran bulan berjalan: record hadir/terlambat / (karyawan × hari kerja berlalu)
    let weekdays = 0;
    for (let d = new Date(`${monthStart}T00:00:00`); d <= new Date(`${today}T00:00:00`); d.setDate(d.getDate() + 1)) {
      const wd = d.getDay();
      if (wd >= 1 && wd <= 5) weekdays++;
    }
    const presentish = attendance.filter(a => ['present', 'late', 'half_day'].includes(String(a.status))).length;
    const denom = Math.max(active * weekdays, 1);
    const rate = Math.min(100, Math.round((presentish / denom) * 100));
    const funnel = [0, 0, 0, 0];
    let total = 0;
    for (const r of requests) {
      if (!resolveApprovalStatus(r).startsWith('pending')) continue;
      const lvl = requestApprovalLevel(r);
      total++;
      if (lvl >= 1 && lvl <= 4) funnel[lvl - 1]++;
    }
    return { activeCount: active, entityCount: entities, pendingCount: pending, monthRate: rate, funnelTotal: total, funnel };
  }, [demo, employees, requests, attendance, monthStart, today]);

  const cards: ActivityCard[] = useMemo(() => {
    if (demo) return DEMO.cards;
    if (!subject) return [];
    const sid = String(subject.id);
    const out: (ActivityCard & { _d: string })[] = [];
    for (const a of attendance.filter(x => String(x.user_id) === sid).slice(0, 8)) {
      const st = String(a.status || 'present');
      const wm = String(a.work_mode || '').toLowerCase();
      if (wm && wm !== 'wfo') {
        out.push({ _d: a.date, date: fmtDayMonth(a.date), title: `Live Attendance — ${wm === 'wfh' ? 'WFH' : 'Dinas Luar'}`, big: '', tone: 'dark', meta: `${fmtTime(a.clock_in)} • ${resolveApprovalStatus(a).startsWith('pending') ? 'Menunggu approval' : 'Tercatat'}` });
      } else if (st === 'present') {
        out.push({ _d: a.date, date: fmtDayMonth(a.date), title: 'Clock-in Tepat Waktu', big: fmtTime(a.clock_in), tone: 'blue', meta: '' });
      } else if (st === 'late') {
        out.push({ _d: a.date, date: fmtDayMonth(a.date), title: 'Clock-in Terlambat', big: fmtTime(a.clock_in), tone: 'yellow', meta: '' });
      } else if (st === 'leave') {
        out.push({ _d: a.date, date: fmtDayMonth(a.date), title: 'Cuti / Izin Tercatat', big: '', tone: 'teal', meta: 'Tidak hadir — cuti/izin' });
      } else if (st === 'sick') {
        out.push({ _d: a.date, date: fmtDayMonth(a.date), title: 'Izin Sakit Tercatat', big: '', tone: 'white', meta: '' });
      }
    }
    for (const r of requests.filter(x => String(x.user_id) === sid).slice(0, 4)) {
      const st = resolveApprovalStatus(r);
      out.push({
        _d: r.start_date || r.created_at || '',
        date: fmtDayMonth(r.start_date || r.created_at),
        title: `${leaveTypeLabel(r.leave_type)} — ${st === 'approved' ? 'Disetujui' : st === 'rejected' ? 'Ditolak' : 'Menunggu Approval'}`,
        big: `${Number(r.total_days || 1)} hari`, tone: st === 'approved' ? 'teal' : 'white', meta: '',
      });
    }
    for (const c of corrections.filter(x => String(x.user_id) === sid).slice(0, 3)) {
      out.push({
        _d: c.date || c.created_at || '',
        date: fmtDayMonth(c.date || c.created_at),
        title: 'Koreksi Presensi', big: '', tone: 'white',
        meta: String(c.status || '').toLowerCase() === 'approved' ? 'Selesai • Diverifikasi HR' : 'Menunggu review HR',
      });
    }
    return out.sort((a, b) => String(b._d).localeCompare(String(a._d))).slice(0, 6);
  }, [demo, subject, attendance, requests, corrections]);

  // Kalender bulan berjalan
  const cal = useMemo(() => {
    const year = demo ? 2026 : ty;
    const month = demo ? 9 : tm - 1; // 0-based
    const first = new Date(year, month, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysPrev = new Date(year, month, 0).getDate();
    const cells: { d: number; dim: boolean; iso: string }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
      const dd = daysPrev - i;
      cells.push({ d: dd, dim: true, iso: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ d, dim: false, iso: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
    }
    while (cells.length % 7 !== 0) cells.push({ d: cells.length - daysInMonth - startDow + 1, dim: true, iso: '' });
    return { year, month, cells };
  }, [demo, ty, tm]);

  const contractEndsThisMonth = useMemo(() => {
    if (demo) return 1;
    const prefix = `${ty}-${String(tm).padStart(2, '0')}`;
    return employees.filter(e => String(e.contract_end_date || '').startsWith(prefix)).length;
  }, [demo, employees, ty, tm]);

  const firstName = String(subject?.full_name || '').split(/\s+/)[0] || '—';
  const lastName = String(subject?.full_name || '').split(/\s+/).slice(1).join(' ') || '—';
  const subjectLastAtt = !demo && subject ? attendance.find(a => String(a.user_id) === String(subject.id)) : null;

  const topMenu = [
    { label: 'Dashboard', to: '/' },
    { label: 'Data Karyawan', to: '/employees', active: true },
    { label: 'Absensi', to: '/attendance/report' },
    { label: 'Pengajuan', to: '/requests' },
    { label: 'News', to: '/news' },
    { label: 'Analitik', to: '/analytics' },
    { label: 'Pengaturan', to: '/settings' },
  ];
  const rail = [
    { icon: Home, to: '/', label: 'Dashboard' },
    { icon: Users, to: '/employees', label: 'Data Karyawan', active: true },
    { icon: FileText, to: '/attendance/report', label: 'Report Absensi' },
    { icon: Clock, to: '/attendance/requests', label: 'Request Absen' },
    { icon: MapPin, to: '/attendance/map', label: 'Live GPS Map' },
    { icon: CalendarDays, to: '/attendance/calendar', label: 'Calendar' },
    { icon: Radar, to: '/attendance/locations', label: 'Radius Office' },
  ];
  const funnelLabels = ['Supervisor', 'HR Review', 'Manager', 'VP / Office'];

  return (
    <div className="rounded-[32px] bg-[linear-gradient(120deg,#e6f2ea,#e9f1fd_45%,#fdeee4)] dark:bg-none dark:bg-zinc-950 p-2.5 sm:p-4">
      <div className="mx-auto max-w-[1440px] rounded-[26px] bg-[#fcfeff] dark:bg-[#0c0c0e] shadow-[0_30px_80px_rgba(31,64,110,0.16)] ring-1 ring-slate-900/5 px-5 py-5 sm:px-7 sm:py-6 text-[#101c2e] dark:text-zinc-100">

        {/* ===== Top bar: menu sesuai modul HCM ===== */}
        <header className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 min-w-[180px]">
            <div className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#2e6be6] to-[#15b79a] font-bold text-white text-lg">G</div>
            <div>
              <div className="text-[16px] font-semibold leading-none">Gesit People</div>
              <div className="mt-1 text-[9.5px] tracking-wide text-slate-400">Manage. Connect. Succeed.</div>
            </div>
          </div>
          <nav className="hidden flex-1 flex-wrap justify-center gap-0.5 lg:flex">
            {topMenu.map(m => (
              <NavLink key={m.label} to={m.to}
                className={`rounded-full px-3.5 py-2 text-[13px] font-medium ${m.active ? 'bg-[#0c1526] font-semibold text-white' : 'hover:bg-slate-100 dark:hover:bg-zinc-800'}`}>
                {m.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="relative grid size-[34px] place-items-center rounded-full border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Mail className="size-4" />
            </span>
            <span className="relative grid size-[34px] place-items-center rounded-full border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Bell className="size-4" />
              <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-[#f04438]" />
            </span>
            <span className="grid size-[34px] place-items-center rounded-full bg-gradient-to-br from-amber-500 to-red-500 text-xs font-bold text-white" title={currentUser?.fullName || 'Admin'}>
              {initialsOf(currentUser?.fullName || currentUser?.full_name || 'Admin')}
            </span>
          </div>
        </header>

        {/* ===== Page head + statistik ===== */}
        <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3.5">
            <button onClick={() => navigate(-1)} className="grid size-8 place-items-center rounded-[10px] border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900" aria-label="Kembali">
              <ArrowLeft className="size-4" />
            </button>
            <h1 className="whitespace-nowrap text-[26px] font-semibold tracking-tight">Employee Information</h1>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat icon={<Users className="size-4" />} value={String(stats.activeCount)} chip="+2 bln ini" chipCls="bg-[#e3f7ee] text-[#0a9d6c]" cap={<>Karyawan Aktif dari<br />{stats.entityCount} Entitas Perusahaan</>} />
            <Stat icon={<Clock className="size-4" />} value={`+${stats.pendingCount}`} chip="Menunggu" chipCls="bg-[#fff3cf] text-[#a97b00]" cap={<>Pengajuan Menunggu<br />Persetujuan</>} />
            <Stat icon={<CalendarDays className="size-4" />} value={`${stats.monthRate}%`} chip="Bulan ini" chipCls="bg-[#e6effe] text-[#2e6be6]" cap={<>Tingkat Kehadiran<br />{MONTHS_ID[(demo ? 9 : tm) - 1]} {demo ? 2026 : ty}</>} />
          </div>
        </div>

        {/* ===== Konten ===== */}
        <div className="mt-5 flex items-start gap-5">
          {/* Rail ikon: sub-menu Absensi HCM */}
          <aside className="sticky top-4 hidden w-14 flex-none flex-col items-center gap-2 self-start rounded-full bg-gradient-to-b from-[#0d1d3d] to-[#081226] py-4 shadow-[0_16px_32px_rgba(8,18,38,0.25)] md:flex">
            {rail.map(r => (
              <NavLink key={r.label} to={r.to} title={r.label}
                className={`grid size-[38px] place-items-center rounded-full ${r.active ? 'bg-white text-[#0c1c3a]' : 'text-[#8fa5c4] hover:bg-white/10 hover:text-white'}`}>
                <r.icon className="size-4" />
              </NavLink>
            ))}
            <span className="h-10" />
            <NavLink to="/disciplinary" title="Catatan SP Karyawan" className="grid size-[38px] place-items-center rounded-full text-amber-500 hover:bg-white/10">
              <FileWarning className="size-4" />
            </NavLink>
          </aside>

          {/* Kolom utama */}
          <section className="min-w-0 flex-1">
            <div className="mb-3 text-[13.5px] font-semibold">Interaction History{loading && !demo ? ' — memuat…' : ''}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((c, i) => (
                <div key={i} className={`flex min-h-[122px] flex-col rounded-[18px] p-4 ${TONE[c.tone] || TONE.white}`}>
                  <div className="flex items-center justify-between text-[10.5px] font-semibold tracking-wide opacity-80">
                    <span>{c.date}</span><span>•••</span>
                  </div>
                  <div className="mt-1.5 max-w-[92%] text-sm font-semibold leading-snug">{c.title}</div>
                  <div className="mt-auto flex items-end justify-between pt-2.5">
                    {c.big
                      ? <span className="text-[16.5px] font-bold">{c.big}</span>
                      : <span className="text-[11px] font-medium leading-snug opacity-80">{c.meta}</span>}
                    <span className="flex">
                      <i className="grid size-[26px] place-items-center rounded-full border-2 border-white/80 bg-[#f59e0b] text-[9.5px] font-bold not-italic text-white">{initialsOf(subject?.full_name || 'K')[0]}</i>
                      <i className="-ml-2 grid size-[26px] place-items-center rounded-full border-2 border-white/80 bg-[#2e6be6] text-[9.5px] font-bold not-italic text-white">H</i>
                    </span>
                  </div>
                </div>
              ))}
              {!loading && cards.length === 0 && (
                <div className="rounded-[18px] border-[1.5px] border-dashed border-[#e7eef5] p-4 text-sm text-slate-400">Belum ada aktivitas untuk karyawan ini.</div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.12fr_1fr]">
              {/* Kalender */}
              <div className="rounded-[20px] border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-[18px]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tracking-[5px] text-slate-400">‹ ›</span>
                    <b className="text-[13px] font-semibold">{MONTHS_ID[cal.month]} {cal.year}</b>
                  </div>
                  <span className="text-xs text-slate-400">Tasks Schedule</span>
                </div>
                <div className="grid grid-cols-7 gap-[3px] text-center">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="py-1 text-[10px] font-semibold text-slate-400">{d}</div>)}
                  {cal.cells.map((c, i) => {
                    const isHoliday = !c.dim && holidays.has(c.iso);
                    const isToday = !c.dim && c.iso === today && !demo;
                    const isContract = !c.dim && !!subject?.contract_end_date && c.iso === String(subject.contract_end_date).slice(0, 10);
                    return (
                      <div key={i} className={`relative rounded-[9px] py-[7px] text-[11.5px] font-medium ${
                        c.dim ? 'text-[#c6d2e0]' : isToday ? 'bg-[#15b79a] font-bold text-white' : isContract ? 'bg-[#fdeceb] font-bold text-[#f04438]' : isHoliday ? 'bg-[#fff3cf] font-semibold text-[#a97b00]' : ''}`}>
                        {c.d}
                        {isHoliday && <Lock className="mx-auto mt-0.5 size-[9px]" />}
                        {isContract && <span className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#f04438]" />}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-3.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-[3px] bg-[#15b79a]" />Hari ini</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-[3px] bg-[#ffd234]" />Hari libur</span>
                  <span className="flex items-center gap-1.5"><i className="size-2 rounded-[3px] bg-[#f04438]" />Kontrak berakhir ({contractEndsThisMonth} bln ini)</span>
                </div>
              </div>

              {/* Funnel approval */}
              <div className="rounded-[20px] border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-[18px]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">Approval Funnel</span>
                  <span className="text-xs font-bold tracking-[2px] text-slate-400">•••</span>
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-semibold">{stats.funnelTotal}</div>
                    <div className="mt-0.5 text-[10.5px] text-slate-400">Total Pengajuan Pending</div>
                  </div>
                  <div className="flex gap-0.5 rounded-full bg-[#f4f8fc] dark:bg-zinc-800 p-[3px] text-[10.5px] font-semibold text-slate-400">
                    <span className="rounded-full bg-white dark:bg-zinc-900 px-[11px] py-1 text-[#101c2e] dark:text-zinc-100 shadow">Bulan ini</span>
                    <span className="px-[11px] py-1">Semua</span>
                  </div>
                </div>
                {funnelLabels.map((lbl, i) => (
                  <div key={lbl} className="mt-2.5 flex items-center justify-between rounded-xl bg-[#f4f8fc] dark:bg-zinc-800/70 px-3.5 py-2.5">
                    <span className="text-xs font-medium text-slate-400">{lbl}</span>
                    <span className="flex items-center gap-2 text-[13.5px] font-bold">
                      {stats.funnel[i] ?? 0}
                      <span className="grid size-[21px] place-items-center rounded-full border border-[#e7eef5] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-400"><ArrowUpRight className="size-[10px]" /></span>
                    </span>
                  </div>
                ))}
                <button onClick={() => navigate('/requests')} className="mt-3.5 w-full rounded-xl bg-[#0c1526] py-2.5 text-xs font-semibold text-white hover:opacity-90">
                  Buka Pengajuan &amp; Approval
                </button>
              </div>
            </div>
          </section>

          {/* ===== Panel profil ===== */}
          <aside className="hidden w-[302px] flex-none flex-col gap-4 lg:flex">
            <div className="rounded-[22px] bg-[#fdf0ea] dark:bg-zinc-900 px-5 pb-5 pt-6 text-center">
              {subject?.avatar_url
                ? <img src={subject.avatar_url} alt={subject.full_name} className="mx-auto mb-3 size-[88px] rounded-full border-4 border-white object-cover" />
                : <div className="mx-auto mb-3 grid size-[88px] place-items-center rounded-full border-4 border-white bg-gradient-to-br from-[#2e6be6] to-[#15b79a] text-[27px] font-bold text-white">{initialsOf(subject?.full_name || '—')}</div>}
              <h2 className="text-[19px] font-semibold">{subject?.full_name || '—'}</h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#8a7368] dark:text-zinc-400">{subject?.job_title || '—'}<br />{subject?.company || '—'}</p>
              <div className="mt-4 flex justify-center gap-2">
                <a href={subject?.email ? `mailto:${subject.email}` : undefined} title="Email" className="grid size-[35px] place-items-center rounded-full border border-[#f0ddd2] bg-white text-[#101c2e]"><Mail className="size-3.5" /></a>
                <a href={subject?.phone ? `tel:${subject.phone}` : undefined} title="Telepon" className="grid size-[35px] place-items-center rounded-full border border-[#f0ddd2] bg-white text-[#101c2e]"><Phone className="size-3.5" /></a>
                <span title="Pesan" className="grid size-[35px] cursor-pointer place-items-center rounded-full border border-[#f0ddd2] bg-white text-[#101c2e]"><MessageCircle className="size-3.5" /></span>
                <span title="Tambah catatan" className="grid size-[35px] cursor-pointer place-items-center rounded-full bg-[#0c1526] text-white"><Plus className="size-3.5" /></span>
                <span title="Jadwal" onClick={() => navigate('/attendance/calendar')} className="grid size-[35px] cursor-pointer place-items-center rounded-full border border-[#f0ddd2] bg-white text-[#101c2e]"><CalendarDays className="size-3.5" /></span>
              </div>
              {!demo && employees.length > 1 && (
                <select
                  value={String(subject?.id || '')}
                  onChange={e => setSearchParams({ id: e.target.value })}
                  className="mt-4 w-full rounded-xl border border-[#f0ddd2] bg-white px-3 py-2 text-xs font-medium text-[#101c2e]"
                  aria-label="Pilih karyawan"
                >
                  {employees.map(e => <option key={String(e.id)} value={String(e.id)}>{e.full_name}</option>)}
                </select>
              )}
            </div>

            <div className="rounded-[22px] border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 pb-2.5 pt-[18px]">
              <h4 className="mb-1 flex items-center justify-between text-[13px] font-semibold">Detailed Information <span className="cursor-pointer text-slate-400">✎</span></h4>
              <Field icon={<ContactRound className="size-3.5" />} label="First Name" value={firstName} />
              <Field icon={<ContactRound className="size-3.5" />} label="Last Name" value={lastName} />
              <Field icon={<Mail className="size-3.5" />} label="Email" value={subject?.email || '—'} />
              <Field icon={<Phone className="size-3.5" />} label="Phone Number" value={subject?.phone || subject?.mobile || '—'} />
              <Field icon={<Users className="size-3.5" />} label="Department / Entity" value={`${subject?.department || '—'} — ${subject?.company || '—'}`} />
              <Field icon={<FileText className="size-3.5" />} label="Employee Code" value={subject?.employee_code || '—'} />
              <div className="flex items-start gap-3 border-b border-dashed border-[#e7eef5] dark:border-zinc-800 py-2.5 last:border-0">
                <span className="w-[17px] flex-none pt-0.5 text-center text-slate-400"><Clock className="mx-auto size-3.5" /></span>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400">Status / Terakhir Aktif</label>
                  <div className="mt-0.5 text-[12.5px] font-semibold">
                    <span className="mr-2 inline-block rounded-full bg-[#e3f7ee] px-2 py-0.5 text-[9.5px] font-bold text-[#0a9d6c]">{subject?.employment_status || subject?.status || '—'}</span>
                    {demo ? '22 Okt 2026, 08:44' : subjectLastAtt ? `${fmtDateShort(subjectLastAtt.date)}, ${fmtTime(subjectLastAtt.clock_in)}` : '—'}
                  </div>
                </div>
                <span className="ml-auto flex-none cursor-pointer text-slate-400">+</span>
              </div>
              <Field icon={<CalendarDays className="size-3.5" />} label="Tanggal Bergabung" value={fmtDateShort(subject?.join_date || subject?.start_date || subject?.hire_date || subject?.created_at)} last />
            </div>
          </aside>
        </div>

        <p className="mt-[18px] text-center text-[10px] text-slate-400">
          Template UI Gesit People (HCM) bergaya ElevateX — menu mengikuti modul HCM; data dari database yang sama dengan Dashboard HR{demo ? ' (mode contoh: data live tidak tersedia)' : ''}.
        </p>
      </div>
    </div>
  );
}

function Stat({ icon, value, chip, chipCls, cap }: { icon: React.ReactNode; value: string; chip: string; chipCls: string; cap: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 flex-none place-items-center rounded-[11px] border border-[#e7eef5] dark:border-zinc-800 bg-white dark:bg-zinc-900">{icon}</span>
      <div>
        <div className="flex items-center gap-2 text-[19px] font-semibold leading-tight">
          {value}
          <span className={`rounded-full px-2 py-[3px] text-[9.5px] font-bold ${chipCls}`}>{chip}</span>
        </div>
        <div className="mt-[3px] text-[11px] leading-snug text-slate-400">{cap}</div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-start gap-3 py-2.5 ${last ? '' : 'border-b border-dashed border-[#e7eef5] dark:border-zinc-800'}`}>
      <span className="w-[17px] flex-none pt-0.5 text-center text-slate-400"><span className="inline-block">{icon}</span></span>
      <div className="min-w-0">
        <label className="block text-[10px] font-medium text-slate-400">{label}</label>
        <div className="mt-0.5 break-words text-[12.5px] font-semibold">{value}</div>
      </div>
      <span className="ml-auto flex-none cursor-pointer text-slate-400">+</span>
    </div>
  );
}
