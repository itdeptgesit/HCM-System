import React, { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  User,
  Users,
  LogOut,
  Calendar,
  Clock,
  CheckCircle2,
  FileWarning,
  Building2,
  FolderTree,
  GitMerge,
  Lock,
  UserCheck,
  History,
  BarChart3,
  Settings,
  Megaphone,
  LayoutDashboard,
  MapPin,
  FileText,
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface NexoraNavigationItem {
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export interface NexoraLayoutProps {
  primary?: NexoraNavigationItem[];
  secondary?: NexoraNavigationItem[];
  attendance?: NexoraNavigationItem[];
  administration?: NexoraNavigationItem[];
  currentUser?: any;
  onLogout?: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  breadcrumbLabel?: string;
  onSearchClick?: () => void;
  metrics?: {
    headcount?: number | string;
    pendingCount?: number | string;
    attendanceRate?: string;
  };
  children: React.ReactNode;
}

export function NexoraLayout({
  primary = [],
  secondary = [],
  attendance = [],
  administration = [],
  currentUser,
  onLogout,
  isDark,
  onToggleTheme,
  breadcrumbLabel,
  onSearchClick,
  metrics,
  children,
}: NexoraLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Helper check active route
  const isActive = (path: string) =>
    pathname === path ||
    (path === '/requests' && pathname === '/approvals') ||
    (path === '/attendance/report' && pathname === '/attendance') ||
    (path === '/attendance/calendar' && pathname === '/calendar');

  // Dynamic Page Meta info (Title, Subtitle, Metric Pills)
  const pageMeta = useMemo(() => {
    if (pathname === '/' || pathname === '/dashboard') {
      return {
        breadcrumb: 'Dashboard / Home',
        title: 'Dashboard Human Capital',
        subtitle: 'Ringkasan performa SDM, kehadiran, dan indikator kunci organisasi',
        metric1Label: 'Total SDM',
        metric1Val: metrics?.headcount ?? 48,
        metric2Label: 'Tingkat Kehadiran',
        metric2Val: metrics?.attendanceRate ?? '98.4%',
        metric3Label: 'Perlu Approval',
        metric3Val: metrics?.pendingCount ?? 0,
      };
    }
    if (pathname === '/employees') {
      return {
        breadcrumb: 'Home / Data Karyawan',
        title: 'Direktori & Manajemen Karyawan',
        subtitle: 'Kelola data identitas, kontrak kerja, NIK, dan struktur penempatan',
        metric1Label: 'Headcount',
        metric1Val: metrics?.headcount ?? 48,
        metric2Label: 'Status Kontrak',
        metric2Val: 'PKWTT / PKWT',
        metric3Label: 'Pembaruan',
        metric3Val: 'Tersinkron',
      };
    }
    if (pathname === '/requests' || pathname === '/approvals') {
      return {
        breadcrumb: 'Approvals / Inbox',
        title: 'Approval inbox',
        subtitle: 'Agents prepare the evidence, you decide',
        metric1Label: 'On you',
        metric1Val: metrics?.pendingCount ?? 1,
        metric2Label: 'Kategori',
        metric2Val: 'Cuti · Lembur · Klaim',
        metric3Label: 'Status',
        metric3Val: 'Aktif',
      };
    }
    if (pathname.startsWith('/attendance')) {
      return {
        breadcrumb: 'Home / Absensi & Presensi',
        title: 'Manajemen Presensi & Kehadiran',
        subtitle: 'Rekapitulasi log absensi, kalender operasional, dan kepatuhan radius office',
        metric1Label: 'Tingkat Hadir',
        metric1Val: metrics?.attendanceRate ?? '98.4%',
        metric2Label: 'Radius Office',
        metric2Val: 'Geo-Verified',
        metric3Label: 'Monitoring',
        metric3Val: 'Realtime',
      };
    }
    if (pathname === '/disciplinary') {
      return {
        breadcrumb: 'Home / Catatan SP',
        title: 'Catatan SP & Disiplin Karyawan',
        subtitle: 'Arsip penertiban surat peringatan dan kepatuhan tata tertib kerja',
        metric1Label: 'Status',
        metric1Val: 'Kepatuhan SK',
        metric2Label: 'Tingkat SP',
        metric2Val: 'SP1 / SP2 / SP3',
        metric3Label: 'Masa Berlaku',
        metric3Val: '6 Bulan',
      };
    }
    if (pathname === '/news') {
      return {
        breadcrumb: 'Home / Informasi',
        title: 'News & Pengumuman Internal',
        subtitle: 'Pusat publikasi memo direksi, berita korporat, dan edaran resmi',
        metric1Label: 'Kanal',
        metric1Val: 'Internal Feed',
        metric2Label: 'Akses',
        metric2Val: 'Seluruh Karyawan',
        metric3Label: 'Status',
        metric3Val: 'Aktif',
      };
    }
    if (pathname.startsWith('/admin') || pathname === '/settings') {
      return {
        breadcrumb: 'Sistem / Administrasi',
        title: 'Konfigurasi & Administrasi Sistem',
        subtitle: 'Pengaturan struktur korporasi, hierarki approval, dan hak akses menu',
        metric1Label: 'Sistem',
        metric1Val: 'Enterprise HCM',
        metric2Label: 'Keamanan',
        metric2Val: 'RBAC Active',
        metric3Label: 'Audit',
        metric3Val: 'Logging On',
      };
    }
    return {
      breadcrumb: `Home / ${breadcrumbLabel || 'Modul'}`,
      title: breadcrumbLabel || 'Gesit People HCM',
      subtitle: 'Sistem Informasi Manajemen Sumber Daya Manusia Terpadu',
      metric1Label: 'Organisasi',
      metric1Val: 'The Gesit Companies',
      metric2Label: 'Status',
      metric2Val: 'Online',
      metric3Label: 'Versi',
      metric3Val: 'v4.1',
    };
  }, [pathname, breadcrumbLabel, metrics]);

  // Is this approvals page where Plenum dual-pane is already handling inner card?
  const isApprovalsPage = pathname === '/requests' || pathname === '/approvals';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden text-slate-900 font-sans selection:bg-[#1D63ED]/20 selection:text-[#0A3D9E] bg-[#0A3D9E]">
      
      {/* ══════════════════════════════════════════════════════════════════
          TOP NAVIGATION BAR (PLENUM BRAND ROYAL BLUE)
          ══════════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 border-b border-white/10 text-white">
        {/* Left: Brand Icon + Horizontal Navigation Links */}
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-md p-1">
              <img
                src="/image/logo.png"
                alt="Gesit People"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base tracking-tight text-white">Gesit People</span>
              <span className="text-[9px] text-blue-200/80 font-semibold tracking-wider uppercase mt-0.5">Nexora HCM</span>
            </div>
          </div>

          {/* Navigation Links (Pill Style as in Plenum Reference) */}
          <nav className="hidden xl:flex items-center gap-1.5 text-xs font-semibold text-blue-100/85">
            {/* Dashboard */}
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                    : 'hover:text-white hover:bg-white/10'
                )
              }
            >
              <span>Dashboard</span>
            </NavLink>

            {/* Data Karyawan */}
            <NavLink
              to="/employees"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                    : 'hover:text-white hover:bg-white/10'
                )
              }
            >
              <span>Data Karyawan</span>
            </NavLink>

            {/* Absensi Dropdown */}
            {attendance && attendance.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer outline-none',
                    pathname.startsWith('/attendance') || pathname === '/calendar'
                      ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                      : 'hover:text-white hover:bg-white/10'
                  )}
                >
                  <span>Absensi</span>
                  <ChevronDown className="size-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 p-1.5 rounded-2xl shadow-xl bg-white border border-slate-100">
                  {attendance.map((att) => (
                    <DropdownMenuItem
                      key={att.path}
                      onClick={() => navigate(att.path)}
                      className="text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer text-slate-700 hover:text-[#0A3D9E] hover:bg-blue-50"
                    >
                      {att.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Pengajuan & Approval (With Alert Badge) */}
            <NavLink
              to="/requests"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer',
                  isActive || pathname === '/approvals'
                    ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                    : 'hover:text-white hover:bg-white/10'
                )
              }
            >
              <span>Approvals</span>
              {Number(metrics?.pendingCount || 0) > 0 && (
                <span className="bg-[#EF4444] text-white text-[10px] font-black rounded-full px-1.5 py-0.2 min-w-[18px] text-center">
                  {metrics?.pendingCount}
                </span>
              )}
            </NavLink>

            {/* Catatan SP */}
            <NavLink
              to="/disciplinary"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                    : 'hover:text-white hover:bg-white/10'
                )
              }
            >
              <span>Catatan SP</span>
            </NavLink>

            {/* News */}
            <NavLink
              to="/news"
              className={({ isActive }) =>
                cn(
                  'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                    : 'hover:text-white hover:bg-white/10'
                )
              }
            >
              <span>Informasi</span>
            </NavLink>

            {/* Administrasi Dropdown */}
            {administration && administration.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(
                    'px-3.5 py-1.5 rounded-full transition-all inline-flex items-center gap-1 cursor-pointer outline-none',
                    pathname.startsWith('/admin') || pathname === '/settings' || pathname === '/analytics'
                      ? 'bg-white text-[#0A3D9E] shadow-sm font-bold'
                      : 'hover:text-white hover:bg-white/10'
                  )}
                >
                  <span>Administrasi</span>
                  <ChevronDown className="size-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-2xl shadow-xl bg-white border border-slate-100">
                  {administration.map((adm) => (
                    <DropdownMenuItem
                      key={adm.path}
                      onClick={() => navigate(adm.path)}
                      className="text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer text-slate-700 hover:text-[#0A3D9E] hover:bg-blue-50"
                    >
                      {adm.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        {/* Right Tools: Search, Notif, Theme, "+ Buat Pengajuan ⌘J", Avatar */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Circular Search */}
          <button
            type="button"
            onClick={onSearchClick}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Cari Data (Ctrl+K)"
          >
            <Search className="size-4" />
          </button>

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {isDark ? <Sun className="size-4 text-amber-300" /> : <Moon className="size-4 text-blue-100" />}
            </button>
          )}

          {/* Bell Notification */}
          <button
            type="button"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer relative"
            title="Notifikasi"
          >
            <Bell className="size-4" />
            {Number(metrics?.pendingCount || 0) > 0 && (
              <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-[#0A3D9E]" />
            )}
          </button>

          {/* User Profile Avatar Dropdown */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full ring-2 ring-white/30 overflow-hidden cursor-pointer outline-none">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser?.fullName || 'User'}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="size-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors">
                    <User className="size-4" />
                  </div>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl shadow-2xl bg-white border border-slate-100">
                <DropdownMenuLabel className="p-2.5">
                  <div className="font-bold text-xs text-slate-900 leading-tight">
                    {currentUser?.fullName || currentUser?.username || 'Pengguna'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {currentUser?.email || currentUser?.role || 'Staff HR'}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer">
                  <User className="size-3.5 mr-2 text-slate-500" /> Profil Saya
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/employees')} className="text-xs font-semibold py-2 px-3 rounded-xl cursor-pointer">
                  <Users className="size-3.5 mr-2 text-slate-500" /> Direktori Karyawan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem onClick={onLogout} className="text-xs font-bold py-2 px-3 rounded-xl cursor-pointer text-rose-600 hover:bg-rose-50">
                    <LogOut className="size-3.5 mr-2" /> Keluar dari Akun
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          HERO HEADER STRIP (BREADCRUMB, BOLD TITLE, SUBTITLE & METRIC CAPSULE)
          ══════════════════════════════════════════════════════════════════ */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 pt-3 pb-2 flex flex-col md:flex-row md:items-end justify-between gap-3 text-white">
        <div>
          <div className="text-xs font-medium text-blue-200/90 tracking-wide flex items-center gap-1.5">
            <span>{pageMeta.breadcrumb.split('/')[0]}</span>
            <span className="opacity-50">/</span>
            <span className="text-white font-semibold">{pageMeta.breadcrumb.split('/')[1] || 'Overview'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white mt-1">
            {pageMeta.title}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/75 mt-0.5 font-normal">
            {pageMeta.subtitle}
          </p>
        </div>

        {/* Right Metrics Capsule Pill (Plenum Glassmorphism) */}
        <div className="inline-flex items-center gap-3.5 bg-[#072d7d]/75 backdrop-blur-md border border-white/15 rounded-full px-4 py-2 text-xs text-white shadow-lg self-start md:self-end">
          <div className="flex items-center gap-2">
            <div className="flex items-end gap-0.5 h-3.5">
              <span className="w-1 h-2 bg-emerald-400 rounded-xs" />
              <span className="w-1 h-3.5 bg-cyan-400 rounded-xs" />
              <span className="w-1 h-2.5 bg-purple-400 rounded-xs" />
            </div>
            <span className="text-blue-200 text-xs font-normal">{pageMeta.metric1Label}</span>
            <strong className="font-bold text-sm text-white">{pageMeta.metric1Val}</strong>
          </div>

          <span className="h-3 w-px bg-white/20" />

          <div className="flex items-center gap-1.5">
            <span className="text-blue-200 text-xs font-normal">{pageMeta.metric2Label}</span>
            <strong className="font-bold text-sm text-white">{pageMeta.metric2Val}</strong>
          </div>

          <span className="h-3 w-px bg-white/20" />

          <div className="flex items-center gap-1.5">
            <span className="text-blue-200 text-xs font-normal">{pageMeta.metric3Label}</span>
            <strong className="font-bold text-sm text-white">{pageMeta.metric3Val}</strong>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA (FLOATING WHITE CARD ON ROYAL BLUE CANVAS)
          ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 px-3 sm:px-5 lg:px-7 pb-4 sm:pb-6 min-h-0 overflow-hidden flex flex-col">
        {isApprovalsPage ? (
          /* For approvals, the child component (PlenumApprovalInbox) manages its own card layout */
          <div className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
            {children}
          </div>
        ) : (
          /* For all other pages, wrap inside the massive floating white Plenum card */
          <div className="bg-white dark:bg-[#121215] text-slate-900 dark:text-zinc-100 rounded-[24px] sm:rounded-[28px] shadow-[0_24px_70px_rgba(0,0,0,0.35)] border border-white/20 p-4 sm:p-6 overflow-y-auto flex flex-col flex-1 min-h-0">
            {children}
          </div>
        )}
      </main>

    </div>
  );
}
