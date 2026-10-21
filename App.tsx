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
  User,
  History,
  FileWarning
} from '@/components/ui/icons';
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
import { GlobalSearchDialog } from './components/GlobalSearchDialog';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { NexoraSidebar } from './components/nexora/layout/NexoraSidebar';
import { NexoraHeader } from './components/nexora/layout/NexoraHeader';
import { CompanyNewsManager } from './components/hr/CompanyNewsManager';
import { EmployeeDataManager } from './components/EmployeeDataManager';
import { EmployeeWarningManager } from './components/disciplinary/EmployeeWarningManager';
import { AttendanceManager } from './components/AttendanceManager';
import {
  AttendanceDashboard,
  AttendanceReport,
  AttendanceCalendar,
  AttendanceRadius,
  AttendanceRequest,
  LiveAttendanceMap
} from './components/attendance';
import { HRWorkforceCalendar } from './components/nexora/calendar/HRWorkforceCalendar';
import { MasterCompany } from './components/admin/MasterCompany';
import { MasterDepartment } from './components/admin/MasterDepartment';
import { PermissionMenu } from './components/admin/PermissionMenu';
import { AccountManagement } from './components/admin/AccountManagement';
import { ApprovalHierarchy } from './components/admin/ApprovalHierarchy';
import { ActivityLogsManager } from './components/admin/ActivityLogsManager';
import { SystemSettings } from './components/admin/SystemSettings';
import { LoginPage } from './components/auth/LoginPage';
import { EmailApprovalPage } from './components/approvals/EmailApprovalPage';
import { ModulePlaceholder } from './components/ModulePlaceholder';
import { AccessDenied } from './components/AccessDenied';
import { UserProfilePage } from './components/profile/UserProfilePage';
// PayrollManager sementara dinonaktifkan karena penggajian dikelola oleh tim Finance
// import { PayrollManager } from './components/payroll/PayrollManager';
// RecruitmentManager sementara dinonaktifkan
// import { RecruitmentManager } from './components/recruitment/RecruitmentManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { supabase } from './lib/supabaseClient';
import { loadCurrentHRUser } from './lib/workforceData';
import { isHRAccount } from './lib/workforce-contract';
import { hasPermission, PERMISSION_CHANGED_EVENT } from './lib/permissions';
import { trackActivity } from './lib/auditLogger';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    if (currentUser) {
      trackActivity({
        userId: currentUser.id,
        userName: currentUser.fullName || currentUser.name || currentUser.username,
        userRole: currentUser.role,
        userEmail: currentUser.email,
        module: 'Autentikasi',
        action: 'LOGOUT',
        details: `User logout dari sistem`,
      }).catch(() => {});
    }
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

  // Public approval page linked from email; it authorizes itself with a signed token.
  if (location.pathname === '/email-approval') return <EmailApprovalPage />;

  if (authLoading) return <div role="status" className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#09090b] text-slate-600 dark:text-zinc-400 font-sans text-sm">Memuat sesi...</div>;

  // Login Page route protection
  if (location.pathname === '/login' || !currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          if (isHRAccount(user)) {
            navigate('/attendance/report');
          } else {
            navigate('/requests');
          }
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

  // Jika BUKAN grup HR / Admin, menu selain Request tidak ditampilkan sama sekali
  const attendanceSubMenu = isHR ? [
    { label: 'Report', path: '/attendance/report', icon: FileText },
    { label: 'Request Absen', path: '/attendance/requests', icon: Clock },
    { label: 'Calendar', path: '/attendance/calendar', icon: Calendar },
    ...(canView('Master Company') || canView('Master Department') || isHR
      ? [{ label: 'Radius Office', path: '/attendance/locations', icon: MapPin }]
      : []),
  ] : [];

  const navWorkspacePrimary = isHR ? [
    ...(canView('Dashboard') ? [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }] : []),
    ...(canView('Data Karyawan') ? [{ label: 'Data Karyawan', path: '/employees', icon: Users }] : []),
  ] : [];

  const navWorkspaceSecondary: { label: string; path: string; icon: typeof LayoutDashboard; badge?: string }[] = isHR ? [
    ...(canView('Cuti & Izin')
      ? [{ label: 'Pengajuan & Approval', path: '/requests', icon: CheckCircle2 }]
      : []),
    ...(canView('Catatan SP') || isHR
      ? [{ label: 'Catatan SP Karyawan', path: '/disciplinary', icon: FileWarning }]
      : []),
    ...(isHR || canView('Dashboard')
      ? [{ label: 'News & Pengumuman', path: '/news', icon: Megaphone }]
      : []),
  ] : [
    { label: 'Request & Approval', path: '/requests', icon: CheckCircle2 }
  ];

  // Menu Administrasi: Hanya tampil jika user adalah tim HR / Admin
  const navAdmin = isHR ? [
    ...(canView('Master Company') ? [{ label: 'Master Company', path: '/admin/companies', icon: Building2 }] : []),
    ...(canView('Master Department') ? [{ label: 'Master Department', path: '/admin/departments', icon: FolderTree }] : []),
    ...(canView('Hierarchy Approval') ? [{ label: 'Hierarchy Approval', path: '/admin/approval-hierarchy', icon: GitMerge }] : []),
    ...(canView('Permission Menu') ? [{ label: 'Permission Menu', path: '/admin/permissions', icon: Lock }] : []),
    ...(canView('Account Management') ? [{ label: 'Account Management', path: '/admin/accounts', icon: UserCheck }] : []),
    ...(canView('Log Aktivitas') ? [{ label: 'Log Aktivitas', path: '/admin/activity-logs', icon: History }] : []),
    ...(canView('Laporan & Analitik') ? [{ label: 'Laporan & Analitik', path: '/analytics', icon: BarChart3 }] : []),
    ...(canView('Pengaturan Sistem') ? [{ label: 'Pengaturan', path: '/settings', icon: Settings }] : []),
  ] : [];

  // Breadcrumb label helper
  const getBreadcrumbLabel = () => {
    if (location.pathname === '/profile') return 'Profil Saya';
    if (location.pathname === '/disciplinary' || location.pathname.startsWith('/disciplinary')) return 'Catatan SP Karyawan';
    if (location.pathname === '/news') return 'News & Pengumuman Karyawan';
    if (location.pathname === '/attendance' || location.pathname === '/attendance/report') return 'Absensi / Report';
    if (location.pathname === '/attendance/requests') return 'Absensi / Request Absen';
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
    if (location.pathname === '/admin/activity-logs') return 'Log Aktivitas & Audit';
    if (location.pathname === '/admin/settings') return 'Pengaturan';
    return 'Dashboard';
  };

  return (
    <SidebarProvider className="h-screen w-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#09090B] text-slate-900 dark:text-zinc-100 font-sans selection:bg-[#12346a]/15 selection:text-[#12346a]">
      <NexoraSidebar
        currentUser={currentUser}
        isHR={isHR}
        canView={canView}
        onLogout={handleLogout}
      />
      <SidebarInset className="overflow-hidden flex flex-col min-w-0 bg-[#F8FAFC] dark:bg-[#09090B]">
        <NexoraHeader
          currentUser={currentUser}
          breadcrumbLabel={getBreadcrumbLabel()}
          onSearchClick={() => setSearchOpen(true)}
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          onLogout={handleLogout}
        />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7">
          <Routes>
            <Route
              path="/"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Dashboard') ? (
                  <HRDashboard currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Dashboard"
                    requiredAccess="Izin Lihat Dashboard"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/employees"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Data Karyawan') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Absensi & Presensi') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Absensi & Presensi') ? (
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
              path="/attendance/map"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Absensi & Presensi') ? (
                  <LiveAttendanceMap currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Peta Sebaran Presensi"
                    requiredAccess="Izin Lihat Absensi & Presensi"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/attendance/clock"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Absensi & Presensi') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Absensi & Presensi') ? (
                  <HRWorkforceCalendar currentUser={currentUser} />
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
              path="/attendance/requests"
              element={<AttendanceRequest currentUser={currentUser} />}
            />
            <Route
              path="/attendance/locations"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Master Company') || canView('Master Department') || isHR ? (
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
            <Route
              path="/calendar"
              element={!isHR ? <Navigate to="/requests" replace /> : <HRWorkforceCalendar currentUser={currentUser} />}
            />
            <Route
              path="/news"
              element={!isHR ? <Navigate to="/requests" replace /> : <CompanyNewsManager currentUser={currentUser} />}
            />
            <Route
              path="/disciplinary"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Catatan SP') || isHR ? (
                  <EmployeeWarningManager currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Catatan SP"
                    requiredAccess="Izin Lihat Catatan SP"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/sp-records"
              element={<Navigate to="/disciplinary" replace />}
            />

            {/* Other Workspace Modules */}
            <Route
              path="/requests"
              element={<AttendanceRequest currentUser={currentUser} />}
            />
            <Route
              path="/approvals"
              element={<AttendanceRequest currentUser={currentUser} />}
            />
            {/* Payroll Module (Dinonaktifkan sementara - diurus oleh Finance) */}
            <Route
              path="/payroll"
              element={<Navigate to="/" replace />}
            />
            {/* Recruitment Module (Dinonaktifkan sementara) */}
            <Route
              path="/recruitment"
              element={<Navigate to="/" replace />}
            />

            {/* Administration Modules */}
            <Route
              path="/admin/companies"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Master Company') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Master Department') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Hierarchy Approval') ? (
                  <ApprovalHierarchy currentUser={currentUser} />
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Permission Menu') ? (
                  <PermissionMenu currentUser={currentUser} />
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Account Management') ? (
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
              path="/admin/activity-logs"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Log Aktivitas') ? (
                  <ActivityLogsManager currentUser={currentUser} />
                ) : (
                  <AccessDenied
                    moduleName="Log Aktivitas"
                    requiredAccess="Izin Lihat Log Aktivitas"
                    currentUser={currentUser}
                  />
                )
              }
            />
            <Route
              path="/analytics"
              element={
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Laporan & Analitik') ? (
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
                !isHR ? (
                  <Navigate to="/requests" replace />
                ) : canView('Pengaturan Sistem') ? (
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
      </SidebarInset>
      <GlobalSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        isDark={isDark}
        onLogout={handleLogout}
      />
    </SidebarProvider>
  );
}
