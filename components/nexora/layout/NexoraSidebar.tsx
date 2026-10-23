import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Home,
  Users,
  Clock,
  Calendar,
  FileText,
  Building2,
  FolderTree,
  Settings,
  CheckCircle2,
  FileWarning,
  Megaphone,
  MapPin,
  History,
  BarChart3,
  LogOut,
  User,
  GitMerge,
  Lock,
  UserCheck,
  Folder,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Navigation,
} from '@/components/ui/icons';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabaseClient';

interface NexoraSidebarProps {
  currentUser?: any;
  onLogout?: () => void;
  isHR?: boolean;
  canView?: (module: string) => boolean;
}


export function NexoraSidebar({
  currentUser,
  onLogout,
  isHR = false,
  canView = () => true,
  ...props
}: NexoraSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, state, toggleSidebar } = useSidebar();
  const { t, isEn } = useLanguage();
  const pathname = location.pathname;

  // Active check helpers
  const isExactActive = (path: string) => pathname === path;
  const isSectionActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  const attendanceActive =
    pathname.startsWith('/attendance') || pathname === '/calendar';
  const adminActive =
    pathname.startsWith('/admin') ||
    pathname === '/settings' ||
    pathname === '/analytics';

  // Tree accordion state
  const [attendanceOpen, setAttendanceOpen] = React.useState(attendanceActive);
  const [adminOpen, setAdminOpen] = React.useState(adminActive);

  // Pending count badge (matching the pink dot / count badge in image)
  const [pendingRequestsCount, setPendingRequestsCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (attendanceActive) setAttendanceOpen(true);
  }, [attendanceActive]);

  React.useEffect(() => {
    if (adminActive) setAdminOpen(true);
  }, [adminActive]);

  // Fetch real pending requests count from Supabase
  React.useEffect(() => {
    const fetchPending = async () => {
      try {
        const { count, error } = await supabase
          .from('leave_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (!error && typeof count === 'number') {
          setPendingRequestsCount(count);
        }
      } catch {
        // Fallback silently
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 45000);
    return () => clearInterval(interval);
  }, []);

  const isCollapsed = state === 'collapsed';

  /* ─────────────────────────────────────────────────────────────
   * 1. COLLAPSED MODE: FLOATING CAPSULE PILL RAIL (Leftmost in image)
   * ───────────────────────────────────────────────────────────── */
  if (isCollapsed) {
    return (
      <Sidebar
        variant="sidebar"
        collapsible="icon"
        {...props}
        className="border-0 bg-transparent shadow-none select-none p-2.5 overflow-hidden [&_[data-slot=sidebar-inner]]:!bg-transparent [&_[data-slot=sidebar-inner]]:!shadow-none [&_[data-slot=sidebar-inner]]:!border-none"
      >
        <div className="flex h-[calc(100vh-1.25rem)] w-[54px] flex-col items-center justify-between rounded-full border border-neutral-300/60 bg-[#edf0f4] py-4 px-1 shadow-[0_4px_20px_rgba(0,0,0,0.04)] select-none dark:border-white/10 dark:bg-[#121622] transition-all mx-auto">
            {/* Top Company Logo Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggleSidebar}
                    aria-label="Expand Sidebar"
                    className="group relative flex size-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 cursor-pointer"
                  >
                    <img
                      src="/image/logo.png"
                      alt="Gesit People"
                      className="size-7 object-contain transition-transform group-hover:scale-105"
                    />
                  </button>
                }
              />
              <TooltipContent side="right" sideOffset={14} className="font-semibold text-xs">
                Gesit People ({isEn ? 'Expand' : 'Buka Menu'})
              </TooltipContent>
            </Tooltip>

            {/* Middle Nav Icons Stack matching reference image */}
            <div className="flex flex-col items-center gap-2.5 w-full">
              {/* 1. Dashboard / Home */}
              {canView('Dashboard') && isHR && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/')}
                        aria-label="Dashboard"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          isExactActive('/')
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Home className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.workspace}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 2. Data Karyawan */}
              {canView('Data Karyawan') && isHR && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/employees')}
                        aria-label="Data Karyawan"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          isSectionActive('/employees')
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Users className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.employees}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 3. Pengajuan & Approval (Messages with pink badge dot) */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => navigate('/requests')}
                      aria-label="Pengajuan & Approval"
                      className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                        isSectionActive('/requests') || isSectionActive('/approvals')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                          : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <CheckCircle2 className="size-4 stroke-[1.75]" />
                      {pendingRequestsCount > 0 && (
                        <span className="absolute top-1 right-1 size-2 rounded-full bg-pink-500 ring-2 ring-[#edf0f4] dark:ring-[#121622]" />
                      )}
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={14} className="text-xs">
                  {t.nav.requestsAndApprovals}
                  {pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}
                </TooltipContent>
              </Tooltip>

              {/* 4. Presensi & Absensi (Clock in circular pill) */}
              {isHR && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/attendance/report')}
                        aria-label="Presensi & Absensi"
                        className={`relative flex size-9 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          attendanceActive
                            ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.1)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Clock className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.attendance}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Hairline Divider with Center Dot */}
              <div className="relative my-2 h-10 w-px bg-neutral-300 dark:bg-zinc-700 flex items-center justify-center">
                <span className="size-1 rounded-full bg-neutral-400 dark:bg-zinc-500" />
              </div>

              {/* 5. Catatan SP */}
              {(canView('Catatan SP') || isHR) && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/disciplinary')}
                        aria-label="Catatan SP"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          isSectionActive('/disciplinary')
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <FileWarning className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.disciplinary}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 6. News & Pengumuman */}
              {(canView('Dashboard') || isHR) && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/news')}
                        aria-label="News"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          isSectionActive('/news')
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Megaphone className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.news}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 7. HR Documents / Files */}
              {isHR && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/files')}
                        aria-label="Dokumen HR"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          isSectionActive('/files')
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Folder className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.files}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 8. Administrasi */}
              {isHR && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => navigate('/admin/companies')}
                        aria-label="Administrasi"
                        className={`relative flex size-8 items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                          adminActive
                            ? 'bg-white text-neutral-950 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/5 font-bold scale-110 dark:bg-zinc-800 dark:text-white dark:ring-white/10'
                            : 'text-neutral-600 hover:bg-black/5 hover:text-neutral-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white'
                        }`}
                      >
                        <Settings className="size-4 stroke-[1.75]" />
                      </button>
                    }
                  />
                  <TooltipContent side="right" sideOffset={14} className="text-xs">
                    {t.nav.administration}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bottom Avatar & Expand Chevron */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleSidebar}
                aria-label="Expand"
                className="flex size-7 items-center justify-center rounded-full text-neutral-400 hover:bg-black/5 hover:text-neutral-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200 cursor-pointer transition-all"
              >
                <ChevronRight className="size-4" />
              </button>

              <Avatar className="size-8 rounded-full ring-2 ring-white dark:ring-zinc-800 shadow-xs cursor-pointer" onClick={() => navigate('/profile')}>
                {currentUser?.avatar_url && (
                  <AvatarImage src={currentUser.avatar_url} alt={currentUser?.fullName || 'User'} />
                )}
                <AvatarFallback className="bg-neutral-900 text-white text-[10px] font-bold dark:bg-white dark:text-neutral-900">
                  {currentUser?.fullName
                    ? currentUser.fullName
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'GP'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </Sidebar>
      );
    }

  /* ─────────────────────────────────────────────────────────────
   * 2. EXPANDED MODE: SINGLE FLOATING CARD SIDEBAR (Normal 1 Sidebar)
   * Real System Menus of Gesit People HCM
   * ───────────────────────────────────────────────────────────── */
  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      {...props}
      className="border-0 bg-transparent shadow-none select-none p-2.5 overflow-hidden [&_[data-slot=sidebar-inner]]:!bg-transparent"
    >
      <div className="flex h-[calc(100vh-1.25rem)] w-full flex-col justify-between rounded-[28px] border border-neutral-300/60 bg-[#edf0f4] p-3 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:border-white/10 dark:bg-[#121622] overflow-hidden transition-all">
        {/* Top Header: Company Logo + "Gesit People" + Collapse Chevron */}
        <div className="flex items-center justify-between px-2 pt-1.5 pb-2">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 cursor-pointer group select-none min-w-0"
          >
            <img
              src="/image/logo.png"
              alt="Gesit People"
              className="h-7 w-auto object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <span className="font-bold text-[16px] tracking-tight text-neutral-900 dark:text-white leading-tight truncate">
              Gesit <span className="text-[#2563eb] dark:text-blue-400">People</span>
            </span>
          </div>

          {/* Collapse to Pill Rail */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={toggleSidebar}
                  aria-label="Collapse to Pill Rail"
                  className="flex size-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
                >
                  <ChevronLeft className="size-4" />
                </button>
              }
            />
            <TooltipContent side="bottom" className="text-xs">
              {isEn ? 'Collapse to Pill Rail' : 'Kecilkan ke Pill Rail'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Middle Nav Items (Scrollable, no visible scrollbar, gradient fade at bottom) */}
        <div className="relative flex-1 min-h-0">
          <div className="h-full overflow-y-auto px-1 py-2 space-y-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* 1. Dashboard / Home */}
          {canView('Dashboard') && isHR && (
            <button
              onClick={() => navigate('/')}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isExactActive('/')
                  ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                  : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
              }`}
            >
              <Home className="size-4 stroke-[1.75] shrink-0" />
              <span className="truncate">{t.nav.workspace}</span>
            </button>
          )}

          {/* 2. Data Karyawan */}
          {canView('Data Karyawan') && isHR && (
            <button
              onClick={() => navigate('/employees')}
              className={`flex w-full items-center justify-between px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isSectionActive('/employees')
                  ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                  : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Users className="size-4 stroke-[1.75] shrink-0" />
                <span className="truncate">{t.nav.employees}</span>
              </div>
            </button>
          )}

          {/* 3. Pengajuan & Approval (with black pill counter badge) */}
          <button
            onClick={() => navigate('/requests')}
            className={`flex w-full items-center justify-between px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
              isSectionActive('/requests') || isSectionActive('/approvals')
                ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <CheckCircle2 className="size-4 stroke-[1.75] shrink-0" />
              <span className="truncate">{t.nav.requestsAndApprovals}</span>
            </div>
            {pendingRequestsCount > 0 ? (
              <span className="size-5 rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 text-[11px] font-bold flex items-center justify-center shrink-0">
                {pendingRequestsCount}
              </span>
            ) : null}
          </button>

          {/* 4. EXPANDABLE GROUP: Presensi (Collapsible Tree with Branch Line) */}
          {isHR && (
            <div className="pt-0.5">
              {/* Group Header: Solid Black Pill with minus icon when active/open */}
              <button
                onClick={() => setAttendanceOpen(!attendanceOpen)}
                className={`flex w-full items-center justify-between px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
                  attendanceActive
                    ? 'bg-[#141416] text-white shadow-md dark:bg-white dark:text-neutral-950'
                    : attendanceOpen
                    ? 'bg-neutral-200/80 text-neutral-900 dark:bg-zinc-800 dark:text-white'
                    : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="size-4 stroke-[1.75] shrink-0" />
                  <span className="truncate">{t.nav.attendance}</span>
                </div>
                {attendanceOpen ? (
                  <Minus className="size-3.5 stroke-[2.5] shrink-0 opacity-90" />
                ) : (
                  <Plus className="size-3.5 stroke-[2] shrink-0 opacity-60" />
                )}
              </button>

              {/* Submenu Tree: Indented with sleek vertical branch guide line */}
              {attendanceOpen && (
                <div className="relative ml-5 pl-4 border-l-2 border-neutral-300/80 dark:border-zinc-700/80 space-y-1.5 my-2 transition-all">
                  {/* Report Kehadiran */}
                  <button
                    onClick={() => navigate('/attendance/report')}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      isExactActive('/attendance/report')
                        ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                        : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <FileText className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                    <span className="truncate">{t.nav.attendanceReport}</span>
                  </button>

                  {/* Live GPS Tracking */}
                  <button
                    onClick={() => navigate('/attendance/map')}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      isExactActive('/attendance/map')
                        ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                        : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <Navigation className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                    <span className="truncate">{t.nav.attendanceMap}</span>
                  </button>

                  {/* Kalender Kerja */}
                  <button
                    onClick={() => navigate('/attendance/calendar')}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      isExactActive('/attendance/calendar')
                        ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                        : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <Calendar className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                    <span className="truncate">{t.nav.attendanceCalendar}</span>
                  </button>

                  {/* Radius Office */}
                  <button
                    onClick={() => navigate('/attendance/locations')}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      isExactActive('/attendance/locations')
                        ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                        : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                    }`}
                  >
                    <MapPin className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                    <span className="truncate">{t.nav.attendanceLocations}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 5. Catatan SP Karyawan */}
          {(canView('Catatan SP') || isHR) && (
            <button
              onClick={() => navigate('/disciplinary')}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isSectionActive('/disciplinary')
                  ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                  : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
              }`}
            >
              <FileWarning className="size-4 stroke-[1.75] shrink-0" />
              <span className="truncate">{t.nav.disciplinary}</span>
            </button>
          )}

          {/* 6. News & Pengumuman */}
          {(canView('Dashboard') || isHR) && (
            <button
              onClick={() => navigate('/news')}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isSectionActive('/news')
                  ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                  : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
              }`}
            >
              <Megaphone className="size-4 stroke-[1.75] shrink-0" />
              <span className="truncate">{t.nav.news}</span>
            </button>
          )}

          {/* 7. Dokumen HR / Files */}
          {isHR && (
            <button
              onClick={() => navigate('/files')}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-full text-[13.5px] font-medium transition-all duration-150 cursor-pointer ${
                isSectionActive('/files')
                  ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold dark:bg-zinc-800 dark:text-white'
                  : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
              }`}
            >
              <Folder className="size-4 stroke-[1.75] shrink-0" />
              <span className="truncate">{t.nav.files}</span>
            </button>
          )}

          {/* 8. EXPANDABLE GROUP: Administrasi & Master */}
          {isHR && (
            <div className="pt-0.5">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={`flex w-full items-center justify-between px-4 py-2.5 rounded-full text-[13.5px] font-semibold transition-all duration-200 cursor-pointer ${
                  adminActive
                    ? 'bg-[#141416] text-white shadow-md dark:bg-white dark:text-neutral-950'
                    : adminOpen
                    ? 'bg-neutral-200/80 text-neutral-900 dark:bg-zinc-800 dark:text-white'
                    : 'text-neutral-700 hover:bg-neutral-200/60 hover:text-neutral-950 dark:text-zinc-300 dark:hover:bg-zinc-800/60 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="size-4 stroke-[1.75] shrink-0" />
                  <span className="truncate">{t.nav.administration}</span>
                </div>
                {adminOpen ? (
                  <Minus className="size-3.5 stroke-[2.5] shrink-0 opacity-90" />
                ) : (
                  <Plus className="size-3.5 stroke-[2] shrink-0 opacity-60" />
                )}
              </button>

              {adminOpen && (
                <div className="relative ml-5 pl-4 border-l-2 border-neutral-300/80 dark:border-zinc-700/80 space-y-1.5 my-2 transition-all">
                  {canView('Master Company') && (
                    <button
                      onClick={() => navigate('/admin/companies')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/companies')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <Building2 className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminCompany}</span>
                    </button>
                  )}

                  {canView('Master Department') && (
                    <button
                      onClick={() => navigate('/admin/departments')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/departments')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <FolderTree className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminDepartment}</span>
                    </button>
                  )}

                  {canView('Hierarchy Approval') && (
                    <button
                      onClick={() => navigate('/admin/approval-hierarchy')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/approval-hierarchy')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <GitMerge className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminApprovalHierarchy}</span>
                    </button>
                  )}

                  {canView('Permission Menu') && (
                    <button
                      onClick={() => navigate('/admin/permissions')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/permissions')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <Lock className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminPermissionMenu}</span>
                    </button>
                  )}

                  {canView('Account Management') && (
                    <button
                      onClick={() => navigate('/admin/accounts')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/accounts')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <UserCheck className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminUserAccounts}</span>
                    </button>
                  )}

                  {canView('Log Aktivitas') && (
                    <button
                      onClick={() => navigate('/admin/activity-logs')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/admin/activity-logs')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <History className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminAuditLogs}</span>
                    </button>
                  )}

                  {canView('Laporan & Analitik') && (
                    <button
                      onClick={() => navigate('/analytics')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/analytics')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <BarChart3 className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminReportsAnalytics}</span>
                    </button>
                  )}

                  {canView('Pengaturan Sistem') && (
                    <button
                      onClick={() => navigate('/settings')}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                        isExactActive('/settings')
                          ? 'bg-white text-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ring-1 ring-black/5 font-semibold scale-102 dark:bg-zinc-800 dark:text-white'
                          : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-200/50 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      <Settings className="size-3.5 stroke-[1.75] shrink-0 opacity-80" />
                      <span className="truncate">{t.nav.adminSystemSettings}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
          {/* Gradient fade — hints there's more content to scroll */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#edf0f4] dark:from-[#121622] to-transparent rounded-b-[8px]"
          />
        </div>

        {/* Bottom User Profile */}
        <div className="pt-2 border-t border-neutral-300/50 dark:border-zinc-800/80">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  className="flex w-full items-center gap-2.5 p-2 rounded-2xl text-left transition-colors hover:bg-neutral-200/60 dark:hover:bg-zinc-800/60 cursor-pointer select-none"
                >
                  <Avatar className="size-8 rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                    {currentUser?.avatar_url && (
                      <AvatarImage src={currentUser.avatar_url} alt={currentUser?.fullName || 'User'} />
                    )}
                    <AvatarFallback className="bg-neutral-950 text-white text-[11px] font-bold dark:bg-white dark:text-neutral-950">
                      {currentUser?.fullName
                        ? currentUser.fullName
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'GP'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col min-w-0 flex-1 leading-tight">
                    <span className="truncate font-semibold text-xs text-neutral-900 dark:text-white">
                      {currentUser?.fullName || 'User Gesit'}
                    </span>
                    <span className="truncate text-[10.5px] text-neutral-500 dark:text-zinc-400 mt-0.5">
                      {currentUser?.role || 'Staff'}
                    </span>
                  </div>
                </button>
              }
            />

            <DropdownMenuContent
              className="w-56 p-1.5 shadow-xl rounded-xl bg-white dark:bg-[#18181b] border border-neutral-200 dark:border-zinc-800"
              side={isMobile ? 'bottom' : 'top'}
              align="start"
              sideOffset={8}
            >
              <DropdownMenuLabel className="font-normal p-2">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {currentUser?.fullName || 'User'}
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-zinc-400 truncate">
                    {currentUser?.email || '-'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/profile')}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <User className="size-3.5 text-neutral-500" />
                <span>{isEn ? 'My Profile' : 'Profil Saya'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/employees')}
                className="text-xs cursor-pointer gap-2 py-2"
              >
                <Users className="size-3.5 text-neutral-500" />
                <span>{t.nav.employeeData}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onLogout && (
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                >
                  <LogOut className="size-3.5" />
                  <span>{t.nav.signOut}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Sidebar>
  );
}
