import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileText,
  Briefcase,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Home,
  Search,
  Bell,
  ExternalLink,
  Building2,
  FolderTree,
  Lock,
  UserCheck,
  GitMerge,
  ChevronDown,
  ChevronRight,
  MapPin,
  Megaphone,
  User
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster, toast } from 'sonner';

// shadcn UI Components
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Kbd } from '@/components/ui/kbd';

// HR Components
import HRDashboard from './components/hr/LiveHRDashboard';
import { CompanyNewsManager } from './components/hr/CompanyNewsManager';
import { EmployeeDataManager } from './components/EmployeeDataManager';
import { AttendanceManager } from './components/AttendanceManager';
import {
  AttendanceDashboard,
  AttendanceReport,
  AttendanceCalendar,
  AttendanceRadius,
  AttendanceRequest
} from './components/attendance';
import { MasterCompany } from './components/admin/MasterCompany';
import { MasterDepartment } from './components/admin/MasterDepartment';
import { PermissionMenu } from './components/admin/PermissionMenu';
import { AccountManagement } from './components/admin/AccountManagement';
import { ApprovalHierarchy } from './components/admin/ApprovalHierarchy';
import { SystemSettings } from './components/admin/SystemSettings';
import { LoginPage } from './components/auth/LoginPage';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { AccessDenied } from './components/AccessDenied';
import { UserProfilePage } from './components/profile/UserProfilePage';
// PayrollManager sementara dinonaktifkan karena penggajian dikelola oleh tim Finance
// import { PayrollManager } from './components/payroll/PayrollManager';
import { RecruitmentManager } from './components/recruitment/RecruitmentManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { supabase } from './lib/supabaseClient';
import { loadCurrentHRUser } from './lib/workforceData';
import { isHRAccount } from './lib/workforce-contract';
import { hasPermission, PERMISSION_CHANGED_EVENT } from './lib/permissions';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendanceExpanded, setAttendanceExpanded] = useState(true);
  const [permissionVersion, setPermissionVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('gesit_user') || sessionStorage.getItem('gesit_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('gesit_user');
    sessionStorage.removeItem('gesit_user');
    setCurrentUser(null);
    toast.info('Anda telah keluar dari akun.');
    navigate('/login');
  };

  useEffect(() => {
    // Check Supabase connection
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('user_accounts').select('id').limit(1);
        setDbConnected(!error);
      } catch (err) {
        setDbConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Sinkronisasi otomatis data akun & peran dari database user_accounts jika user sedang login
  useEffect(() => {
    const refreshUserRole = async () => {
      try {
        const profile = await loadCurrentHRUser();
        setCurrentUser(profile);
        if (!profile) {
          localStorage.removeItem('gesit_user');
          sessionStorage.removeItem('gesit_user');
        } else if (window.location.pathname === '/login') navigate('/');
      } catch (err) {
        console.warn('Role refresh error:', err);
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    refreshUserRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handlePermissionsUpdated = () => setPermissionVersion(v => v + 1);
    window.addEventListener(PERMISSION_CHANGED_EVENT, handlePermissionsUpdated);
    return () => window.removeEventListener(PERMISSION_CHANGED_EVENT, handlePermissionsUpdated);
  }, []);

  if (authLoading) return <div role="status" className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#09090b] text-slate-600 dark:text-zinc-400 font-sans text-sm">Memuat sesi...</div>;

  // Login Page route protection
  if (location.pathname === '/login' || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          navigate('/attendance/report');
        }}
      />
    );
  }

  // Hak Akses & Peran Pengguna
  const userRole = (currentUser?.role || 'Employee').trim();
  const isSuperAdmin = userRole.toLowerCase() === 'super admin';
  const isHR = isHRAccount(currentUser);

  const canView = (moduleName: string) => hasPermission(userRole, moduleName, 'view');

  const isAttendanceActive =
    location.pathname.startsWith('/attendance') || location.pathname === '/calendar';

  const attendanceSubMenu = [
    { label: 'Report', path: '/attendance/report', icon: FileText },
    { label: 'Calendar', path: '/attendance/calendar', icon: Calendar },
    ...(canView('Master Company') || canView('Master Department') || isHR
      ? [{ label: 'Radius Office', path: '/attendance/locations', icon: MapPin }]
      : []),
  ];

  const navWorkspacePrimary = [
    ...(canView('Dashboard & KPI') ? [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }] : []),
    ...(canView('Data Karyawan') ? [{ label: 'Data Karyawan', path: '/employees', icon: Users }] : []),
  ];

  const navWorkspaceSecondary: { label: string; path: string; icon: typeof LayoutDashboard; badge?: string }[] = [
    ...(canView('Cuti & Izin')
      ? [{ label: 'Pengajuan & Approval', path: '/requests', icon: CheckCircle2 }]
      : []),
    // Menu Payroll dinonaktifkan sementara (dikelola Finance, bukan HR)
    // ...(canView('Payroll & Gaji')
    //   ? [{ label: 'Payroll', path: '/payroll', icon: CreditCard }]
    //   : []),
    ...(canView('Rekrutmen')
      ? [{ label: 'Rekrutmen', path: '/recruitment', icon: Briefcase }]
      : []),
    ...(isHR || canView('Dashboard & KPI')
      ? [{ label: 'News & Pengumuman', path: '/news', icon: Megaphone }]
      : []),
  ];

  // Menu Administrasi: Hanya tampil jika modul diizinkan di matriks hak akses
  const navAdmin = [
    ...(canView('Master Company') ? [{ label: 'Master Company', path: '/admin/companies', icon: Building2 }] : []),
    ...(canView('Master Department') ? [{ label: 'Master Department', path: '/admin/departments', icon: FolderTree }] : []),
    ...(canView('Hierarchy Approval') ? [{ label: 'Hierarchy Approval', path: '/admin/approval-hierarchy', icon: GitMerge }] : []),
    ...(canView('Permission Menu') ? [{ label: 'Permission Menu', path: '/admin/permissions', icon: Lock }] : []),
    ...(canView('Account Management') ? [{ label: 'Account Management', path: '/admin/accounts', icon: UserCheck }] : []),
    ...(canView('Laporan & Analitik') ? [{ label: 'Laporan & Analitik', path: '/analytics', icon: BarChart3 }] : []),
    ...(canView('Pengaturan Sistem') ? [{ label: 'Pengaturan', path: '/settings', icon: Settings }] : []),
  ];

  // Breadcrumb label helper
  const getBreadcrumbLabel = () => {
    if (location.pathname === '/profile') return 'Profil Saya';
    if (location.pathname === '/news') return 'News & Pengumuman Karyawan';
    if (location.pathname === '/attendance' || location.pathname === '/attendance/report') return 'Absensi / Report';
    if (location.pathname === '/attendance/calendar' || location.pathname === '/calendar')
      return 'Absensi / Calendar';
    if (location.pathname === '/attendance/locations') return 'Absensi / Radius Office';
    if (location.pathname === '/requests' || location.pathname === '/approvals') return 'Pengajuan & Approval';

    const ws1 = navWorkspacePrimary.find((n) => n.path === location.pathname);
    if (ws1) return ws1.label;
    const ws2 = navWorkspaceSecondary.find((n) => n.path === location.pathname);
    if (ws2) return ws2.label;
    const adm = navAdmin.find((n) => n.path === location.pathname);
    if (adm) return adm.label;
    if (location.pathname === '/admin/settings') return 'Pengaturan';
    return 'Dashboard';
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#12346a]/15 selection:text-[#12346a] dark:selection:bg-blue-500/25 dark:selection:text-blue-200">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header with Corporate Gesit theme */}
        <div className="flex h-20 items-center justify-between px-5 border-b border-transparent dark:border-[#222225]/40">
          <div className="flex items-center gap-3">
            <img src="/image/logo.png" alt="Gesit People" className="h-9 w-auto object-contain" />
            <div>
              <div className="text-base font-bold tracking-tight text-[#12346a] dark:text-blue-300 flex items-center gap-1">
                Gesit <span className="text-[#B38241] dark:text-[#d4af37]">People</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400 tracking-[0.14em] uppercase font-bold">
                HCM System
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">
              Workspace
            </div>
            <div className="space-y-1">
              {/* Primary workspace items */}
              {navWorkspacePrimary.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#12346a] text-white shadow-xs font-semibold dark:bg-blue-600 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  </NavLink>
                );
              })}

              {/* Absensi / Attendance with Expandable Sub-Menus */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setAttendanceExpanded(!attendanceExpanded);
                    if (!isAttendanceActive) {
                      navigate('/attendance/report');
                    }
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isAttendanceActive
                      ? attendanceExpanded
                        ? 'bg-blue-50/80 text-[#12346a] font-semibold dark:bg-blue-950/40 dark:text-blue-300'
                        : 'bg-[#12346a] text-white shadow-xs dark:bg-blue-600 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock
                      className={`h-4 w-4 shrink-0 ${
                        isAttendanceActive && attendanceExpanded ? 'text-[#12346a] dark:text-blue-300' : ''
                      }`}
                    />
                    <span>Absensi</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {attendanceExpanded ? (
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 ${
                          isAttendanceActive && attendanceExpanded ? 'text-[#12346a] dark:text-blue-300' : 'opacity-75'
                        }`}
                      />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-75" />
                    )}
                  </div>
                </button>

                {/* Sub Menu List: Report, Calendar, Radius Office */}
                {attendanceExpanded && (
                  <div className="ml-5 pl-3 border-l border-slate-200 dark:border-[#222225] space-y-1 py-1 transition-all">
                    {attendanceSubMenu.map((sub) => {
                      const SubIcon = sub.icon;
                      const currentPath = location.pathname.replace(/\/$/, '');
                      const isSubActive =
                        currentPath === sub.path ||
                        (sub.path === '/attendance/report' && currentPath === '/attendance') ||
                        (sub.path === '/attendance/calendar' && currentPath === '/calendar');
                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setSidebarOpen(false)}
                          className={`group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                            isSubActive
                              ? 'bg-[#12346a] text-white shadow-xs font-semibold dark:bg-blue-600 dark:text-white'
                              : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-200'
                          }`}
                        >
                          <SubIcon
                            className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                              isSubActive ? 'text-white' : 'text-slate-400 dark:text-zinc-500 group-hover:text-[#12346a] dark:group-hover:text-blue-300'
                            }`}
                          />
                          <span>{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Secondary workspace items */}
              {navWorkspaceSecondary.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/requests' && (location.pathname === '/requests' || location.pathname === '/approvals'));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-[#12346a] text-white shadow-xs font-semibold dark:bg-blue-600 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-amber-400 text-[#12346a]'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {navAdmin.length > 0 && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-zinc-500">
                Administration
              </div>
              <div className="space-y-1">
                {navAdmin.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[#12346a] text-white shadow-xs font-semibold dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help Center Link */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => toast.info('Pusat Bantuan & HR Helpdesk: hr.support@gesit.co.id')}
              className="w-full flex items-center justify-between rounded-xl px-3.5 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-[#18181c] dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                <span>Pusat Bantuan</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">v4.1</span>
            </button>
          </div>
        </nav>

        {/* Tenant Workspace Footer */}
        <div className="border-t border-slate-200/80 dark:border-[#222225] p-4 bg-white dark:bg-[#0c0c0e]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8E2D8] dark:bg-amber-950/40 text-xs font-bold text-[#786146] dark:text-amber-300 border border-amber-900/10 dark:border-amber-700/30">
                TG
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-900 dark:text-zinc-100">The Gesit Companies</div>
                <div className="truncate text-[10px] text-slate-500 dark:text-zinc-400">Corporate workspace</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-zinc-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header — Built with shadcn UI components */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/95 backdrop-blur-md px-4 sm:px-6 transition-colors">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="h-8.5 w-8.5 rounded-lg text-muted-foreground hover:text-foreground lg:hidden shrink-0 cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="h-4.5 w-4.5" />
            </Button>
            <Separator orientation="vertical" className="h-4 lg:hidden" />

            <Breadcrumb className="truncate">
              <BreadcrumbList className="text-xs sm:text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/');
                    }}
                    className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Workspace</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-none">
                    {getBreadcrumbLabel()}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right Header Items (Search, Theme, Notification, Profile Dropdown) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Bar with shadcn Input and Kbd */}
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Cari karyawan, menu, data..."
                className="h-8.5 w-52 lg:w-64 rounded-lg bg-muted/40 hover:bg-muted/60 focus-visible:bg-background border-border/70 pl-8 pr-11 text-xs placeholder:text-muted-foreground transition-all shadow-none"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <Kbd className="h-4 text-[10px] px-1 font-mono text-muted-foreground bg-muted/70">⌘K</Kbd>
              </div>
            </div>

            {/* Dark Mode Toggle with shadcn Tooltip & Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8.5 w-8.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  />
                }
              >
                {isDark ? (
                  <Sun className="h-4 w-4 text-amber-400" />
                ) : (
                  <Moon className="h-4 w-4 text-slate-600 dark:text-zinc-300" />
                )}
                <span className="sr-only">Toggle theme</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              </TooltipContent>
            </Tooltip>

            {/* Notifications Button with shadcn Tooltip & Button */}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-8.5 w-8.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer"
                    onClick={() => toast.info('Tidak ada notifikasi baru.')}
                  />
                }
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
                <span className="sr-only">Notifikasi</span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                Pemberitahuan & Notifikasi
              </TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-0.5 hidden sm:block" />

            {/* User Profile Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2.5 rounded-lg p-1 sm:px-2 sm:py-1 hover:bg-muted/70 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                }
              >
                <Avatar size="sm" className="h-7 w-7 border border-primary/20 shrink-0">
                  {currentUser?.avatar_url && (
                    <AvatarImage src={currentUser.avatar_url} alt={currentUser?.fullName || 'User'} />
                  )}
                  <AvatarFallback className="bg-[#12346a] dark:bg-blue-600 text-white text-[10px] font-bold">
                    {currentUser?.fullName
                      ? currentUser.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'AP'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <div className="text-xs font-semibold text-foreground leading-tight">
                    {currentUser?.fullName || 'Karyawan'}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-none flex items-center gap-1 mt-0.5">
                    <span className="font-semibold text-primary">{currentUser?.role || 'Employee'}</span>
                    {currentUser?.jobTitle && <span className="truncate max-w-[90px]">&bull; {currentUser.jobTitle}</span>}
                  </div>
                </div>
                <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" sideOffset={6} className="w-60 p-1.5 shadow-xl">
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold text-foreground leading-none">
                      {currentUser?.fullName || 'Pengguna'}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-none mt-1">
                      {currentUser?.email || '-'}
                    </p>
                    <div className="pt-1.5 flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold border-primary/30 text-primary">
                        {currentUser?.role || 'Employee'}
                      </Badge>
                      {currentUser?.company && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {currentUser.company}
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/profile')}
                  className="text-xs cursor-pointer gap-2 py-2 font-medium"
                >
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-foreground">Profil Saya</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/employees')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Data Karyawan</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/attendance/report')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Laporan Presensi</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/requests')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Pengajuan & Approval</span>
                </DropdownMenuItem>
                {canView('Pengaturan Sistem') && (
                  <DropdownMenuItem
                    onClick={() => navigate('/settings')}
                    className="text-xs cursor-pointer gap-2 py-2"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Pengaturan Sistem</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar dari Akun</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-slate-50/70 dark:bg-[#09090b] transition-colors">
          <Routes>
            <Route
              path="/"
              element={
                canView('Dashboard & KPI') ? (
                  <HRDashboard currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Dashboard & KPI"
                    requiredAccess="Izin Lihat Dashboard"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/employees"
              element={
                canView('Data Karyawan') ? (
                  <EmployeeDataManager currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Data Karyawan"
                    requiredAccess="Izin Lihat Data Karyawan"
                    currentUser={currentUser}
                  />
                )
              }
            />

            {/* Absensi & Sub-Menus */}
            <Route
              path="/attendance"
              element={
                canView('Absensi & Presensi') ? (
                  <AttendanceReport currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Absensi & Presensi"
                    requiredAccess="Izin Lihat Absensi & Presensi"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/attendance/report"
              element={
                canView('Absensi & Presensi') ? (
                  <AttendanceReport currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Laporan Absensi"
                    requiredAccess="Izin Lihat Absensi & Presensi"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/attendance/clock"
              element={
                canView('Absensi & Presensi') ? (
                  <AttendanceDashboard currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Clock In / Out"
                    requiredAccess="Izin Akses Presensi"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/attendance/calendar"
              element={
                canView('Absensi & Presensi') ? (
                  <AttendanceCalendar />
                ) : (
                  <AccessDenied
                    moduleName="Kalender Kerja"
                    requiredAccess="Izin Akses Presensi"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/attendance/locations"
              element={
                canView('Master Company') || canView('Master Department') || isHR ? (
                  <AttendanceRadius />
                ) : (
                  <AccessDenied
                    moduleName="Radius Office"
                    requiredAccess="Izin Administrasi / HR"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route path="/calendar" element={<AttendanceCalendar />} />
            <Route path="/news" element={<CompanyNewsManager currentUser={currentUser} />} />

            {/* Other Workspace Modules */}
            <Route
              path="/requests"
              element={
                canView('Cuti & Izin') ? (
                  <AttendanceRequest currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Pengajuan & Approval"
                    requiredAccess="Izin Pengajuan Cuti & Izin"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/approvals"
              element={
                canView('Cuti & Izin') ? (
                  <AttendanceRequest currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Persetujuan Cuti & Izin"
                    requiredAccess="Izin Approval Cuti & Izin"
                    currentUser={currentUser}
                  />
                )
              }
            />
            {/* Payroll Module (Dinonaktifkan sementara - diurus oleh Finance) */}
            <Route
              path="/payroll"
              element={<Navigate to="/" replace />}
            />
            <Route
              path="/recruitment"
              element={
                canView('Rekrutmen') ? (
                  <RecruitmentManager />
                ) : (
                  <AccessDenied
                    moduleName="Rekrutmen"
                    requiredAccess="Izin Lihat Rekrutmen"
                    currentUser={currentUser}
                  />
                )
              }
            />

            {/* Administration Modules */}
            <Route
              path="/admin/companies"
              element={
                canView('Master Company') ? (
                  <MasterCompany />
                ) : (
                  <AccessDenied
                    moduleName="Master Company"
                    requiredAccess="Izin Lihat Master Company"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/admin/departments"
              element={
                canView('Master Department') ? (
                  <MasterDepartment />
                ) : (
                  <AccessDenied
                    moduleName="Master Department"
                    requiredAccess="Izin Lihat Master Department"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/admin/approval-hierarchy"
              element={
                canView('Hierarchy Approval') ? (
                  <ApprovalHierarchy />
                ) : (
                  <AccessDenied
                    moduleName="Hierarchy Approval"
                    requiredAccess="Izin Akses Hierarchy Approval"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/admin/permissions"
              element={
                canView('Permission Menu') ? (
                  <PermissionMenu />
                ) : (
                  <AccessDenied
                    moduleName="Permission Menu"
                    requiredAccess="Super Admin / Otoritas Khusus"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/admin/accounts"
              element={
                canView('Account Management') ? (
                  <AccountManagement />
                ) : (
                  <AccessDenied
                    moduleName="Account Management"
                    requiredAccess="Izin Akses Manajemen Akun"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/analytics"
              element={
                canView('Laporan & Analitik') ? (
                  <AnalyticsDashboard />
                ) : (
                  <AccessDenied
                    moduleName="Laporan & Analitik"
                    requiredAccess="Izin Lihat Laporan & Analitik"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/settings"
              element={
                canView('Pengaturan Sistem') ? (
                  <SystemSettings currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Pengaturan Sistem"
                    requiredAccess="Izin Akses Pengaturan Sistem"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/admin/settings"
              element={
                canView('Pengaturan Sistem') ? (
                  <SystemSettings currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Pengaturan Sistem"
                    requiredAccess="Izin Akses Pengaturan Sistem"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/profile"
              element={
                <UserProfilePage
                  currentUser={currentUser}
                  onUserUpdate={(updated) => {
                    setCurrentUser(updated);
                    localStorage.setItem('gesit_user', JSON.stringify(updated));
                  }}
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
