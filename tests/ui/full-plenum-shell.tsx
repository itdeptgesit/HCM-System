import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AttendanceRequest } from '../../components/attendance/AttendanceRequest';
import {
  AttendanceReport,
  AttendanceCalendar,
  AttendanceRadius,
} from '../../components/attendance';
import { EmployeeDataManager } from '../../components/EmployeeDataManager';
import { EmployeeWarningManager } from '../../components/disciplinary/EmployeeWarningManager';
import { CompanyNewsManager } from '../../components/hr/CompanyNewsManager';
import { MasterCompany } from '../../components/admin/MasterCompany';
import { MasterDepartment } from '../../components/admin/MasterDepartment';
import { ApprovalHierarchy } from '../../components/admin/ApprovalHierarchy';
import { PermissionMenu } from '../../components/admin/PermissionMenu';
import { AccountManagement } from '../../components/admin/AccountManagement';
import { ActivityLogsManager } from '../../components/admin/ActivityLogsManager';
import { SystemSettings } from '../../components/admin/SystemSettings';
import { AnalyticsDashboard } from '../../components/analytics/AnalyticsDashboard';
import { UserProfilePage } from '../../components/profile/UserProfilePage';
import LiveHRDashboard from '../../components/hr/LiveHRDashboard';
import { HRTopNavigation, type HRNavigationItem } from '../../components/hr/HRTopNavigation';
import { GlobalSearchDialog } from '../../components/GlobalSearchDialog';
import { ToastProvider } from '../../components/ToastProvider';
import { TooltipProvider } from '../../components/ui/tooltip';
import { Users } from '../../components/ui/icons';
import '../../index.css';

const navItems = (entries: [string, string][]): HRNavigationItem[] =>
  entries.map(([label, path]) => ({ label, path, icon: Users }));

const mockUser: any = {
  id: '1',
  fullName: 'Rudi Siarudin',
  email: 'rudi.siarudin@gesit.co.id',
  role: 'Super Admin',
  jobTitle: 'IT Specialist / HCM Admin',
  company: 'The Gesit Companies',
  username: 'rudisiarudin',
  status: 'active',
  department: 'IT & Operation',
  groups: ['HR', 'Super Admin'],
};

function FullPlenumAppShell({ initialRoute = '/requests' }: { initialRoute?: string }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [metrics, setMetrics] = React.useState<{
    headcount?: number;
    pendingCount?: number;
    attendanceRate?: string;
  }>();

  return (
    <TooltipProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <div
            className="flex h-screen w-screen flex-col overflow-hidden text-slate-900 font-sans selection:bg-[#12346a]/15 selection:text-[#12346a] bg-[#F8FAFC] dark:bg-[#09090B]"
          >
            {/* Top Navigation Bar: ALL SIDEBAR MOVED TO TOP */}
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
              breadcrumbLabel={initialRoute === '/' ? 'Dashboard' : 'Pengajuan & Approval'}
              metrics={metrics}
              onSearchClick={() => setSearchOpen(true)}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
              onLogout={() => {}}
            />

            {/* Main Full-Bleed Content View */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6 min-h-0 flex flex-col bg-[#F8FAFC] dark:bg-[#09090B]">
              <Routes>
                <Route
                  path="/"
                  element={
                    <LiveHRDashboard
                      currentUser={mockUser}
                      onMetricsUpdate={(m) =>
                        setMetrics({
                          headcount: m.totalHeadcount,
                          pendingCount: m.pendingCount,
                          attendanceRate: m.attendanceRate,
                        })
                      }
                    />
                  }
                />
                <Route path="/employees" element={<EmployeeDataManager currentUser={mockUser} />} />
                <Route path="/attendance" element={<AttendanceReport />} />
                <Route path="/attendance/report" element={<AttendanceReport />} />
                <Route path="/attendance/calendar" element={<AttendanceCalendar />} />
                <Route path="/calendar" element={<AttendanceCalendar />} />
                <Route path="/attendance/requests" element={<AttendanceRequest currentUser={mockUser} />} />
                <Route path="/attendance/locations" element={<AttendanceRadius />} />
                <Route path="/requests" element={<AttendanceRequest currentUser={mockUser} />} />
                <Route path="/approvals" element={<AttendanceRequest currentUser={mockUser} />} />
                <Route path="/news" element={<CompanyNewsManager currentUser={mockUser} />} />
                <Route path="/disciplinary" element={<EmployeeWarningManager currentUser={mockUser} />} />
                <Route path="/admin/companies" element={<MasterCompany />} />
                <Route path="/admin/departments" element={<MasterDepartment />} />
                <Route path="/admin/approval-hierarchy" element={<ApprovalHierarchy currentUser={mockUser} />} />
                <Route path="/admin/permissions" element={<PermissionMenu />} />
                <Route path="/admin/accounts" element={<AccountManagement />} />
                <Route path="/admin/activity-logs" element={<ActivityLogsManager />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/settings" element={<SystemSettings />} />
                <Route path="/profile" element={<UserProfilePage currentUser={mockUser} onUserUpdate={() => {}} />} />
              </Routes>
            </main>

            <GlobalSearchDialog
              open={searchOpen}
              onOpenChange={setSearchOpen}
              onToggleTheme={() => setIsDark(!isDark)}
              isDark={isDark}
              onLogout={() => {}}
            />
          </div>
        </MemoryRouter>
      </ToastProvider>
    </TooltipProvider>
  );
}

const urlParams = new URLSearchParams(window.location.search);
const startRoute = urlParams.get('route') || '/requests';

createRoot(document.getElementById('root')!).render(
  <FullPlenumAppShell initialRoute={startRoute} />
);
