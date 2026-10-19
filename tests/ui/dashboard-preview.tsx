import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { HRTopNavigation, type HRNavigationItem } from '../../components/hr/HRTopNavigation';
import {
  Users,
  Clock,
  Calendar,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderTree,
  Lock,
  UserCheck,
  GitMerge,
  History,
  TrendingUp,
  ArrowRight,
  BarChart2,
  FileWarning,
  Megaphone,
  Briefcase
} from '../../components/ui/icons';
import '../../index.css';

const navItems = (entries: [string, string][]): HRNavigationItem[] =>
  entries.map(([label, path]) => ({ label, path, icon: Users }));

const mockUser = {
  fullName: 'Rudi Siarudin',
  email: 'rudi.siarudin@gesit.co.id',
  role: 'Super Admin',
  jobTitle: 'IT Specialist / HCM Admin',
  company: 'PT Gesit'
};

function PlenumDashboardPreview() {
  const [activeSpendTab, setActiveSpendTab] = React.useState('Bulanan');

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#12346a]/15 selection:text-[#12346a] flex flex-col">
      {/* Floating Top Nav & Header */}
      <HRTopNavigation
        primary={navItems([
          ['Dashboard', '/'],
          ['Data Karyawan', '/employees'],
        ])}
        secondary={navItems([
          ['Pengajuan & Approval', '/requests'],
          ['Catatan SP Karyawan', '/disciplinary'],
          ['News & Pengumuman', '/news'],
        ])}
        attendance={navItems([
          ['Report', '/attendance/report'],
          ['Request Absen', '/attendance/requests'],
          ['Calendar', '/attendance/calendar'],
          ['Radius Office', '/attendance/locations'],
        ])}
        administration={navItems([
          ['Master Company', '/admin/companies'],
          ['Master Department', '/admin/departments'],
          ['Hierarchy Approval', '/admin/approval-hierarchy'],
          ['Permission Menu', '/admin/permissions'],
          ['Account Management', '/admin/accounts'],
          ['Log Aktivitas', '/admin/activity-logs'],
          ['Laporan & Analitik', '/analytics'],
          ['Pengaturan', '/settings'],
        ])}
        currentUser={mockUser}
        breadcrumbLabel="Dashboard"
      />

      {/* ── MAIN 2x2 PLENUM DASHBOARD GRID ── */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1720px] mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {/* ── CARD 1: DELIVERIES AT RISK / PRESENSI DALAM PERHATIAN ── */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0f172a] leading-tight">
                    Presensi dalam Perhatian
                  </h3>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    Karyawan terlambat atau butuh konfirmasi kehadiran hari ini
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[12px] font-medium text-[#0f172a] bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full hover:bg-[#f1f5f9] transition cursor-pointer"
                >
                  Lihat Semua (4) →
                </button>
              </div>

              <div className="flex flex-col divide-y divide-[#f1f5f9]">
                {[
                  {
                    id: 1,
                    name: 'Ahmad Fauzi',
                    code: 'EMP-0192 • IT Operation',
                    note: 'Check-in 09:24 WIB',
                    status: 'Telat 54 mnt',
                    tone: 'red',
                  },
                  {
                    id: 2,
                    name: 'Siti Nurhaliza',
                    code: 'EMP-0214 • Finance & Tax',
                    note: 'Check-in 09:08 WIB',
                    status: 'Telat 38 mnt',
                    tone: 'red',
                  },
                  {
                    id: 3,
                    name: 'Budi Santoso',
                    code: 'EMP-0145 • Sales Property',
                    note: 'Izin Tugas Lapangan',
                    status: 'Tugas Luar',
                    tone: 'yellow',
                  },
                  {
                    id: 4,
                    name: 'Dewi Lestari',
                    code: 'EMP-0312 • HR & Legal',
                    note: 'WFH disetujui',
                    status: 'Work From Home',
                    tone: 'blue',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 py-3.5 group cursor-pointer hover:bg-[#f8fafc]/70 -mx-2 px-2 rounded-xl transition"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center overflow-hidden shrink-0">
                      <Clock className="w-4 h-4 text-[#64748b]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-[#0f172a] truncate group-hover:text-[#1e293b]">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-[#94a3b8] truncate">
                          {item.code}
                        </span>
                        <span className="text-[10px] text-[#cbd5e1]">•</span>
                        <span className="text-[11px] text-[#64748b]">
                          {item.note}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap border ${
                        item.tone === 'red'
                          ? 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]'
                          : item.tone === 'yellow'
                          ? 'bg-[#fefce8] text-[#ca8a04] border-[#fde68a]'
                          : 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                      }`}
                    >
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CARD 2: WAITING ON APPROVAL / MENUNGGU PERSETUJUAN ── */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex flex-col min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0f172a] leading-tight">
                    Menunggu Persetujuan
                  </h3>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    3 pengajuan terbuka, 1 pengajuan cuti mendesak
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[12px] font-medium text-[#0f172a] bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 rounded-full hover:bg-[#f1f5f9] transition cursor-pointer"
                >
                  Kotak Masuk →
                </button>
              </div>

              <div className="flex flex-col divide-y divide-[#f1f5f9] mt-3">
                {[
                  {
                    id: 'CUTI-1042',
                    title: 'Cuti Tahunan (3 Hari) • Liburan Keluarga',
                    amount: 'Masa Kerja 4th',
                    time: '2 jam lalu',
                    avatar: 'RN',
                  },
                  {
                    id: 'LBR-0891',
                    title: 'Lembur Operasional Weekend (5 Jam)',
                    amount: 'Project CSL',
                    time: '5 jam lalu',
                    avatar: 'AH',
                  },
                  {
                    id: 'ABS-0312',
                    title: 'Koreksi Absen (Lupa Clock Out)',
                    amount: '15 Okt 2026',
                    time: 'Kemarin',
                    avatar: 'DS',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-3.5 group cursor-pointer hover:bg-[#f8fafc]/60 -mx-2 px-2 rounded-xl transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center text-[10px] font-semibold text-[#475569] shrink-0 mt-0.5">
                      {item.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#0f172a]">
                          {item.id}
                        </span>
                        <span className="text-[12px] text-[#64748b] truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] font-semibold text-[#0f172a]">
                          {item.amount}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]">
                          • {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="flex-1 bg-[#0f172a] text-white text-[13px] font-medium h-9 rounded-full hover:bg-[#1e293b] transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Review & Setujui CUTI-1042</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                <button
                  type="button"
                  className="w-9 h-9 rounded-full border border-[#e2e8f0] flex items-center justify-center hover:bg-[#f8fafc] transition cursor-pointer"
                  title="Aksi Lainnya"
                >
                  <Settings className="w-4 h-4 text-[#64748b]" />
                </button>
              </div>
            </div>

            {/* ── CARD 3: TREN HEADCOUNT & KEHADIRAN (PLENUM SPEND STYLE) ── */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0f172a] leading-tight">
                    Tren Kehadiran Bulanan
                  </h3>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    Rekapitulasi rasio kehadiran seluruh departemen
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#94a3b8] font-medium">
                    Oktober 2026
                  </span>
                  <span className="text-[13px] font-semibold text-[#0f172a]">
                    93.4%
                  </span>
                  <span className="text-[11px] font-medium bg-[#dcfce7] text-[#16a34a] border border-[#bbf7d0] px-1.5 py-0.5 rounded-full">
                    +2.1% vs Sep
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#f8fafc] border border-[#f1f5f9] rounded-full p-1 w-fit mt-4">
                {['Bulanan', 'Per Divisi', 'Shift Kerja'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSpendTab(tab)}
                    className={`text-[11px] font-medium px-3 py-1 rounded-full transition cursor-pointer ${
                      activeSpendTab === tab
                        ? 'bg-white text-[#0f172a] shadow-sm border border-[#e2e8f0]'
                        : 'text-[#64748b] hover:text-[#0f172a]'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-7 flex">
                <div className="flex flex-col justify-between text-[11px] text-[#94a3b8] font-medium pr-4 py-1 h-[160px]">
                  <span>100%</span>
                  <span>90%</span>
                  <span>80%</span>
                </div>
                <div className="flex-1 flex items-end gap-3 sm:gap-4 h-[160px] border-b border-[#f1f5f9] pb-0">
                  {[
                    { month: 'Mei', value: 89.2 },
                    { month: 'Jun', value: 91.5 },
                    { month: 'Jul', value: 90.1 },
                    { month: 'Agt', value: 92.4 },
                    { month: 'Sep', value: 91.3 },
                    { month: 'Okt', value: 93.4, active: true },
                  ].map((item) => (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-full flex justify-center"
                        style={{ height: '130px' }}
                      >
                        <div
                          className={`w-full max-w-[52px] rounded-t-[8px] rounded-b-[4px] transition-all hover:opacity-90 ${
                            item.active
                              ? 'bg-[#1e3a8a] shadow-[0_4px_12px_rgba(30,58,138,0.3)]'
                              : 'bg-[#e2e8f0]'
                          }`}
                          style={{
                            height: `${((item.value - 75) / 25) * 100}%`,
                            minHeight: '16px',
                          }}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-medium ${
                          item.active
                            ? 'text-[#0f172a] font-semibold'
                            : 'text-[#94a3b8]'
                        }`}
                      >
                        {item.month}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── CARD 4: DISTRIBUSI USIA / LEAD TIME STYLE HISTOGRAM ── */}
            <div className="bg-white border border-[#e2e8f0] rounded-[16px] p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#0f172a] leading-tight">
                    Demografi & Masa Kerja Karyawan
                  </h3>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    Distribusi masa kerja dari 245 karyawan aktif
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#94a3b8] font-medium uppercase tracking-widest">
                    Rata-rata
                  </div>
                  <div className="text-[18px] font-bold text-[#0f172a] leading-none mt-0.5">
                    3.8 Thn
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="h-[140px] flex items-end gap-[2px] sm:gap-[3px] min-w-0">
                  {[
                    4, 7, 10, 16, 22, 32, 62, 48, 36, 24, 19, 16, 13, 10, 8, 6,
                    5, 4, 3, 2, 2, 2, 1, 1, 1, 1, 0, 0, 0,
                  ].map((val, idx) => (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div
                        className={`w-full rounded-t-[3px] transition-all ${
                          idx === 6
                            ? 'bg-[#1e3a8a]'
                            : 'bg-[#e2e8f0] hover:bg-[#cbd5e1]'
                        }`}
                        style={{
                          height: `${(val / 62) * 120}px`,
                          minHeight: val > 0 ? '2px' : '0',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 text-[11px] font-medium text-[#94a3b8]">
                  <span>&lt;1 Thn</span>
                  <span>2 Thn</span>
                  <span>3 Thn (Puncak)</span>
                  <span>5 Thn</span>
                  <span>&gt;10 Thn</span>
                </div>
                <div className="relative mt-1 h-6">
                  <div className="absolute left-[20.5%] -translate-x-1/2 flex flex-col items-center">
                    <div className="w-px h-2 bg-[#1e3a8a]/30" />
                    <span className="text-[10px] font-semibold text-[#1e3a8a] bg-[#eff6ff] border border-[#bfdbfe] px-1.5 py-0.5 rounded-full mt-1">
                      Puncak 3 Thn
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-[#94a3b8]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]" />
            <span>Data live tersinkronisasi • Gesit People HCM v4.1</span>
          </div>
        </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/']}>
    <PlenumDashboardPreview />
  </MemoryRouter>
);
