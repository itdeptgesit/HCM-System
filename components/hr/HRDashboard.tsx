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
  ChevronRight,
  Sun,
  Check,
  X,
  FileText,
  Sparkles
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
import { loadWorkforceAccounts } from '../../lib/workforceData';
import { jakartaDate } from '../../lib/workforce-contract';
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
  const [totalEmployees, setTotalEmployees] = useState(108);
  const [presentToday, setPresentToday] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [expiringItems, setExpiringItems] = useState(0);
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');
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

  // Weekly hours activity data (Sen - Min)
  const weeklyData = [
    { day: 'Min', hours: 0, height: 10, isHighlight: false, label: '0h' },
    { day: 'Sen', hours: 7.8, height: 68, isHighlight: false, label: '7h 48m' },
    { day: 'Sel', hours: 8.2, height: 75, isHighlight: false, label: '8h 12m' },
    { day: 'Rab', hours: 7.5, height: 65, isHighlight: false, label: '7h 30m' },
    { day: 'Kam', hours: 8.7, height: 90, isHighlight: true, label: '8h 45m', tooltip: '8h 45 min • Hari Ini' },
    { day: 'Jum', hours: 7.0, height: 58, isHighlight: false, label: '7h 00m' },
    { day: 'Sab', hours: 0, height: 10, isHighlight: false, label: '0h' },
  ];

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
        setLoading(true);
        const todayStr = jakartaDate();

        // 1. Employees count
        const accounts = await loadWorkforceAccounts();
        if (accounts.length > 0) {
          setTotalEmployees(accounts.length);
        }

        // 2. Attendance today
        const { data: attToday } = await supabase
          .from('attendance_records')
          .select('id, status, clock_in')
          .eq('date', todayStr);

        const presentCount = (attToday || []).filter(r => {
          const s = String(r.status || '').toLowerCase();
          return s === 'present' || s === 'hadir' || !!r.clock_in;
        }).length;
        setPresentToday(presentCount || 0);

        // 3. Pending requests
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('id, status')
          .or('status.ilike.pending%,status.eq.submitted');

        const { data: attReqs } = await supabase
          .from('attendance_requests')
          .select('id, status')
          .or('status.ilike.pending%,status.eq.submitted');

        const totalPending = (leaves?.length || 0) + (attReqs?.length || 0);
        setPendingRequests(totalPending);

        // 4. Expiring contracts / probations within 30 days
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
        const expiring = accounts.filter(acc => {
          const endStr = acc.contract_end_date || acc.probation_end_date;
          if (!endStr) return false;
          const d = new Date(endStr);
          return d >= new Date() && d <= thirtyDaysAhead;
        }).length;
        setExpiringItems(expiring);

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
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            Selamat Datang, {currentUser?.fullName?.split(' ')[0] || 'Executive'} 👋
          </h1>
          <p className="mt-1 text-[12.5px] sm:text-[14px] text-[#475569]">
            Ringkasan kehadiran, stabilitas jam kerja, dan persetujuan operasional SDM hari ini.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-[10px] border border-[#cbd5e1] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#0f172a] shadow-xs hover:bg-[#f8fafc] transition-colors cursor-pointer">
            <Calendar className="h-3.5 w-3.5 text-[#64748b]" />
            <span>Oktober 2026</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#64748b]" />
          </button>
        </div>
      </div>

      {/* ========================================================
          ROW 1: 3 FEATURE CARDS (CRISP WHITE) + 1 BANNER (#0f2b46 NAVY)
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Karyawan Aktif */}
        <div className="bg-white rounded-[18px] p-5 border border-[#e5eaf1] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center font-bold">
              <Users className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] block">Karyawan Aktif</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] leading-none mt-1">
                {totalEmployees > 0 ? totalEmployees : '108'}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] font-medium block">Retensi Organisasi</span>
              <span className="font-bold text-[#16a34a] flex items-center gap-1 mt-0.5">
                <span>↗</span> 98.4%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] font-medium block">Status</span>
              <span className="font-semibold text-[#475569] mt-0.5 block">Tetap & Kontrak</span>
            </div>
          </div>
        </div>

        {/* Card 2: Presensi Hari Ini */}
        <div className="bg-white rounded-[18px] p-5 border border-[#e5eaf1] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center font-bold">
              <Clock className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] block">Presensi Hari Ini</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] leading-none mt-1">
                {presentToday > 0 ? presentToday : '96.2%'}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] font-medium block">On-Time Rate</span>
              <span className="font-bold text-[#16a34a] flex items-center gap-1 mt-0.5">
                <span>↗</span> 94.0%
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] font-medium block">Tipe</span>
              <span className="font-semibold text-[#475569] mt-0.5 block">Live Clock-In</span>
            </div>
          </div>
        </div>

        {/* Card 3: Antrean Persetujuan */}
        <div className="bg-white rounded-[18px] p-5 border border-[#e5eaf1] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#fffbeb] text-[#d97706] flex items-center justify-center font-bold">
              <FileText className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] block">Antrean Persetujuan</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] leading-none mt-1">
                {pendingRequests > 0 ? pendingRequests : '3'}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] font-medium block">SLA Respons</span>
              <span className="font-bold text-[#2563eb] flex items-center gap-1 mt-0.5">
                &lt; 24 Jam
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] font-medium block">Kategori</span>
              <span className="font-semibold text-[#475569] mt-0.5 block">Cuti & Izin</span>
            </div>
          </div>
        </div>

        {/* Card 4: Action Banner (#0f2b46 Navy - Rounded 24px) */}
        <div className="rounded-[18px] bg-[#0f2b46] text-white p-5 shadow-lg border border-[#16324f] flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#93c5fd]">
                HCM Enterprise
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#2563eb]/30 text-[#93c5fd] border border-[#2563eb]/50">
                Prioritas
              </span>
            </div>
            <h3 className="text-[16px] font-bold text-white mt-2.5">
              Evaluasi PKWT & Kontrak
            </h3>
            <p className="text-[12.5px] text-[#c3d4ea] mt-1 leading-relaxed font-normal">
              {expiringItems > 0
                ? `${expiringItems} karyawan jatuh tempo kontrak/probation (≤ 30 hari).`
                : '5 karyawan jatuh tempo kontrak/probation (≤ 30 hari).'}
            </p>
          </div>

          <div className="mt-4 relative z-10">
            <button
              onClick={() => navigate('/employees')}
              className="w-full py-2.5 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-[13px] rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Review Sekarang</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>

          {/* Subtle background glow */}
          <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-[#2563eb]/15 rounded-full blur-2xl pointer-events-none" />
        </div>

      </div>

      {/* ========================================================
          ROW 2: AKTIVITAS KEHADIRAN (BAR CHART) + JADWAL HARI INI
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Hours Activity (Bar Chart - 7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-[18px] p-6 border border-[#e5eaf1] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-semibold text-[#0f172a]">Aktivitas Kehadiran</h3>
                <div className="flex items-center gap-1.5 text-[12.5px] text-[#16a34a] font-semibold mt-0.5">
                  <span>↗ +4.8%</span>
                  <span className="text-[#64748b] font-normal">dibanding minggu lalu</span>
                </div>
              </div>

              <button
                onClick={() => setChartPeriod(p => p === 'weekly' ? 'monthly' : 'weekly')}
                className="px-3 py-1.5 rounded-[10px] bg-[#f8fafc] border border-[#cbd5e1] text-[12px] font-semibold text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>{chartPeriod === 'weekly' ? 'Mingguan' : 'Bulanan'}</span>
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* Vertical Bar Chart with Slim Rounded Bars */}
            <div className="mt-8 h-44 flex items-end justify-between gap-3 px-3 relative">
              {/* Background horizontal guide lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-[#e5eaf1]">
                <div className="border-b border-[#f1f5f9] w-full flex justify-end pr-1 text-[10px] text-[#94a3b8]">8h</div>
                <div className="border-b border-[#f1f5f9] w-full flex justify-end pr-1 text-[10px] text-[#94a3b8]">6h</div>
                <div className="border-b border-[#f1f5f9] w-full flex justify-end pr-1 text-[10px] text-[#94a3b8]">4h</div>
                <div className="border-b border-[#f1f5f9] w-full flex justify-end pr-1 text-[10px] text-[#94a3b8]">2h</div>
                <div className="w-full flex justify-end pr-1 text-[10px] text-[#94a3b8]">0h</div>
              </div>

              {/* Bar Columns */}
              {weeklyData.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 relative z-10 group">
                  {/* Floating Tooltip Bubble on Highlight */}
                  {item.isHighlight && (
                    <div className="absolute -top-11 left-1/2 -translate-x-1/2 bg-[#0f172a] text-white px-3 py-1 rounded-[8px] text-[10px] font-bold whitespace-nowrap shadow-md flex items-center gap-1">
                      <span>⏱️ {item.tooltip}</span>
                    </div>
                  )}

                  {/* Slim Bar Pillar */}
                  <div className="w-3 sm:w-3.5 rounded-full bg-[#f1f5f9] h-32 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${item.height}%` }}
                      className={`w-full rounded-full transition-all duration-500 ${
                        item.isHighlight
                          ? 'bg-[#2563eb] shadow-sm shadow-[#2563eb]/40'
                          : 'bg-[#cbd5e1] group-hover:bg-[#93c5fd]'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span className={`text-[12px] ${item.isHighlight ? 'text-[#2563eb] font-bold' : 'text-[#64748b] font-medium'}`}>
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#e5eaf1] flex items-center justify-between text-[12.5px] text-[#64748b]">
            <span>Total Terpantau: <strong className="text-[#0f172a]">39h 15m</strong></span>
            <span className="text-[#2563eb] font-bold">Stabilitas 96.4%</span>
          </div>
        </div>

        {/* Daily Schedule (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-[18px] p-6 border border-[#e5eaf1] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] flex flex-col justify-between">
          <div>
            <h3 className="text-[16px] font-semibold text-[#0f172a]">Jadwal Hari Ini</h3>
            <p className="text-[12.5px] text-[#475569] mt-0.5">Shift kerja & agenda evaluasi operasional</p>

            <div className="mt-4 space-y-2.5">
              {/* Item 1 */}
              <div 
                onClick={() => navigate('/attendance/calendar')}
                className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#f8fafc] hover:bg-[#eff6ff] transition-colors cursor-pointer group border border-transparent hover:border-[#bfdbfe]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#eff6ff] text-[#2563eb] flex items-center justify-center font-bold text-[11px]">
                    HO
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                      Shift Kantor Pusat
                    </h4>
                    <p className="text-[11px] text-[#64748b]">08:30 - 17:30 • All Division</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8] group-hover:text-[#2563eb] transition-colors" />
              </div>

              {/* Item 2 */}
              <div 
                onClick={() => navigate('/employees')}
                className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#f8fafc] hover:bg-[#eff6ff] transition-colors cursor-pointer group border border-transparent hover:border-[#bfdbfe]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#f5f3ff] text-[#7c3aed] flex items-center justify-center font-bold text-[11px]">
                    HR
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                      Review Probation
                    </h4>
                    <p className="text-[11px] text-[#64748b]">14:00 - 14:45 • Meeting 1</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8] group-hover:text-[#2563eb] transition-colors" />
              </div>

              {/* Item 3 */}
              <div 
                onClick={() => navigate('/attendance/locations')}
                className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#f8fafc] hover:bg-[#eff6ff] transition-colors cursor-pointer group border border-transparent hover:border-[#bfdbfe]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#f0fdf4] text-[#16a34a] flex items-center justify-center font-bold text-[11px]">
                    OP
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                      Briefing Operasional
                    </h4>
                    <p className="text-[11px] text-[#64748b]">16:00 - 16:45 • Online</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8] group-hover:text-[#2563eb] transition-colors" />
              </div>

              {/* Item 4 */}
              <div 
                onClick={() => navigate('/attendance')}
                className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#f8fafc] hover:bg-[#eff6ff] transition-colors cursor-pointer group border border-transparent hover:border-[#bfdbfe]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[#ecfeff] text-[#0891b2] flex items-center justify-center font-bold text-[11px]">
                    SYS
                  </div>
                  <div>
                    <h4 className="text-[12.5px] font-semibold text-[#0f172a] group-hover:text-[#2563eb] transition-colors">
                      Rekap Presensi Harian
                    </h4>
                    <p className="text-[11px] text-[#64748b]">18:00 • Otomatis Sistem</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#94a3b8] group-hover:text-[#2563eb] transition-colors" />
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/attendance/calendar')}
            className="mt-3 w-full py-1.5 text-center text-[12.5px] font-semibold text-[#2563eb] hover:underline cursor-pointer"
          >
            Lihat Kalender Lengkap →
          </button>
        </div>

      </div>

      {/* Row 3: Menunggu Persetujuan (2/3 width) & Komposisi Karyawan (1/3 width) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Menunggu Persetujuan (2/3 width) */}
        <div className="rounded-[18px] border border-[#e5eaf1] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-semibold text-[#0f172a]">Menunggu Persetujuan</h3>
              <span className="rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] px-2.5 py-0.5 text-[11px] font-bold">
                {pendingList.length}
              </span>
            </div>
            <button 
              onClick={() => navigate('/requests')}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2563eb] hover:underline transition-colors cursor-pointer"
            >
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex items-center gap-6 border-b border-[#f1f5f9] text-xs font-medium">
            <button 
              onClick={() => setActiveApprovalTab('all')}
              className={`pb-2.5 transition-colors cursor-pointer ${
                activeApprovalTab === 'all'
                  ? 'border-b-2 border-[#2563eb] font-bold text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Semua pengajuan
            </button>
            <button 
              onClick={() => setActiveApprovalTab('leave')}
              className={`pb-2.5 transition-colors cursor-pointer ${
                activeApprovalTab === 'leave'
                  ? 'border-b-2 border-[#2563eb] font-bold text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Cuti & Izin
            </button>
            <button 
              onClick={() => setActiveApprovalTab('attendance')}
              className={`pb-2.5 transition-colors cursor-pointer ${
                activeApprovalTab === 'attendance'
                  ? 'border-b-2 border-[#2563eb] font-bold text-[#0f172a]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              Absensi
            </button>
          </div>

          {/* List of Pending Requests */}
          <div className="mt-4 divide-y divide-[#f1f5f9]">
            {filteredPendingList.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1">
                {/* User & Info */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f5f9] text-xs font-bold text-[#334155]">
                    {item.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0f172a]">{item.name}</div>
                    <div className="text-[11px] text-[#64748b]">{item.description}</div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#fffbeb] text-[#d97706] border border-[#fef3c7] px-2.5 py-0.5 text-[10px] font-semibold">
                    Menunggu
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleAction(item.id, 'Disetujui')}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#f0fdf4] text-[#16a34a] hover:bg-[#dcfce7] transition-colors cursor-pointer"
                      title="Setujui"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleAction(item.id, 'Ditolak')}
                      className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#fef2f2] text-[#dc2626] hover:bg-[#fee2e2] transition-colors cursor-pointer"
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

        {/* Right Column: Komposisi Karyawan (1/3 width) */}
        <div className="rounded-[18px] border border-[#e5eaf1] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#0f172a]">Komposisi Karyawan</h3>
              <p className="mt-0.5 text-[12px] text-[#64748b]">Distribusi per departemen</p>
            </div>
            <button 
              onClick={() => navigate('/employees')} 
              className="text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer"
              title="Lihat semua karyawan"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Donut Chart & Legend */}
          <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            {/* Donut with Center Count */}
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={65}
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
                <span className="text-xl font-bold tracking-tight text-[#0f172a]">{totalEmployees}</span>
                <span className="text-[10px] text-[#64748b]">Total tim</span>
              </div>
            </div>

            {/* Department Breakdown List */}
            <div className="flex-1 space-y-2 text-xs">
              {departmentData.map((dept) => (
                <div key={dept.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-[#475569] truncate max-w-[90px]">{dept.name}</span>
                  </div>
                  <span className="font-bold text-[#0f172a]">{dept.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Highlight Badge */}
          <div className="mt-5 border-t border-[#f1f5f9] pt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16a34a]">
              <span>↗ +12 karyawan baru bergabung bulan ini</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Aktivitas Absensi Hari Ini (2/3 width) & Agenda Mendatang (1/3 width) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Aktivitas Absensi Hari Ini (2/3 width) */}
        <div className="rounded-[18px] border border-[#e5eaf1] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] lg:col-span-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-semibold text-[#0f172a]">Aktivitas Absensi Hari Ini</h3>
              <p className="mt-0.5 text-[12px] text-[#64748b]">Senin, 12 Oktober 2026 · Kantor Pusat</p>
            </div>
            <button 
              onClick={() => navigate('/attendance')}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2563eb] hover:underline transition-colors cursor-pointer"
            >
              <span>Lihat semua</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#f1f5f9] text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  <th className="pb-3 font-semibold">Karyawan</th>
                  <th className="pb-3 font-semibold">Departemen</th>
                  <th className="pb-3 font-semibold">Check-In</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                <tr className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eff6ff] text-[10px] font-bold text-[#2563eb]">
                        AF
                      </div>
                      <span className="font-semibold text-[#0f172a]">Ahmad Fauzi</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#64748b]">Operations</td>
                  <td className="py-3 font-medium text-[#0f172a]">08:14</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[10px] font-semibold text-[#16a34a] border border-[#dcfce7]">
                      Tepat Waktu
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fdf2f8] text-[10px] font-bold text-[#db2777]">
                        NS
                      </div>
                      <span className="font-semibold text-[#0f172a]">Nisa</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#64748b]">Human Resources</td>
                  <td className="py-3 font-medium text-[#0f172a]">08:26</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[10px] font-semibold text-[#16a34a] border border-[#dcfce7]">
                      Tepat Waktu
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fffbeb] text-[10px] font-bold text-[#d97706]">
                        KS
                      </div>
                      <span className="font-semibold text-[#0f172a]">Kevin Sanjaya</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#64748b]">Technology</td>
                  <td className="py-3 font-medium text-[#0f172a]">08:42</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-[#fffbeb] px-2.5 py-0.5 text-[10px] font-semibold text-[#d97706] border border-[#fef3c7]">
                      Terlambat
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ecfeff] text-[10px] font-bold text-[#0891b2]">
                        MA
                      </div>
                      <span className="font-semibold text-[#0f172a]">Maya Anggraini</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#64748b]">Sales & Marketing</td>
                  <td className="py-3 font-medium text-[#0f172a]">08:19</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[10px] font-semibold text-[#16a34a] border border-[#dcfce7]">
                      Tepat Waktu
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5f3ff] text-[10px] font-bold text-[#7c3aed]">
                        BS
                      </div>
                      <span className="font-semibold text-[#0f172a]">Budi Santoso</span>
                    </div>
                  </td>
                  <td className="py-3 text-[#64748b]">Operations</td>
                  <td className="py-3 font-medium text-[#0f172a]">08:05</td>
                  <td className="py-3">
                    <span className="inline-flex items-center rounded-full bg-[#f0fdf4] px-2.5 py-0.5 text-[10px] font-semibold text-[#16a34a] border border-[#dcfce7]">
                      Tepat Waktu
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Agenda Mendatang (1/3 width) */}
        <div className="rounded-[18px] border border-[#e5eaf1] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-[#0f172a]">Agenda Mendatang</h3>
            <button 
              onClick={() => navigate('/attendance/calendar')}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#2563eb] hover:underline transition-colors cursor-pointer"
            >
              <span>Lihat agenda</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Agenda List */}
          <div className="mt-5 space-y-3.5">
            {/* Event 1 */}
            <div className="flex items-start gap-3.5 p-2 rounded-[10px] hover:bg-[#f8fafc] transition-colors">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-[#f8fafc] border border-[#e5eaf1] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94a3b8]">OKT</span>
                <span className="text-sm font-extrabold text-[#0f172a]">15</span>
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="text-xs font-semibold text-[#0f172a]">Onboarding Karyawan Baru</div>
                <div className="text-[11px] text-[#64748b]">09:00 - 11:00 · Meeting Room A</div>
                <span className="inline-block rounded-md bg-[#eff6ff] px-2 py-0.5 text-[10px] font-medium text-[#2563eb]">
                  4 karyawan baru
                </span>
              </div>
            </div>

            {/* Event 2 */}
            <div className="flex items-start gap-3.5 p-2 rounded-[10px] hover:bg-[#f8fafc] transition-colors">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-[#f8fafc] border border-[#e5eaf1] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94a3b8]">OKT</span>
                <span className="text-sm font-extrabold text-[#0f172a]">20</span>
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="text-xs font-semibold text-[#0f172a]">Performance Review Q3</div>
                <div className="text-[11px] text-[#64748b]">09:00 - 17:00 · All Division</div>
                <span className="inline-block rounded-md bg-[#f5f3ff] px-2 py-0.5 text-[10px] font-medium text-[#7c3aed]">
                  Evaluasi kinerja
                </span>
              </div>
            </div>

            {/* Event 3 */}
            <div className="flex items-start gap-3.5 p-2 rounded-[10px] hover:bg-[#f8fafc] transition-colors">
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-[#f8fafc] border border-[#e5eaf1] text-center">
                <span className="text-[9px] font-bold uppercase text-[#94a3b8]">OKT</span>
                <span className="text-sm font-extrabold text-[#0f172a]">25</span>
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="text-xs font-semibold text-[#0f172a]">Pembayaran Payroll</div>
                <div className="text-[11px] text-[#64748b]">Payroll periode Oktober 2026</div>
                <span className="inline-block rounded-md bg-[#f0fdf4] px-2 py-0.5 text-[10px] font-medium text-[#16a34a]">
                  Terjadwal
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* News & Pengumuman Karyawan (Tampil di Mobile App Absen) */}
      <CompanyNewsManager currentUser={currentUser} />
    </div>
  );
};

export default HRDashboard;

