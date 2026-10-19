import type { ComponentType } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Clock,
  Settings,
  FileText,
  Search,
  Bell,
  Sun,
  Moon,
  User,
  LogOut,
  Users,
  CheckCircle2,
  Sparkles
} from '@/components/ui/icons';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface HRNavigationItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
}

export interface HRTopNavigationProps {
  primary: HRNavigationItem[];
  secondary: HRNavigationItem[];
  attendance: HRNavigationItem[];
  administration: HRNavigationItem[];
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
}

export function HRTopNavigation({
  primary,
  secondary,
  attendance,
  administration,
  currentUser,
  onLogout,
  isDark,
  onToggleTheme,
  breadcrumbLabel = 'Dashboard',
  onSearchClick,
  metrics,
}: HRTopNavigationProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) =>
    pathname === path ||
    (path === '/requests' && pathname === '/approvals') ||
    (path === '/attendance/report' && pathname === '/attendance') ||
    (path === '/attendance/calendar' && pathname === '/calendar');

  const itemClass = (active: boolean) =>
    `relative text-[13px] font-medium px-4 py-1.5 rounded-full transition-all inline-flex items-center gap-1.5 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
      active
        ? 'bg-white text-[#0f1a42] shadow-sm font-bold'
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`;

  const link = (item: HRNavigationItem) => {
    const active = isActive(item.path);
    const hasDot = item.path === '/requests';
    return (
      <NavLink
        key={item.path}
        to={item.path}
        end
        className={itemClass(active)}
        aria-current={active ? 'page' : undefined}
      >
        <span>{item.label}</span>
        {hasDot && (
          <span className="w-1.5 h-1.5 bg-[#ff7a1a] rounded-full inline-block shrink-0" />
        )}
      </NavLink>
    );
  };

  const group = (
    label: string,
    items: HRNavigationItem[],
    _icon: HRNavigationItem['icon']
  ) => {
    if (!items.length) return null;
    const active = items.some((item) => isActive(item.path));
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button type="button" className={itemClass(active)} />}
        >
          <span>{label}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="w-56 rounded-2xl p-1.5 shadow-2xl bg-white dark:bg-[#18181b] border border-[#e2e8f0] dark:border-[#27272a]"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            const itemActive = isActive(item.path);
            return (
              <DropdownMenuItem
                key={item.path}
                render={<NavLink to={item.path} />}
                aria-current={itemActive ? 'page' : undefined}
                className={`min-h-9 cursor-pointer text-xs rounded-xl px-3 py-2 ${
                  itemActive
                    ? 'bg-[#0f1a42] text-white font-semibold dark:bg-blue-600'
                    : 'text-[#0f172a] dark:text-zinc-200 hover:bg-[#f8fafc] dark:hover:bg-[#27272a]'
                }`}
              >
                <ItemIcon className="h-3.5 w-3.5" />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const approvals = secondary.filter((item) => item.path === '/requests');
  const information = secondary.filter((item) => item.path !== '/requests');

  return (
    <div
      className="w-full shrink-0 px-4 sm:px-6 2xl:px-8 pt-3 pb-2 bg-[#091a3e] border-b border-white/10"
      data-hr-top-navigation
    >
      <div className="mx-auto max-w-[1720px]">
        {/* ── PLENUM FLOATING PILL NAV DOCK (EXACT REPLICA) ── */}
        <div className="w-full bg-[#0f1a42] md:bg-gradient-to-r md:from-[#121f4f] md:to-[#1b2d6b] rounded-full min-h-[54px] flex items-center justify-between px-3 sm:px-4 md:px-5 py-2 text-white relative gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.25)] border border-white/10">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div
            className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none"
            onClick={() => navigate('/')}
          >
            <div className="w-7 h-7 rounded-full bg-white text-[#0f1a42] flex items-center justify-center font-bold text-[13px] tracking-tight shadow-xs">
              G
            </div>
            <span className="font-semibold text-[15px] tracking-tight flex items-center gap-1">
              Gesit <span className="text-[#f59e0b] font-bold">People</span>
            </span>
          </div>

          {/* Navigation Pill Links */}
          <nav
            aria-label="Navigasi utama HR"
            className="hidden lg:flex items-center gap-1"
          >
            {primary.map(link)}
            {group('Absensi', attendance, Clock)}
            {approvals.map(link)}
            {group('Informasi', information, FileText)}
            {group('Administrasi', administration, Settings)}
          </nav>
        </div>

        {/* Right: Search, Notifications, AI Ask, User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Button */}
          <button
            type="button"
            onClick={onSearchClick}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition cursor-pointer"
            title="Cari data (Ctrl+K)"
          >
            <Search className="w-4 h-4 text-white/80" />
          </button>

          {/* Dark / Light Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition cursor-pointer text-white/80"
              title={isDark ? 'Mode Terang' : 'Mode Gelap'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-white" />}
            </button>
          )}

          {/* Notification Bell */}
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition relative cursor-pointer"
            title="Pemberitahuan"
          >
            <Bell className="w-4 h-4 text-white/80" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-400 rounded-full" />
          </button>

          {/* Ask AI Pill Button */}
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="hidden sm:flex bg-white text-[#0f1a42] text-[13px] font-semibold px-4 h-8 rounded-full items-center gap-1.5 hover:bg-white/90 transition cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Buat Pengajuan</span>
          </button>

          {/* User Profile Dropdown Avatar */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shadow-xs border border-white/20 outline-none"
                    title={currentUser?.fullName || 'User'}
                  />
                }
              >
                {currentUser?.fullName
                  ? currentUser.fullName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'GP'}
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-56 p-1.5 shadow-2xl rounded-2xl bg-white dark:bg-[#18181b] border border-[#e2e8f0] dark:border-[#27272a]"
              >
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold text-[#0f172a] dark:text-white leading-none">
                      {currentUser?.fullName || 'Pengguna'}
                    </p>
                    <p className="text-[10px] text-[#64748b] dark:text-zinc-400 truncate leading-none mt-1">
                      {currentUser?.email || '-'}
                    </p>
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 font-semibold border-blue-500/30 text-blue-600 dark:text-blue-300"
                      >
                        {currentUser?.role || 'Employee'}
                      </Badge>
                      {currentUser?.company && (
                        <span className="text-[10px] text-[#64748b] dark:text-zinc-400 truncate max-w-[120px]">
                          {currentUser.company}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <User className="h-3.5 w-3.5 text-[#64748b] dark:text-zinc-300" />
                  <span>Profil Saya</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/employees')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <Users className="h-3.5 w-3.5 text-[#64748b] dark:text-zinc-300" />
                  <span>Data Karyawan</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/requests')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#64748b] dark:text-zinc-300" />
                  <span>Pengajuan & Approval</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Keluar dari Akun</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* ── PLENUM SUBHEADER (TITLE + BREADCRUMBS + RIGHT KPI CAPSULE PILL) (Only on Dashboard) ── */}
      {pathname === '/' && (
        <div className="px-2 sm:px-3 md:px-5 pt-3 pb-2 flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Left: Title + Tag + Breadcrumbs */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-bold tracking-tight text-white">
                {breadcrumbLabel}
              </h1>
              <span className="text-[11px] text-blue-200 font-medium bg-white/10 border border-white/15 px-2.5 py-0.5 rounded-full">
                The Gesit Companies • Live
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[12px]">
              <span className="text-white/80 font-medium cursor-pointer" onClick={() => navigate('/')}>
                Workspace
              </span>
              <span className="text-blue-300/40">/</span>
              <span className="text-blue-200/90">{breadcrumbLabel}</span>
            </div>
          </div>

          {/* Right: Plenum 3-metric KPI Pill Container */}
          <div className="flex flex-wrap items-center gap-0 bg-black/25 backdrop-blur-md border border-white/15 rounded-full p-1.5 shadow-xs max-w-full text-white">
            <div className="flex items-center gap-2 px-3.5 py-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-200/80">
                Karyawan
              </span>
              <span className="text-xs font-bold text-white">
                {metrics?.headcount !== undefined ? `${metrics.headcount} Aktif` : '73 Aktif'}
              </span>
            </div>
            <div className="hidden sm:block w-px h-3.5 bg-white/20" />
            <div className="flex items-center gap-2 px-3.5 py-1 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-white/30 border border-white/40" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-200/80">
                Approval
              </span>
              <span className="text-xs font-bold text-white">
                {metrics?.pendingCount !== undefined ? `${metrics.pendingCount} Menunggu` : '0 Menunggu'}
              </span>
            </div>
            <div className="hidden sm:block w-px h-3.5 bg-white/20" />
            <div className="flex items-center gap-2 pl-3.5 pr-2.5 py-0.5 whitespace-nowrap">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-200/80">
                Presensi
              </span>
              <span className="text-xs font-bold text-white">
                {metrics?.attendanceRate ? `${metrics.attendanceRate}%` : '0,0%'}
              </span>
              {/* Mini spark bar chart */}
              <div className="ml-2 w-8 h-4 flex items-end gap-0.5">
                {[3, 5, 4, 7, 5, 8, 6].map((d, v) => (
                  <div
                    key={v}
                    className={`w-1 rounded-full ${
                      v === 6 ? 'bg-amber-400' : 'bg-white/30'
                    }`}
                    style={{ height: `${d * 1.8 + 3}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
