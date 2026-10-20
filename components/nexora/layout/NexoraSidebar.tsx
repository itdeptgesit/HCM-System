import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NexoraCompanySwitcher } from './NexoraCompanySwitcher';
import {
  Home,
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileText,
  Building2,
  FolderTree,
  Settings,
  ChevronRight,
  ChevronsUpDown,
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
  Building,
  Navigation,
} from '@/components/ui/icons';
import { useLanguage } from '@/context/LanguageContext';

interface NexoraSidebarProps {
  currentUser?: any;
  onLogout?: () => void;
  isHR?: boolean;
  canView?: (module: string) => boolean;
}

const itemClasses = [
  'cursor-pointer select-none rounded-xl',
  'transition-all duration-150',
  'text-slate-600 dark:text-zinc-400',
  'hover:!bg-[#f4f4f6] dark:hover:!bg-zinc-800/70',
  'hover:!text-slate-900 dark:hover:!text-white',
  'data-[active=true]:!bg-[#f0f1f4] dark:data-[active=true]:!bg-zinc-800',
  'data-[active=true]:!text-slate-900 dark:data-[active=true]:!text-white',
  'data-[active=true]:!font-semibold',
  'data-active:!bg-[#f0f1f4] dark:data-active:!bg-zinc-800',
  'data-active:!text-slate-900 dark:data-active:!text-white',
  'data-active:!font-semibold',
].join(' ');

