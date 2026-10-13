const fs = require('fs');
const path = require('path');

const srcPath = path.join(process.cwd(), 'components', 'AttendanceManager.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');

// ─── 1. AttendanceReport.tsx ──────────────────────────────────────────────────
// Lines 3174 to 3367 are calculations
// Lines 3368 to 4065 are renderReport
// Photo modal is lines 5332 to 5341

const reportCalc = lines.slice(3173, 3367).join('\n');
const reportJSX = lines.slice(3368, 4064).join('\n');
const reportPhotoModal = lines.slice(5331, 5341).join('\n');

const reportFileContent = `import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Filter, RefreshCw, Download, Eye, ChevronDown, ChevronRight,
  ExternalLink, BarChart3, Clock, CheckCircle2, AlertTriangle, Calendar, Building2, User
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { UserAvatar } from '../UserAvatar';
import {
  AttendanceRecord, UserAccount, STATUS_CONFIG, formatTime, formatMinutes, formatDate, renderStatusBadge
} from './attendanceTypes';

export interface AttendanceReportProps {
  currentUser?: any;
  allUsers?: UserAccount[];
}

export const AttendanceReport: React.FC<AttendanceReportProps> = ({ currentUser, allUsers: propUsers }) => {
  const userId = currentUser?.id || currentUser?.authId || '';
  const isManager = true;

  const [allUsers, setAllUsers] = useState<UserAccount[]>(propUsers || []);
  const [reportStart, setReportStart] = useState(() => {
    const now = new Date();
    return \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}-01\`;
  });
  const [reportEnd, setReportEnd] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [reportDept, setReportDept] = useState('all');
  const [reportSearch, setReportSearch] = useState('');
  const [reportRecords, setReportRecords] = useState<AttendanceRecord[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSort, setReportSort] = useState<'name' | 'present' | 'late' | 'absent' | 'hours'>('name');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [viewAttendancePhoto, setViewAttendancePhoto] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<'summary' | 'logs'>('summary');
  const [reportLogStatus, setReportLogStatus] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!propUsers || propUsers.length === 0) {
      const loadUsers = async () => {
        const { data } = await supabase.from('company_employees').select('*').order('full_name');
        if (data) {
          setAllUsers(data.map((e: any) => ({
            id: String(e.id),
            full_name: e.full_name,
            email: e.email,
            department: e.department,
            job_title: e.job_title,
            company: e.company,
            status: e.status,
            avatar_url: e.avatar_url,
          })));
        }
      };
      loadUsers();
    }
  }, [propUsers]);

${reportCalc}

  return (
    <div className="w-full">
${reportJSX}
${reportPhotoModal}
    </div>
  );
};

export default AttendanceReport;
`;

fs.writeFileSync(path.join(process.cwd(), 'components', 'attendance', 'AttendanceReport.tsx'), reportFileContent, 'utf8');
console.log('Created AttendanceReport.tsx');

// ─── 2. AttendanceRequest.tsx ─────────────────────────────────────────────────
// Lines 2643 to 3065 are approval handlers
// Lines 4102 to 4126 are request helpers
// Lines 4325 to 5256 are request sub-renderers
// Modal is lines 5342 to 5584

const reqApprovalHandlers = lines.slice(2643, 3065).join('\n');
const reqHelpers = lines.slice(4101, 4126).join('\n');
const reqSubRenderers = lines.slice(4324, 5256).join('\n');
const reqModal = lines.slice(5341, 5585).join('\n');

const requestFileContent = `import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, Timer, Wallet, FileText, CheckCircle2, XCircle,
  Filter, Search, RefreshCw, Eye, Check, X, Building2, User, ChevronRight, Stethoscope, Gift, Receipt, AlertCircle, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '../UserAvatar';
import {
  LeaveRequest, OvertimeRequest, ReimbursementRequest, UserAccount,
  LEAVE_TYPES, STATUS_CONFIG, REIMBURSEMENT_TYPES, isPendingApprovalStatus,
  buildApprovalSteps, getReimbType, renderStatusBadge
} from './attendanceTypes';

export interface AttendanceRequestProps {
  currentUser?: any;
  allUsers?: UserAccount[];
}

export const AttendanceRequest: React.FC<AttendanceRequestProps> = ({ currentUser, allUsers: propUsers }) => {
  const userId = currentUser?.id || currentUser?.authId || '';
  const isManager = true;

  const [allUsers, setAllUsers] = useState<UserAccount[]>(propUsers || []);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<any[]>([]);
  const [requestTab, setRequestTab] = useState<'leave' | 'overtime' | 'reimbursement' | 'attendance_correction'>('leave');
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected'>('all');
  const [reimbFilter, setReimbFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');
  const [reimbCategory, setReimbCategory] = useState<string>('all');
  const [requestDept, setRequestDept] = useState('all');
  const [requestCompany, setRequestCompany] = useState('all');
  const [viewRequest, setViewRequest] = useState<{ kind: 'cuti' | 'lembur' | 'reimbursement'; req: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [uRes, lRes, oRes, rRes, cRes] = await Promise.all([
        supabase.from('company_employees').select('*').order('full_name'),
        supabase.from('leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('overtime_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('reimbursements').select('*').order('created_at', { ascending: false }),
        supabase.from('attendance_corrections').select('*').order('created_at', { ascending: false }),
      ]);
      if (uRes.data) {
        setAllUsers(uRes.data.map((e: any) => ({
          id: String(e.id),
          full_name: e.full_name,
          email: e.email,
          department: e.department,
          job_title: e.job_title,
          company: e.company,
          status: e.status,
          avatar_url: e.avatar_url,
          supervisor_id: e.supervisor_id,
          manager_id: e.manager_id,
          role: e.role,
        })));
      }
      if (lRes.data) setLeaveRequests(lRes.data as LeaveRequest[]);
      if (oRes.data) setOvertimeRequests(oRes.data as OvertimeRequest[]);
      if (rRes.data) setReimbursements(rRes.data as ReimbursementRequest[]);
      if (cRes.data) setAttendanceCorrections(cRes.data);
    } catch (err) {
      console.error('Error fetching request data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [refreshKey]);

${reqApprovalHandlers}
${reqHelpers}
${reqSubRenderers}

  return (
    <div className="w-full">
      {renderRequest()}
${reqModal}
    </div>
  );
};

export default AttendanceRequest;
`;

