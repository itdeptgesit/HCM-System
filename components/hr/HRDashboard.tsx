import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Clock, 
  Calendar, 
  Wallet, 
  Download, 
  ArrowRight, 
  TrendingUp, 
  ChevronDown,
  Sun,
  Check,
  X
} from 'lucide-react';
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

interface HRDashboardProps {
  currentUser?: any;
}

// Attendance weekly trend data matching the design spline
const trendData = [
  { name: 'Minggu 1', bulanIni: 93.2, bulanLalu: 88.5 },
  { name: 'Minggu 2', bulanIni: 96.8, bulanLalu: 89.2 },
  { name: 'Minggu 3', bulanIni: 95.9, bulanLalu: 88.0 },
  { name: 'Minggu 4', bulanIni: 98.4, bulanLalu: 89.6 },
  { name: 'Minggu 5', bulanIni: 97.2, bulanLalu: 88.9 },
];

// Department breakdown matching the design donut
const departmentData = [
  { name: 'Operations', count: 94, color: '#1E3A8A' },
  { name: 'Sales & Marketing', count: 67, color: '#3B82F6' },
  { name: 'Technology', count: 45, color: '#F59E0B' },
  { name: 'HR & Finance', count: 42, color: '#94A3B8' },
];

export const HRDashboard: React.FC<HRDashboardProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [totalEmployees, setTotalEmployees] = useState(248);
  const [pendingLeave, setPendingLeave] = useState(3);
  const [loading, setLoading] = useState(true);
  const [activeApprovalTab, setActiveApprovalTab] = useState<'all' | 'leave' | 'attendance'>('all');
  const [pendingList, setPendingList] = useState([
    {
      id: 1,
      name: 'Nadia Putri',
      initials: 'NP',
      description: 'Cuti tahunan · 14-16 Okt 2026 · 3 hari',
      type: 'leave',
      status: 'Menunggu'
    },
    {
      id: 2,
      name: 'Rizky Pratama',
      initials: 'RP',
      description: 'Koreksi absensi · 09 Okt 2026 · Jam pulang',
      type: 'attendance',
      status: 'Menunggu'
    },
    {
      id: 3,
      name: 'Dewi Lestari',
      initials: 'DL',
      description: 'Cuti tahunan · 19 Okt 2026 · 1 hari',
      type: 'leave',
      status: 'Menunggu'
    }
  ]);

  const handleAction = (id: number, action: string) => {
    setPendingList(prev => prev.filter(item => item.id !== id));
  };

  const filteredPendingList = pendingList.filter(item => {
    if (activeApprovalTab === 'all') return true;
    return item.type === activeApprovalTab;
  });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [empRes, leaveRes] = await Promise.allSettled([
          supabase.from('user_accounts').select('id', { count: 'exact', head: true }),
          supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
        ]);

        if (empRes.status === 'fulfilled' && empRes.value.count && empRes.value.count > 0) {
          // If real employees exist in database, display count, otherwise fallback to 248 for rich preview
          if (empRes.value.count > 2) {
            setTotalEmployees(empRes.value.count);
          }
        }

        if (leaveRes.status === 'fulfilled' && typeof leaveRes.value.count === 'number') {
          if (leaveRes.value.count > 0) {
            setPendingLeave(leaveRes.value.count);
          }
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRealData();
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Top Greeting & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#94A3B8]">
            Your people, at a glance
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A] sm:text-3xl flex items-center gap-2">
            Selamat pagi, Admin <Sun className="h-6 w-6 text-amber-500 fill-amber-500" />
          </h1>
          <p className="mt-1 text-xs text-[#64748B] sm:text-sm">
            Awali hari dengan gambaran yang jelas tentang tim Anda.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F172A] shadow-2xs hover:bg-[#F8FAFC] transition-colors">
            <Calendar className="h-3.5 w-3.5 text-[#64748B]" />
            <span>Oktober 2026</span>
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
              Ada {pendingLeave} pengajuan menunggu tinjauan Anda. Mari bantu tim melangkah lebih lancar.
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
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">{totalEmployees}</span>
            <span className="text-xs font-medium text-[#64748B]">orang</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
              <span>+12</span>
              <span>dibanding bulan lalu</span>
            </span>
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
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">96.4</span>
            <span className="text-xs font-bold text-[#64748B]">%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#059669]">
              <TrendingUp className="h-3 w-3" />
              <span>2.1% dibanding bulan lalu</span>
            </span>
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
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">8</span>
            <span className="text-xs font-medium text-[#64748B]">orang</span>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-[#64748B]">
            <span>5 cuti tahunan</span>
            <span>·</span>
            <span>3 izin</span>
          </div>
        </div>

        {/* Card 4: Payroll Bulan Ini */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs">
          <div className="flex items-start justify-between">
            <div className="text-xs font-medium text-[#64748B]">Payroll bulan ini</div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF] text-[#4F46E5]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-[#0F172A]">1.28</span>
            <span className="text-xs font-bold text-[#64748B]">M</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px]">
            <span className="rounded bg-[#FEF3C7] px-1.5 py-0.5 font-bold text-[#92400E]">
              Draft
            </span>
            <span className="text-[#64748B]">Dijadwalkan 25 Oktober</span>
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
              <p className="mt-0.5 text-xs text-[#64748B]">Ringkasan kehadiran · Oktober 2026</p>
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
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tick={{ fill: '#64748B', fontSize: 11 }} 
                />
                <YAxis 
                  domain={[80, 100]} 
                  ticks={[85, 90, 95, 100]} 
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
                />
                <Area 
                  type="monotone" 
                  dataKey="bulanLalu" 
                  stroke="#D97706" 
                  strokeWidth={2} 
                  strokeDasharray="4 4" 
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Footer Bar */}
          <div className="mt-4 flex items-center justify-between border-t border-[#F1F5F9] pt-3 text-xs">
            <span className="text-[#64748B]">
              Rata-rata kehadiran: <strong className="font-semibold text-[#0F172A]">95.8%</strong>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#059669]">
              <TrendingUp className="h-3 w-3" />
              <span>2.1% dari bulan lalu</span>
            </span>
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
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold tracking-tight text-[#0F172A]">{totalEmployees}</span>
                <span className="text-[10px] text-[#64748B]">Total karyawan</span>
              </div>
            </div>

            {/* Department Breakdown List */}
            <div className="flex-1 space-y-2.5 text-xs">
              {departmentData.map((dept) => (
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
              <span>+12 karyawan baru bergabung bulan ini</span>
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
                {pendingList.length}
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

          {/* List of Pending Requests */}
          <div className="mt-4 divide-y divide-[#F1F5F9]">
            {filteredPendingList.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1">
                {/* User & Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-xs font-bold text-[#334155]">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{item.name}</div>
                    <div className="text-[11px] text-[#64748B]">{item.description}</div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Menunggu
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleAction(item.id, 'Disetujui')}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Setujui"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleAction(item.id, 'Ditolak')}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Tolak"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
            {/* Event 1 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94A3B8]">OKT</span>
                <span className="text-base font-extrabold text-[#0F172A]">15</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Onboarding karyawan baru</div>
                <div className="text-[11px] text-[#64748B]">09:00 - 11:00 · Meeting Room A</div>
                <span className="inline-block rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                  4 karyawan baru
                </span>
              </div>
            </div>

            {/* Event 2 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94A3B8]">OKT</span>
                <span className="text-base font-extrabold text-[#0F172A]">20</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Performance review Q3</div>
                <div className="text-[11px] text-[#64748B]">09:00 - 17:00 · Seluruh departemen</div>
                <span className="inline-block rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                  Evaluasi kinerja
                </span>
              </div>
            </div>

            {/* Event 3 */}
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94A3B8]">OKT</span>
                <span className="text-base font-extrabold text-[#0F172A]">25</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-[#0F172A]">Pembayaran payroll</div>
                <div className="text-[11px] text-[#64748B]">Payroll periode Oktober 2026</div>
                <span className="inline-block rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#475569]">
                  Terjadwal
                </span>
              </div>
            </div>
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
            <p className="mt-0.5 text-xs text-[#64748B]">Senin, 12 Oktober 2026 · Kantor pusat</p>
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
              <tr className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E0E7FF] text-[10px] font-bold text-[#4338CA]">
                      AF
                    </div>
                    <span className="font-semibold text-[#0F172A]">Ahmad Fauzi</span>
                  </div>
                </td>
                <td className="py-3 text-[#64748B]">Operations</td>
                <td className="py-3 font-medium text-[#0F172A]">08:14</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Tepat Waktu
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FCE7F3] text-[10px] font-bold text-[#BE185D]">
                      NS
                    </div>
                    <span className="font-semibold text-[#0F172A]">Nisa</span>
                  </div>
                </td>
                <td className="py-3 text-[#64748B]">Human Resources</td>
                <td className="py-3 font-medium text-[#0F172A]">08:26</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Tepat Waktu
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FEF3C7] text-[10px] font-bold text-[#B45309]">
                      KS
                    </div>
                    <span className="font-semibold text-[#0F172A]">Kevin Sanjaya</span>
                  </div>
                </td>
                <td className="py-3 text-[#64748B]">Technology</td>
                <td className="py-3 font-medium text-[#0F172A]">08:42</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Terlambat
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#CCFBF1] text-[10px] font-bold text-[#0F766E]">
                      MA
                    </div>
                    <span className="font-semibold text-[#0F172A]">Maya Anggraini</span>
                  </div>
                </td>
                <td className="py-3 text-[#64748B]">Sales & Marketing</td>
                <td className="py-3 font-medium text-[#0F172A]">08:19</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Tepat Waktu
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-[#F8FAFC] transition-colors">
                <td className="py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F3E8FF] text-[10px] font-bold text-[#7E22CE]">
                      BS
                    </div>
                    <span className="font-semibold text-[#0F172A]">Budi Santoso</span>
                  </div>
                </td>
                <td className="py-3 text-[#64748B]">Operations</td>
                <td className="py-3 font-medium text-[#0F172A]">08:05</td>
                <td className="py-3">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Tepat Waktu
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;