export function NexoraSidebar({
  currentUser,
  onLogout,
  isHR = false,
  canView = () => true,
  ...props
}: NexoraSidebarProps & React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { t, isEn } = useLanguage();
  const pathname = location.pathname;

  const isExactActive = (path: string) => pathname === path;
  const isSectionActive = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  const attendanceActive =
    pathname.startsWith('/attendance') || pathname === '/calendar';
  const adminActive =
    pathname.startsWith('/admin') ||
    pathname === '/settings' ||
    pathname === '/analytics';

  const [attendanceOpen, setAttendanceOpen] = React.useState(attendanceActive);
  const [adminOpen, setAdminOpen] = React.useState(adminActive);

  React.useEffect(() => {
    if (attendanceActive) setAttendanceOpen(true);
  }, [attendanceActive]);

  React.useEffect(() => {
    if (adminActive) setAdminOpen(true);
  }, [adminActive]);

  return (
    <Sidebar variant="inset" collapsible="icon" {...props} className="border-r border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#0c0c0e]">
      {/* ── HEADER: APP BRAND CARD ── */}
      <SidebarHeader className="p-3 pb-1 border-0">
        <NexoraCompanySwitcher isHR={isHR} />
      </SidebarHeader>

      {/* ── CONTENT: SCROLLABLE COLLAPSIBLE MENU GROUPS ── */}
      <SidebarContent>
        <ScrollArea className="h-full px-2 py-2">
          {/* Main Menu Group */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[12px] font-semibold text-slate-500 dark:text-zinc-400 px-3 py-1.5 h-auto tracking-normal">
              {isEn ? 'Main Menu' : 'Menu Utama'}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {canView('Dashboard') && isHR && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t.nav.workspace}
                    isActive={isExactActive('/')}
                    className={itemClasses}
                    onClick={() => navigate('/')}
                  >
                    <Home className="size-4 shrink-0 text-slate-500" />
                    <span className="group-data-[collapsible=icon]:hidden">{t.nav.workspace}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {canView('Data Karyawan') && isHR && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t.nav.employees}
                    isActive={isSectionActive('/employees')}
                    className={itemClasses}
                    onClick={() => navigate('/employees')}
                  >
                    <Users className="size-4 shrink-0 text-slate-500" />
                    <span className="group-data-[collapsible=icon]:hidden">{t.nav.employees}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {/* Absensi Group (Collapsible for HR) */}
          {isHR && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[12px] font-semibold text-slate-500 dark:text-zinc-400 px-3 py-1.5 h-auto tracking-normal">
                {isEn ? 'Time & Attendance' : 'Presensi & Waktu'}
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-0.5">
                <Collapsible open={attendanceOpen} onOpenChange={setAttendanceOpen} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={isEn ? 'Attendance' : 'Absensi & Kehadiran'}
                          isActive={attendanceActive}
                          className={itemClasses}
                        />
                      }
                    >
                      <Clock className="size-4 shrink-0 text-slate-500" />
                      <span className="group-data-[collapsible=icon]:hidden">{isEn ? 'Attendance' : 'Absensi'}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden opacity-60" />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isExactActive('/attendance/report')}
                            className={itemClasses}
                            onClick={() => navigate('/attendance/report')}
                          >
                            <FileText className="size-3.5 shrink-0" />
                            <span>{t.nav.attendanceReport}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isExactActive('/attendance/map')}
                            className={itemClasses}
                            onClick={() => navigate('/attendance/map')}
                          >
                            <Navigation className="size-3.5 shrink-0" />
                            <span>{t.nav.attendanceMap}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isExactActive('/attendance/requests')}
                            className={itemClasses}
                            onClick={() => navigate('/attendance/requests')}
                          >
                            <Clock className="size-3.5 shrink-0" />
                            <span>{t.nav.attendanceRequests}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isExactActive('/attendance/calendar')}
                            className={itemClasses}
                            onClick={() => navigate('/attendance/calendar')}
                          >
                            <Calendar className="size-3.5 shrink-0" />
                            <span>{t.nav.attendanceCalendar}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>

                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            isActive={isExactActive('/attendance/locations')}
                            className={itemClasses}
                            onClick={() => navigate('/attendance/locations')}
                          >
                            <MapPin className="size-3.5 shrink-0" />
                            <span>{t.nav.attendanceLocations}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          )}

          {/* Requests & Services Group */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-[12px] font-semibold text-slate-500 dark:text-zinc-400 px-3 py-1.5 h-auto tracking-normal">
              {t.nav.requestsServices}
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t.nav.requestsAndApprovals}
                  isActive={isSectionActive('/requests') || isSectionActive('/approvals')}
                  className={itemClasses}
                  onClick={() => navigate('/requests')}
                >
                  <CheckCircle2 className="size-4 shrink-0 text-slate-500" />
                  <span className="group-data-[collapsible=icon]:hidden flex-1 truncate">
                    {t.nav.requestsAndApprovals}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 group-data-[collapsible=icon]:hidden shrink-0" />
                </SidebarMenuButton>
              </SidebarMenuItem>

              {(canView('Catatan SP') || isHR) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t.nav.disciplinary}
                    isActive={isSectionActive('/disciplinary')}
                    className={itemClasses}
                    onClick={() => navigate('/disciplinary')}
                  >
                    <FileWarning className="size-4 shrink-0 text-slate-500" />
                    <span className="group-data-[collapsible=icon]:hidden">{t.nav.disciplinary}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {(canView('Dashboard') || isHR) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t.nav.news}
                    isActive={isSectionActive('/news')}
                    className={itemClasses}
                    onClick={() => navigate('/news')}
                  >
                    <Megaphone className="size-4 shrink-0 text-slate-500" />
                    <span className="group-data-[collapsible=icon]:hidden">{t.nav.news}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>

          {/* Administrasi Group (Collapsible for HR) */}
          {isHR && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-[12px] font-semibold text-slate-500 dark:text-zinc-400 px-3 py-1.5 h-auto tracking-normal">
                {t.nav.administration}
              </SidebarGroupLabel>
              <SidebarMenu className="space-y-0.5">
                <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger
                      render={
                        <SidebarMenuButton
                          tooltip={t.nav.administration}
                          isActive={adminActive}
                          className={itemClasses}
                        />
                      }
                    >
                      <Settings className="size-4 shrink-0 text-slate-500" />
                      <span className="group-data-[collapsible=icon]:hidden">{t.nav.administration}</span>
                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-open/collapsible:rotate-90 group-data-[collapsible=icon]:hidden opacity-60" />
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {canView('Master Company') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/companies')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/companies')}
                            >
                              <Building2 className="size-3.5 shrink-0" />
                              <span>{t.nav.adminCompany}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Master Department') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/departments')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/departments')}
                            >
                              <FolderTree className="size-3.5 shrink-0" />
                              <span>{t.nav.adminDepartment}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Hierarchy Approval') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/approval-hierarchy')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/approval-hierarchy')}
                            >
                              <GitMerge className="size-3.5 shrink-0" />
                              <span>{t.nav.adminApprovalHierarchy}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Permission Menu') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/permissions')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/permissions')}
                            >
                              <Lock className="size-3.5 shrink-0" />
                              <span>{t.nav.adminPermissionMenu}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Account Management') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/accounts')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/accounts')}
                            >
                              <UserCheck className="size-3.5 shrink-0" />
                              <span>{t.nav.adminUserAccounts}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Log Aktivitas') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/admin/activity-logs')}
                              className={itemClasses}
                              onClick={() => navigate('/admin/activity-logs')}
                            >
                              <History className="size-3.5 shrink-0" />
                              <span>{t.nav.adminAuditLogs}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Laporan & Analitik') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/analytics')}
                              className={itemClasses}
                              onClick={() => navigate('/analytics')}
                            >
                              <BarChart3 className="size-3.5 shrink-0" />
                              <span>{t.nav.adminReportsAnalytics}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}

                        {canView('Pengaturan Sistem') && (
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={isExactActive('/settings')}
                              className={itemClasses}
                              onClick={() => navigate('/settings')}
                            >
                              <Settings className="size-3.5 shrink-0" />
                              <span>{t.nav.adminSystemSettings}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          )}
        </ScrollArea>
      </SidebarContent>

      {/* ── FOOTER: USER PROFILE ROW & DROPDOWN ── */}
      <SidebarFooter className="p-3 pt-1 border-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="border-0 bg-transparent hover:bg-[#f4f4f6] dark:hover:bg-zinc-800/60 p-2 rounded-xl group-data-[collapsible=icon]:!p-0 cursor-pointer h-auto"
                  />
                }
              >
                <Avatar size="sm" className="size-9 shrink-0 rounded-full overflow-hidden border-0">
                  {currentUser?.avatar_url && (
                    <AvatarImage src={currentUser.avatar_url} alt={currentUser?.fullName || 'User'} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-[#0f1a42] text-white text-[11px] font-bold">
                    {currentUser?.fullName
                      ? currentUser.fullName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'RS'}
                  </AvatarFallback>
                </Avatar>

                <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-slate-900 dark:text-white">
                    {currentUser?.fullName || "Rudi Si'arudin"}
                  </span>
                  <span className="truncate text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    {currentUser?.email || 'rudi.siarudin@gesit.co.id'}
                  </span>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 p-1.5 shadow-2xl rounded-xl bg-white dark:bg-[#18181b] border border-slate-200/80 dark:border-[#27272a]"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={6}
              >
                <DropdownMenuLabel className="font-normal p-2">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                      {currentUser?.fullName || (isEn ? 'User' : 'Pengguna')}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 truncate leading-none mt-1">
                      {currentUser?.email || '-'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate('/admin/users')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t.nav.manageAccount}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate('/employees')}
                  className="text-xs cursor-pointer gap-2 py-2"
                >
                  <Users className="h-3.5 w-3.5 text-slate-500" />
                  <span>{t.nav.employeeData}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onLogout && (
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-xs cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>{t.nav.signOut}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