fs.writeFileSync(path.join(process.cwd(), 'components', 'attendance', 'AttendanceRequest.tsx'), requestFileContent, 'utf8');
console.log('Created AttendanceRequest.tsx');

// ─── 3. AttendanceDashboard.tsx ───────────────────────────────────────────────
// ClockPanel is lines 328 to 534
// renderDashboard is lines 3066 to 3169
// renderHRDashboard is lines 4159 to 4324

const clockPanel = lines.slice(327, 534).join('\n');
const dashboardView = lines.slice(3065, 3169).join('\n');
const hrDashboardView = lines.slice(4158, 4324).join('\n');

const dashboardFileContent = `import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, MapPin, Calendar, Sun, Moon, Coffee, AlertTriangle,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown, Download,
  Plus, Search, Filter, RefreshCw, Eye, Trash2, Edit3,
  Timer, Briefcase, Users, FileText, BarChart3, Settings,
  Navigation, Shield, X, Loader2, User, Building2, Sunrise, Sunset,
  LayoutDashboard, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '../StatCard';
import { UserAvatar } from '../UserAvatar';
import {
  AttendanceRecord, AttendanceSchedule, OfficeLocation, AttendanceSettings,
  UserAccount, GPS_BG, STATUS_CONFIG, formatTime, formatDate, formatMinutes,
  getDistanceMeters, getGeoLocation, renderStatusBadge
} from './attendanceTypes';

${clockPanel}

export interface AttendanceDashboardProps {
  currentUser?: any;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({ currentUser }) => {
  const userId = currentUser?.id || currentUser?.authId || '';
  const isManager = true;

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [schedule, setSchedule] = useState<AttendanceSchedule | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [deptFilter, setDeptFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return \`\${now.getFullYear()}-\${String(now.getMonth() + 1).padStart(2, '0')}\`;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const [todayRes, schRes, locRes, empRes, recRes] = await Promise.all([
        supabase.from('attendance_records').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
        supabase.from('attendance_schedules').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('office_locations').select('*').eq('is_active', true),
        supabase.from('company_employees').select('*').order('full_name'),
        supabase.from('attendance_records').select('*').gte('date', \`\${historyMonth}-01\`).order('date', { ascending: false }),
      ]);

      if (todayRes.data) setTodayRecord(todayRes.data as AttendanceRecord);
      if (schRes.data) setSchedule(schRes.data as AttendanceSchedule);
      if (locRes.data) setLocations(locRes.data as OfficeLocation[]);
      if (empRes.data) {
        setAllUsers(empRes.data.map((e: any) => ({
          id: String(e.id),
          full_name: e.full_name,
          email: e.email,
          department: e.department,
          job_title: e.job_title,
          company: e.company,
          status: e.status,
          avatar_url: e.avatar_url,
        })));
      }
      if (recRes.data) setAllRecords(recRes.data as AttendanceRecord[]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, historyMonth]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshKey]);

  const activeUsers = useMemo(() => {
    const filtered = deptFilter === 'all'
      ? allUsers
      : allUsers.filter(u => u.department === deptFilter);
    return filtered.filter(u => u.status !== 'Inactive');
  }, [allUsers, deptFilter]);

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = allRecords.filter(r => r.date === today);
    const userIds = new Set(activeUsers.map(u => String(u.id)));
    const ts = todayRecords.filter(r => userIds.has(String(r.user_id)));
    const present = ts.filter(r => r.status === 'present').length;
    const late = ts.filter(r => r.status === 'late').length;
    const leave = ts.filter(r => r.status === 'leave').length;
    const absent = ts.filter(r => r.status === 'absent').length;
    const notYet = activeUsers.length - ts.length;
    return { present, late, leave, absent, notYet, total: activeUsers.length };
  }, [allRecords, activeUsers]);

  const managerStats = useMemo(() => {
    const [y, m] = historyMonth.split('-').map(Number);
    const monthRecords = allRecords.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const leave = monthRecords.filter(r => r.status === 'leave').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const totalWork = monthRecords.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
    const totalOT = monthRecords.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
    return { present, late, leave, absent, totalWork, totalOT, total: monthRecords.length };
  }, [allRecords, historyMonth]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

${dashboardView}
${hrDashboardView}

  return (
    <div className="w-full">
      <div className="border-b border-border/40 bg-card/60 dark:bg-zinc-900/40 px-4 py-3 sm:px-6 sm:py-4 mb-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white bg-slate-800">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">Dashboard Absensi</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Overview kehadiran hari ini</p>
          </div>
        </div>
      </div>

      {isManager ? renderHRDashboard() : renderDashboard()}
    </div>
  );
};

export default AttendanceDashboard;
`;

fs.writeFileSync(path.join(process.cwd(), 'components', 'attendance', 'AttendanceDashboard.tsx'), dashboardFileContent, 'utf8');
console.log('Created AttendanceDashboard.tsx');
