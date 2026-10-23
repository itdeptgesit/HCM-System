import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Download,
  RotateCcw,
  ArrowRight,
  AlertCircle,
  Building,
  GraduationCap,
  Briefcase,
  ChevronRight,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Clock3,
  XCircle,
  HelpCircle,
  ChevronDown,
  Search,
  ExternalLink,
  Activity,
  Layers,
  FileText,
  CloudSun,
  Filter
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { isActiveEmployee, isEmployeeAccount, isHRAccount, jakartaDate, resolveApprovalStatus } from '../../lib/workforce-contract';
import { UserAvatar } from '../UserAvatar';
import { dashboardAttendance } from '../../lib/dashboardAttendance';
import { loadWorkCalendarDates } from '../../lib/holidayDates';
import { dashboardWorkbook } from '../../lib/dashboardWorkbook';

interface LiveHRDashboardProps {
  currentUser?: any;
  onMetricsUpdate?: (m: { totalHeadcount: number; pendingCount: number; attendanceRate: string }) => void;
}

interface DemographicGroup {
  label: string;
  count: number;
  percentage: number;
  isHighlight?: boolean;
}

interface EmployeeDemographicGroup extends DemographicGroup {
  employees: any[];
}

type EmployeeDateField = 'date_of_birth' | 'join_date' | 'separation_date' | 'contract_end_date';

// Helpers for calculations
function calculateAge(dobStr?: string | null): number | null {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 0 && age < 120 ? age : null;
}

function calculateTenureYears(joinDateStr?: string | null): number | null {
  if (!joinDateStr) return null;
  const join = new Date(joinDateStr);
  if (isNaN(join.getTime())) return null;
  const today = new Date();
  const diffTime = today.getTime() - join.getTime();
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  return diffYears >= 0 ? Number(diffYears.toFixed(1)) : 0;
}

/** Selisih hari menuju tanggal berakhir. Negatif berarti sudah lewat. */
function contractDaysLeft(contractEndDateStr?: string | null): number | null {
  if (!contractEndDateStr) return null;
  const end = new Date(contractEndDateStr);
  if (isNaN(end.getTime())) return null;
  const today = new Date();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((endDay.getTime() - todayDay.getTime()) / 86_400_000);
}

/**
 * Kontrak/probation butuh keputusan bila sisa ≤30 hari, termasuk yang sudah lewat.
 * Item yang sudah lewat sengaja tetap tampil: itu justru kasus paling berisiko.
 */
function isContractNeedingDecision(contractEndDateStr?: string | null): boolean {
  const days = contractDaysLeft(contractEndDateStr);
  return days !== null && days <= 30;
}

export default function LiveHRDashboard({ currentUser, onMetricsUpdate }: LiveHRDashboardProps) {
  const navigate = useNavigate();

  // Filters State
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [snapshotDate, setSnapshotDate] = useState<string>(() => jakartaDate());
  const [clockNow, setClockNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setClockNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Real Database State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  // Tanggal probation resmi dari SK pengangkatan, dipetakan per employee_id.
  const [probationEndDates, setProbationEndDates] = useState<Record<string, string>>({});
  const [attendanceContext, setAttendanceContext] = useState<{
    schedules: any[]; settings: any; holidays: Set<string>; workingDates: Set<string>; error: string;
  }>({ schedules: [], settings: null, holidays: new Set(), workingDates: new Set(), error: '' });
  const loadVersionRef = useRef(0);
  const [exporting, setExporting] = useState<boolean>(false);

  // Drilldown Modal State with Search
  const [drilldownModal, setDrilldownModal] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    employees: any[];
    dateField?: EmployeeDateField;
  }>({
    open: false,
    title: '',
    subtitle: '',
    employees: [],
  });
  const [drilldownSearch, setDrilldownSearch] = useState<string>('');
  const drilldownTriggerRef = useRef<HTMLElement | null>(null);
  const [chartsReady, setChartsReady] = useState<boolean>(false);
  const [chartPeriod, setChartPeriod] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    setChartsReady(false);
    const timer = setTimeout(() => setChartsReady(true), 150);
    return () => clearTimeout(timer);
  }, [loading, selectedCompany, selectedDepartment]);

  const today = jakartaDate();
  const isHR = isHRAccount(currentUser);

  // Load Real Data from Supabase
  const loadData = useCallback(async () => {
    const version = ++loadVersionRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const monthPrefix = snapshotDate.slice(0, 7);
      // Query attendance records covering at least the past 42 days (covers current week + comparison week + current month)
      const snapDateObj = new Date(snapshotDate + 'T00:00:00');
      const lookbackObj = new Date(snapDateObj);
      lookbackObj.setDate(lookbackObj.getDate() - 42);
      const lookbackDateStr = lookbackObj.toISOString().slice(0, 10);
      const attendanceQueryStart = lookbackDateStr < `${monthPrefix}-01` ? lookbackDateStr : `${monthPrefix}-01`;

      const [users, companies, depts, attendance, leaves, overtime, reimb, corrections, outside, appointments, context] = await Promise.all([
        loadWorkforceAccounts({ includeSystemAccounts: true }),
        fetchAllRows((from, to) => supabase.from('companies').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('departments').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('attendance_records').select('*').gte('date', attendanceQueryStart).lte('date', snapshotDate).order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('leave_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('overtime_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('reimbursements').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('attendance_correction_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('attendance_requests').select('*').order('id').range(from, to)),
        (async () => {
          try {
            return await fetchAllRows((from, to) => supabase
              .from('employee_appointments')
              .select('employee_id, probation_end_date')
              .not('probation_end_date', 'is', null)
              .order('id')
              .range(from, to));
          } catch {
            // SK pengangkatan opsional; dashboard tetap jalan tanpa tanggal probation resmi.
            return [] as any[];
          }
        })(),
        (async () => {
          try {
            const [schedules, settings, calendar] = await Promise.all([
              fetchAllRows((from, to) => supabase.from('attendance_schedules').select('*').eq('is_active', true).order('id').range(from, to)),
              supabase.from('attendance_settings').select('*').limit(1).maybeSingle(),
              loadWorkCalendarDates(snapshotDate, snapshotDate),
            ]);
            if (settings.error) throw settings.error;
            return { schedules, settings: settings.data, ...calendar, error: '' };
          } catch {
            return { schedules: [], settings: null, holidays: new Set<string>(), workingDates: new Set<string>(), error: 'Jadwal atau kalender kerja belum berhasil dimuat. Muat ulang untuk melihat presensi terjadwal.' };
          }
        })(),
      ]);
      if (version !== loadVersionRef.current) return;

      const systemAccountIds = new Set(users.filter(user => !isEmployeeAccount(user)).map(user => String(user.id)));
      setAccounts(users.filter(isEmployeeAccount));
      setCompaniesList(companies || []);
      setDepartmentsList(depts || []);
      setRecords((attendance || []).filter(record => !systemAccountIds.has(String(record.user_id))).map(normalizeAttendance));
      setAttendanceContext(context);

      // Ambil tanggal probation terbaru per karyawan (satu karyawan bisa punya beberapa SK).
      const probationMap: Record<string, string> = {};
      for (const row of appointments || []) {
        if (!row?.employee_id || !row?.probation_end_date) continue;
        const key = String(row.employee_id);
        if (!probationMap[key] || row.probation_end_date > probationMap[key]) {
          probationMap[key] = row.probation_end_date;
        }
      }
      setProbationEndDates(probationMap);

      const tagged = (rows: any[], type: string) => rows.filter(row => !systemAccountIds.has(String(row.user_id))).map(r => ({ ...r, type }));
      setRequests([
        ...tagged(leaves || [], 'leave'),
        ...tagged(overtime || [], 'overtime'),
        ...tagged(reimb || [], 'reimbursement'),
        ...tagged(corrections || [], 'correction'),
        ...tagged(outside || [], 'attendance_request'),
      ]);
    } catch (err) {
      if (version !== loadVersionRef.current) return;
      console.warn('Dashboard load error:', err);
      setLoadError('Data dashboard belum berhasil dimuat. Silakan muat ulang.');
    } finally {
      if (version === loadVersionRef.current) setLoading(false);
    }
  }, [snapshotDate]);

  useEffect(() => {
    loadData();

    // Realtime auto-refresh in the background every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30_000);

    // Realtime postgres changes listener
    const channel = supabase
      .channel('dashboard-realtime-listener')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_requests' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Master Lists for Filters from Database
  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    companiesList.forEach(c => {
      if (c.name) set.add(c.name);
    });
    accounts.forEach(a => {
      const c = a.company || a.company_name;
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [companiesList, accounts]);

  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    departmentsList.forEach(d => {
      if (d.name) set.add(d.name);
    });
    accounts.forEach(a => {
      const d = a.department || a.department_name;
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [departmentsList, accounts]);

  const scopedEmployees = useMemo(() => {
    return accounts.filter(a => {
      if (selectedCompany !== 'all') {
        const comp = (a.company || a.company_name || '').trim();
        if (comp !== selectedCompany) return false;
      }

      if (selectedDepartment !== 'all') {
        const dept = (a.department || a.department_name || '').trim();
        if (dept !== selectedDepartment) return false;
      }

      return true;
    });
  }, [accounts, selectedCompany, selectedDepartment]);

  // Filtered Real Employees
  const filteredEmployees = useMemo(() => scopedEmployees.filter(a => {
    const status = String(a.status || a.employment_status || 'active').toLowerCase();
    return !['inactive', 'suspended', 'terminated', 'resigned'].includes(status);
  }), [scopedEmployees]);

  const totalHeadcount = filteredEmployees.length;
  const scopedEmployeeIds = useMemo(() => new Set(scopedEmployees.map(employee => String(employee.id))), [scopedEmployees]);
  const scopedRequests = useMemo(() => requests.filter(request =>
    (selectedCompany === 'all' && selectedDepartment === 'all') || scopedEmployeeIds.has(String(request.user_id)),
  ), [requests, scopedEmployeeIds, selectedCompany, selectedDepartment]);

  // New Hires this month
  const currentMonthStr = snapshotDate.slice(0, 7);
  const currentMonthLabel = new Date(`${currentMonthStr}-01T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const newHiresList = useMemo(() => {
    return scopedEmployees.filter(a => a.join_date && String(a.join_date).startsWith(currentMonthStr));
  }, [scopedEmployees, currentMonthStr]);
  const newHires = newHiresList.length;

  // Resignations this month
  const resignationsList = useMemo(() => {
    return scopedEmployees.filter(a => {
      const sep = a.separation_date;
      if (!sep || !String(sep).startsWith(currentMonthStr)) return false;
      return true;
    });
  }, [scopedEmployees, currentMonthStr]);
  const resignations = resignationsList.length;
  const netHeadcountChange = newHires - resignations;
  const previousMonthStr = new Date(Date.UTC(Number(currentMonthStr.slice(0, 4)), Number(currentMonthStr.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
  const previousMonthExits = scopedEmployees.filter(employee => employee.separation_date?.startsWith(previousMonthStr)).length;

  // Average Age Calculation
  const agesWithData = useMemo(() => {
    return filteredEmployees
      .map(a => ({ emp: a, age: calculateAge(a.date_of_birth) }))
      .filter((x): x is { emp: any; age: number } => x.age !== null);
  }, [filteredEmployees]);

  const avgAge = useMemo(() => {
    if (agesWithData.length === 0) return '-';
    const sum = agesWithData.reduce((acc, curr) => acc + curr.age, 0);
    return (sum / agesWithData.length).toFixed(1).replace('.', ',');
  }, [agesWithData]);

  const ageRangeStr = useMemo(() => {
    if (agesWithData.length === 0) return 'Data usia belum diisi';
    const ages = agesWithData.map(x => x.age);
    const min = Math.min(...ages);
    const max = Math.max(...ages);
    return `Rentang usia ${min}–${max} tahun`;
  }, [agesWithData]);

  // Average Tenure (Masa Kerja)
  const tenuresWithData = useMemo(() => {
    return filteredEmployees
      .map(a => ({ emp: a, tenure: calculateTenureYears(a.join_date) }))
      .filter((x): x is { emp: any; tenure: number } => x.tenure !== null);
  }, [filteredEmployees]);

  const avgTenure = useMemo(() => {
    if (tenuresWithData.length === 0) return '-';
    const sum = tenuresWithData.reduce((acc, curr) => acc + curr.tenure, 0);
    return (sum / tenuresWithData.length).toFixed(1).replace('.', ',');
  }, [tenuresWithData]);

  const overFiveYearsEmployees = useMemo(() => {
    return tenuresWithData.filter(x => x.tenure >= 5);
  }, [tenuresWithData]);

  // Turnover rate: (resignations / (totalHeadcount + resignations)) * 100
  const turnoverRate = useMemo(() => {
    const base = totalHeadcount + resignations;
    if (base === 0) return '0,0';
    return ((resignations / base) * 100).toFixed(1).replace('.', ',');
  }, [resignations, totalHeadcount]);

  // Real Attendance metrics for snapshotDate
  const filteredEmployeeIds = useMemo(() => new Set(filteredEmployees.map(a => String(a.id))), [filteredEmployees]);
  const todayAttendance = useMemo(() => {
    return records.filter(r => r.date === snapshotDate && filteredEmployeeIds.has(String(r.user_id)));
  }, [records, snapshotDate, filteredEmployeeIds]);

  const attendanceSnapshot = useMemo(() => dashboardAttendance({
    employees: filteredEmployees, records: todayAttendance,
    leaves: requests.filter(request => request.type === 'leave'),
    schedules: attendanceContext.schedules, settings: attendanceContext.settings,
    holidays: attendanceContext.holidays, workingDates: attendanceContext.workingDates, date: snapshotDate, now: clockNow,
  }), [filteredEmployees, todayAttendance, requests, attendanceContext, snapshotDate, clockNow]);
  const onTimeCount = attendanceSnapshot.onTime.length;
  const lateCount = attendanceSnapshot.late.length;
  const leaveCount = attendanceSnapshot.leave.length;
  const checkedInCount = attendanceSnapshot.checkedIn;
  const notCheckedInCount = attendanceSnapshot.pending.length;
  const attendanceRate = attendanceContext.error || loadError ? '-' : attendanceSnapshot.rate ?? '-';

  // ── AKTIVITAS KEHADIRAN (REAL DATA DARI DATABASE POSTGRESQL) ──
  const attendanceActivity = useMemo(() => {
    const snap = new Date(snapshotDate + 'T00:00:00');
    const dayOfWeek = snap.getDay(); // 0 is Sunday, 1 is Monday...
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(snap);
    monday.setDate(snap.getDate() + distToMon);

    const dayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const fullDayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const getWorkMinutes = (r: any, isToday: boolean) => {
      let m = Number(r.total_work_minutes || 0);
      if (m <= 0 && r.clock_in && r.clock_out) {
        const diff = (new Date(r.clock_out).getTime() - new Date(r.clock_in).getTime()) / 60000;
        if (diff > 0) m = Math.round(diff);
      } else if (m <= 0 && r.clock_in && isToday) {
        const diff = (clockNow.getTime() - new Date(r.clock_in).getTime()) / 60000;
        if (diff > 0) m = Math.min(540, Math.round(diff));
      } else if (m <= 0 && r.clock_in) {
        m = 480;
      }
      if (m > 840) m = 540;
      return m;
    };

    if (chartPeriod === 'weekly') {
      const weeklyItems = [];
      let totalMinutesThisWeek = 0;
      let totalAttendeesThisWeek = 0;
      let onTimeCountThisWeek = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const isToday = dateStr === snapshotDate;
        const isFuture = dateStr > snapshotDate;

        const dayRecs = records.filter(r => r.date === dateStr && filteredEmployeeIds.has(String(r.user_id)));
        let dayMinutes = 0;
        let attendeesCount = 0;
        let dayOnTime = 0;

        for (const r of dayRecs) {
          if (r.clock_in) {
            attendeesCount++;
            const m = getWorkMinutes(r, isToday);
            dayMinutes += m;
            const st = String(r.status || '').toLowerCase();
            if (!st.includes('late') && !st.includes('terlambat')) {
              dayOnTime++;
            }
          }
        }

        const avgMinutes = attendeesCount > 0 ? dayMinutes / attendeesCount : 0;
        const avgHours = avgMinutes / 60;
        const hInt = Math.floor(avgHours);
        const mInt = Math.round(avgMinutes % 60);
        const timeLabel = avgHours > 0 ? `${hInt}h ${mInt > 0 ? mInt + 'm' : ''}`.trim() : '0h';

        let height = 8;
        if (!isFuture && avgHours > 0) {
          height = Math.min(100, Math.max(12, Math.round((avgHours / 8.5) * 100)));
        }

        let tooltip = '';
        if (isFuture) {
          tooltip = `${fullDayNames[i]} • Belum ada data`;
        } else if (isToday) {
          tooltip = `${timeLabel} • Hari Ini (${attendeesCount} hadir)`;
        } else if (attendeesCount > 0) {
          tooltip = `${fullDayNames[i]}: ${timeLabel} • ${attendeesCount} hadir`;
        } else {
          tooltip = `${fullDayNames[i]}: Libur / 0 hadir`;
        }

        weeklyItems.push({
          day: dayNames[i],
          fullName: fullDayNames[i],
          date: dateStr,
          hours: Number(avgHours.toFixed(1)),
          height,
          isHighlight: isToday,
          label: isFuture ? '-' : timeLabel,
          tooltip,
          attendeesCount,
        });

        if (!isFuture) {
          totalMinutesThisWeek += dayMinutes;
          totalAttendeesThisWeek += attendeesCount;
          onTimeCountThisWeek += dayOnTime;
        }
      }

      // Previous week comparison
      const prevMonday = new Date(monday);
      prevMonday.setDate(monday.getDate() - 7);
      const currentWeekdayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      let totalMinutesPrevWeek = 0;

      for (let i = 0; i <= currentWeekdayIndex; i++) {
        const d = new Date(prevMonday);
        d.setDate(prevMonday.getDate() + i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayRecs = records.filter(r => r.date === dateStr && filteredEmployeeIds.has(String(r.user_id)));
        for (const r of dayRecs) {
          if (r.clock_in) {
            totalMinutesPrevWeek += getWorkMinutes(r, false);
          }
        }
      }

      let diffPercent: number | null = null;
      if (totalMinutesPrevWeek > 0) {
        diffPercent = Number((((totalMinutesThisWeek - totalMinutesPrevWeek) / totalMinutesPrevWeek) * 100).toFixed(1));
      }

      const totalHours = Math.floor(totalMinutesThisWeek / 60);
      const remainingMins = totalMinutesThisWeek % 60;
      const totalTerpantauStr = totalMinutesThisWeek > 0 ? `${totalHours}h ${remainingMins}m` : '0h';
      const stabilitasRate = totalAttendeesThisWeek > 0
        ? ((onTimeCountThisWeek / totalAttendeesThisWeek) * 100).toFixed(1)
        : (attendanceRate !== '-' ? attendanceRate : '100');

      return {
        items: weeklyItems,
        diffPercent,
        hasComparison: totalMinutesPrevWeek > 0,
        comparisonLabel: 'dibanding minggu lalu',
        totalTerpantauStr,
        stabilitasStr: `Stabilitas ${stabilitasRate}%`,
      };
    } else {
      // Monthly mode
      const currentMonthPrefix = snapshotDate.slice(0, 7);
      const [yearStr, monthStr] = currentMonthPrefix.split('-');
      const year = Number(yearStr);
      const month = Number(monthStr);
      const daysInMonth = new Date(year, month, 0).getDate();

      const intervals = [
        { label: 'Mgg 1', start: 1, end: 7 },
        { label: 'Mgg 2', start: 8, end: 14 },
        { label: 'Mgg 3', start: 15, end: 21 },
        { label: 'Mgg 4', start: 22, end: 28 },
      ];
      if (daysInMonth > 28) {
        intervals.push({ label: 'Mgg 5', start: 29, end: daysInMonth });
      }

      const snapDay = Number(snapshotDate.slice(8, 10));
      const monthlyItems = [];
      let totalMinutesMonth = 0;
      let totalAttendeesMonth = 0;
      let onTimeCountMonth = 0;

      for (const interval of intervals) {
        const isCurrentInterval = snapDay >= interval.start && snapDay <= interval.end;
        const isFutureInterval = snapDay < interval.start;

        let intervalMinutes = 0;
        let intervalAttendees = 0;
        let intervalOnTime = 0;

        for (let day = interval.start; day <= interval.end; day++) {
          const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
          if (dateStr > snapshotDate) continue;

          const isToday = dateStr === snapshotDate;
          const dayRecs = records.filter(r => r.date === dateStr && filteredEmployeeIds.has(String(r.user_id)));
          for (const r of dayRecs) {
            if (r.clock_in) {
              intervalAttendees++;
              intervalMinutes += getWorkMinutes(r, isToday);
              const st = String(r.status || '').toLowerCase();
              if (!st.includes('late') && !st.includes('terlambat')) {
                intervalOnTime++;
              }
            }
          }
        }

        const avgMinutes = intervalAttendees > 0 ? intervalMinutes / intervalAttendees : 0;
        const avgHours = avgMinutes / 60;
        const hInt = Math.floor(avgHours);
        const mInt = Math.round(avgMinutes % 60);
        const timeLabel = avgHours > 0 ? `${hInt}h ${mInt > 0 ? mInt + 'm' : ''}`.trim() : '0h';

        let height = 8;
        if (!isFutureInterval && avgHours > 0) {
          height = Math.min(100, Math.max(12, Math.round((avgHours / 8.5) * 100)));
        }

        let tooltip = '';
        if (isFutureInterval) {
          tooltip = `${interval.label} (Tgl ${interval.start}-${interval.end}) • Belum berjalan`;
        } else if (intervalAttendees > 0) {
          tooltip = `${interval.label} (Tgl ${interval.start}-${interval.end}): Rata-rata ${timeLabel} • ${intervalAttendees} presensi`;
        } else {
          tooltip = `${interval.label} (Tgl ${interval.start}-${interval.end}): 0 presensi`;
        }

        monthlyItems.push({
          day: interval.label,
          fullName: `${interval.label} (Tgl ${interval.start}-${interval.end})`,
          date: `${currentMonthPrefix}-${String(interval.start).padStart(2, '0')}`,
          hours: Number(avgHours.toFixed(1)),
          height,
          isHighlight: isCurrentInterval,
          label: isFutureInterval ? '-' : timeLabel,
          tooltip,
          attendeesCount: intervalAttendees,
        });

        totalMinutesMonth += intervalMinutes;
        totalAttendeesMonth += intervalAttendees;
        onTimeCountMonth += intervalOnTime;
      }

      const prevMonthDate = new Date(year, month - 2, 1);
      const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);
      let totalMinutesPrevMonth = 0;

      for (let day = 1; day <= snapDay; day++) {
        const prevDateStr = `${prevMonthPrefix}-${String(day).padStart(2, '0')}`;
        const dayRecs = records.filter(r => r.date === prevDateStr && filteredEmployeeIds.has(String(r.user_id)));
        for (const r of dayRecs) {
          if (r.clock_in) {
            totalMinutesPrevMonth += getWorkMinutes(r, false);
          }
        }
      }

      let diffPercent: number | null = null;
      if (totalMinutesPrevMonth > 0) {
        diffPercent = Number((((totalMinutesMonth - totalMinutesPrevMonth) / totalMinutesPrevMonth) * 100).toFixed(1));
      }

      const totalHours = Math.floor(totalMinutesMonth / 60);
      const remainingMins = totalMinutesMonth % 60;
      const totalTerpantauStr = totalMinutesMonth > 0 ? `${totalHours}h ${remainingMins}m` : '0h';
      const stabilitasRate = totalAttendeesMonth > 0
        ? ((onTimeCountMonth / totalAttendeesMonth) * 100).toFixed(1)
        : (attendanceRate !== '-' ? attendanceRate : '100');

      return {
        items: monthlyItems,
        diffPercent,
        hasComparison: totalMinutesPrevMonth > 0,
        comparisonLabel: 'dibanding bulan lalu',
        totalTerpantauStr,
        stabilitasStr: `Stabilitas ${stabilitasRate}%`,
      };
    }
  }, [records, filteredEmployeeIds, filteredEmployees.length, snapshotDate, chartPeriod, clockNow, attendanceRate]);

  // ── JADWAL SHIFT HARI INI (REAL MASTER DATA ATTENDANCE_SCHEDULES) ──
  const todayScheduleCards = useMemo(() => {
    const rawSchedules = attendanceContext.schedules || [];
    if (rawSchedules.length === 0) {
      return [
        {
          badge: 'HO',
          bg: 'bg-[#eff6ff] dark:bg-blue-950/60',
          text: 'text-[#2563eb] dark:text-blue-400',
          name: 'Shift Kantor Pusat',
          time: '08:30 - 17:30 WIB',
          count: totalHeadcount,
        },
      ];
    }

    const palettes = [
      { bg: 'bg-[#eff6ff] dark:bg-blue-950/60', text: 'text-[#2563eb] dark:text-blue-400' },
      { bg: 'bg-[#f5f3ff] dark:bg-purple-950/60', text: 'text-[#7c3aed] dark:text-purple-400' },
      { bg: 'bg-[#f0fdf4] dark:bg-emerald-950/60', text: 'text-[#16a34a] dark:text-emerald-400' },
      { bg: 'bg-[#ecfeff] dark:bg-cyan-950/60', text: 'text-[#0891b2] dark:text-cyan-400' },
      { bg: 'bg-[#fff7ed] dark:bg-amber-950/60', text: 'text-[#d97706] dark:text-amber-400' },
    ];

    const activeList = rawSchedules.filter(s => s.is_active !== false);
    return activeList.slice(0, 4).map((s, idx) => {
      let empCount = filteredEmployees.filter(e => String(e.schedule_id) === String(s.id)).length;
      if (idx === 0) {
        const unassigned = filteredEmployees.filter(e => !e.schedule_id).length;
        empCount += unassigned;
      }

      const words = (s.name || 'Shift').replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/);
      let badge = 'SH';
      if (words.length >= 2) {
        badge = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words[0]?.length >= 2) {
        badge = words[0].slice(0, 2).toUpperCase();
      }

      const workStart = s.work_start ? String(s.work_start).slice(0, 5) : '08:30';
      const workEnd = s.work_end ? String(s.work_end).slice(0, 5) : '17:30';
      const palette = palettes[idx % palettes.length];

      return {
        id: s.id,
        name: s.name,
        badge,
        bg: palette.bg,
        text: palette.text,
        time: `${workStart} - ${workEnd} WIB`,
        count: empCount,
        isFlexible: Boolean(s.is_flexible),
      };
    });
  }, [attendanceContext.schedules, filteredEmployees, totalHeadcount]);

  // Real Leave Requests
  const filteredLeaves = useMemo(() => {
    return requests.filter(r => r.type === 'leave' && (filteredEmployeeIds.has(String(r.user_id)) || filteredEmployees.length === accounts.length));
  }, [requests, filteredEmployeeIds, filteredEmployees.length, accounts.length]);

  const totalLeaveRequests = filteredLeaves.length;
  const approvedLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r) === 'approved').length;
  const pendingLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r).startsWith('pending')).length;
  const rejectedLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r) === 'rejected').length;

  const totalPendingRequestsCount = useMemo(() => {
    return scopedRequests.filter(r => resolveApprovalStatus(r).startsWith('pending')).length;
  }, [scopedRequests]);

  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  onMetricsUpdateRef.current = onMetricsUpdate;

  useEffect(() => {
    if (onMetricsUpdateRef.current && !loading) {
      onMetricsUpdateRef.current({
        totalHeadcount,
        pendingCount: totalPendingRequestsCount,
        attendanceRate,
      });
    }
  }, [totalHeadcount, totalPendingRequestsCount, attendanceRate, loading]);

  const attentionRecords = useMemo(() => {
    const list: {
      id: string | number;
      name: string;
      code: string;
      note: string;
      status: string;
      tone: 'red' | 'yellow' | 'blue';
    }[] = [];
    todayAttendance
      .filter(r => ['late', 'terlambat'].includes(String(r.status).toLowerCase()))
      .forEach(r => {
        const emp = accounts.find(a => String(a.id) === String(r.user_id));
        list.push({
          id: r.id,
          name: emp?.full_name || emp?.name || 'Karyawan',
          code: `${emp?.employee_code || 'EMP'} • ${emp?.department || 'Operasional'}`,
          note: r.clock_in ? `Check-in ${r.clock_in.slice(0, 5)} WIB` : 'Presensi Terlambat',
          status: 'Terlambat',
          tone: 'red',
        });
      });
    todayAttendance
      .filter(r => ['leave', 'cuti', 'izin', 'sick', 'sakit'].includes(String(r.status).toLowerCase()))
      .slice(0, 3)
      .forEach(r => {
        const emp = accounts.find(a => String(a.id) === String(r.user_id));
        list.push({
          id: r.id,
          name: emp?.full_name || emp?.name || 'Karyawan',
          code: `${emp?.employee_code || 'EMP'} • ${emp?.department || 'Operasional'}`,
          note: r.notes || 'Izin Resmi Tercatat',
          status: String(r.status).toUpperCase(),
          tone: 'blue',
        });
      });
    return list.slice(0, 5);
  }, [todayAttendance, accounts]);

  const pendingRequestsList = useMemo(() => {
    return requests
      .filter(r => resolveApprovalStatus(r).startsWith('pending'))
      .map(r => {
        const emp = accounts.find(a => String(a.id) === String(r.user_id));
        const typeLabel =
          r.type === 'leave'
            ? `Cuti: ${r.leave_type || 'Tahunan'}`
            : r.type === 'overtime'
            ? `Lembur: ${r.duration_hours || 2} Jam`
            : r.type === 'reimbursement'
            ? `Klaim: Rp ${(r.amount || 0).toLocaleString('id-ID')}`
            : r.type === 'attendance_request'
            ? `Dinas Luar: ${r.reason || 'Dinas'}`
            : 'Koreksi Presensi';
        return {
          id: r.id,
          type: r.type,
          title: `${typeLabel} • ${emp?.full_name || 'Karyawan'}`,
          dept: emp?.department || 'Staff Operasional',
          date: r.created_at
            ? new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
            : 'Hari ini',
          avatar: (emp?.full_name || 'K').slice(0, 2).toUpperCase(),
        };
      })
      .slice(0, 4);
  }, [requests, accounts]);

  const tenureHistogram = useMemo(() => {
    const bins = [
      { label: '<1 Thn', min: 0, max: 0.99, count: 0 },
      { label: '1-2 Thn', min: 1, max: 1.99, count: 0 },
      { label: '2-3 Thn', min: 2, max: 2.99, count: 0 },
      { label: '3-5 Thn', min: 3, max: 4.99, count: 0 },
      { label: '5-10 Thn', min: 5, max: 9.99, count: 0 },
      { label: '>10 Thn', min: 10, max: 100, count: 0 },
    ];
    tenuresWithData.forEach(({ tenure }) => {
      const found = bins.find(b => tenure >= b.min && tenure <= b.max);
      if (found) found.count++;
    });
    const maxCount = Math.max(...bins.map(b => b.count), 1);
    const peak = bins.find(b => b.count === maxCount) || bins[2];
    return { bins, maxCount, peakLabel: peak.label };
  }, [tenuresWithData]);

  // Age Distribution
  const ageDistribution: EmployeeDemographicGroup[] = useMemo(() => {
    const groups = [
      { label: '<25 tahun', min: 0, max: 25 },
      { label: '25–<30 tahun', min: 25, max: 30 },
      { label: '30–<40 tahun', min: 30, max: 40 },
      { label: '40–<50 tahun', min: 40, max: 50 },
      { label: '50–<60 tahun', min: 50, max: 60 },
      { label: '≥60 tahun', min: 60, max: Infinity },
      { label: 'Belum tercatat', min: -1, max: 0 },
    ].map(group => ({ ...group, employees: [] as any[] }));

    filteredEmployees.forEach(emp => {
      const age = calculateAge(emp.date_of_birth) ?? -1;
      groups.find(group => age >= group.min && age < group.max)?.employees.push(emp);
    });

    const maxCount = Math.max(...groups.map(g => g.employees.length), 1);
    return groups.map(g => ({
      label: g.label,
      employees: g.employees,
      count: g.employees.length,
      percentage: totalHeadcount > 0 ? Number(((g.employees.length / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: g.employees.length === maxCount,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Education Distribution
  const educationDistribution: EmployeeDemographicGroup[] = useMemo(() => {
    const buckets: Record<string, any[]> = {
      'SMA / SMK': [],
      'Diploma': [],
      'S1': [],
      'S2': [],
      'S3': [],
      'Belum tercatat': [],
    };

    filteredEmployees.forEach(emp => {
      const ed = String(emp.last_education || '').toLowerCase().trim();
      if (!ed) {
        buckets['Belum tercatat'].push(emp);
      } else if (ed.includes('s2') || ed.includes('magister') || ed.includes('master')) {
        buckets['S2'].push(emp);
      } else if (ed.includes('s3') || ed.includes('doktor')) {
        buckets['S3'].push(emp);
      } else if (ed.includes('s1') || ed.includes('sarjana') || ed.includes('bachelor')) {
        buckets['S1'].push(emp);
      } else if (ed.includes('d1') || ed.includes('d2') || ed.includes('d3') || ed.includes('d4') || ed.includes('diploma')) {
        buckets['Diploma'].push(emp);
      } else if (ed.includes('sma') || ed.includes('smk') || ed.includes('slta')) {
        buckets['SMA / SMK'].push(emp);
      } else {
        (buckets['Lainnya'] ??= []).push(emp);
      }
    });

    const maxCount = Math.max(...Object.values(buckets).map(employees => employees.length), 1);
    return Object.entries(buckets).map(([label, employees]) => ({
      label,
      employees,
      count: employees.length,
      percentage: totalHeadcount > 0 ? Number(((employees.length / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: employees.length === maxCount,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Tenure Distribution
  const tenureDistribution: EmployeeDemographicGroup[] = useMemo(() => {
    const buckets: Record<string, any[]> = {
      '<1 tahun': [],
      '1–3 tahun': [],
      '3–5 tahun': [],
      '5–10 tahun': [],
      '≥10 tahun': [],
      'Belum tercatat': [],
    };

    filteredEmployees.forEach(emp => {
      const t = calculateTenureYears(emp.join_date);
      if (t === null) buckets['Belum tercatat'].push(emp);
      else if (t < 1) buckets['<1 tahun'].push(emp);
      else if (t < 3) buckets['1–3 tahun'].push(emp);
      else if (t < 5) buckets['3–5 tahun'].push(emp);
      else if (t < 10) buckets['5–10 tahun'].push(emp);
      else buckets['≥10 tahun'].push(emp);
    });

    const maxCount = Math.max(...Object.values(buckets).map(employees => employees.length), 1);
    return Object.entries(buckets).map(([label, employees]) => ({
      label,
      employees,
      count: employees.length,
      percentage: totalHeadcount > 0 ? Number(((employees.length / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: employees.length === maxCount,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Status Kepegawaian (Donut)
  const statusEmployees = useMemo(() => {
    const groups: Record<string, any[]> = { PKWTT: [], PKWT: [], Probation: [], Magang: [] };

    filteredEmployees.forEach(emp => {
      const type = `${emp.contract_type || ''} ${emp.employment_type || ''}`.toLowerCase();
      if (type.includes('probation') || type.includes('percobaan')) groups.Probation.push(emp);
      else if (type.includes('magang') || type.includes('intern')) groups.Magang.push(emp);
      else if (type.includes('pkwtt') || type.includes('tetap') || type.includes('permanent')) groups.PKWTT.push(emp);
      else if (type.includes('pkwt') || type.includes('kontrak') || type.includes('contract')) groups.PKWT.push(emp);
      else groups.PKWTT.push(emp);
    });

    return groups;
  }, [filteredEmployees]);
  const statusPermanent = statusEmployees.PKWTT.length;
  const statusContract = statusEmployees.PKWT.length;
  const statusProbation = statusEmployees.Probation.length;
  const statusIntern = statusEmployees.Magang.length;

  // Department Distribution
  const departmentDistribution: EmployeeDemographicGroup[] = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredEmployees.forEach(emp => {
      const d = (emp.department || emp.department_name || '').trim() || 'Belum tercatat';
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(emp);
    });

    const arr = Array.from(map.entries()).map(([label, employees]) => ({ label, employees, count: employees.length }));
    const maxCount = Math.max(...arr.map(x => x.count), 1);

    return arr.map(item => ({
      label: item.label,
      employees: item.employees,
      count: item.count,
      percentage: totalHeadcount > 0 ? Number(((item.count / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: item.count === maxCount && item.count > 0,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Gender Composition
  const genderEmployees = useMemo(() => {
    const groups: Record<string, any[]> = { 'Laki-laki': [], Perempuan: [], 'Belum diisi': [] };

    filteredEmployees.forEach(emp => {
      const g = String(emp.gender || '').toLowerCase().trim();
      if (['perempuan', 'female', 'wanita', 'p', 'f'].includes(g)) groups.Perempuan.push(emp);
      else if (['laki-laki', 'laki laki', 'laki', 'male', 'pria', 'l', 'm'].includes(g)) groups['Laki-laki'].push(emp);
      else groups['Belum diisi'].push(emp);
    });

    return groups;
  }, [filteredEmployees]);
  const maleCount = genderEmployees['Laki-laki'].length;
  const femaleCount = genderEmployees.Perempuan.length;

  // Monthly Headcount Movement Trend (Last 6 Months)
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date(snapshotDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = monthNames[d.getMonth()];

      const count = accounts.filter(a => {
        if (!a.join_date) return true;
        return a.join_date <= `${mStr}-31` && (!a.separation_date || a.separation_date > `${mStr}-01`);
      }).length;

      months.push({
        month: i === 0 ? `${name}*` : name,
        count: count > 0 ? count : totalHeadcount,
        isCurrent: i === 0,
      });
    }

    return months;
  }, [snapshotDate, accounts, totalHeadcount]);

  // HR Action Center Items: Kontrak PKWT (non-probation) vs Masa Probation
  // Tanggal SK pengangkatan lebih akurat daripada contract_end_date untuk masa probation.
  const probationEndDateFor = (emp: any) => probationEndDates[String(emp.id)] || emp.contract_end_date;

  const expiringContracts = useMemo(() => {
    return filteredEmployees.filter(emp => {
      const type = `${emp.contract_type || ''} ${emp.employment_type || ''}`.toLowerCase();
      const isProbation = type.includes('probation') || type.includes('percobaan');
      return !isProbation && isContractNeedingDecision(emp.contract_end_date);
    });
  }, [filteredEmployees]);

  const expiringProbations = useMemo(() => {
    return filteredEmployees.filter(emp => {
      const type = `${emp.contract_type || ''} ${emp.employment_type || ''}`.toLowerCase();
      const isProbation = type.includes('probation') || type.includes('percobaan');
      if (!isProbation) return false;
      return isContractNeedingDecision(probationEndDateFor(emp));
    });
  }, [filteredEmployees, probationEndDates]);

  // Item yang sudah melewati tanggal berakhir tetap ditampilkan, tapi ditandai terpisah.
  const overdueDecisions = useMemo(() => {
    const isOverdue = (date?: string | null) => (contractDaysLeft(date) ?? 0) < 0;
    return {
      contracts: expiringContracts.filter(emp => isOverdue(emp.contract_end_date)),
      probations: expiringProbations.filter(emp => isOverdue(probationEndDateFor(emp))),
    };
  }, [expiringContracts, expiringProbations, probationEndDates]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter(r => {
      const s = String(r.status || '').toLowerCase();
      return s.includes('pending') || s.includes('submitted') || resolveApprovalStatus(r) === 'pending';
    }).length;
  }, [requests]);

  const presentTodayCount = useMemo(() => {
    const todayStr = jakartaDate();
    const userIds = new Set(filteredEmployees.map(e => String(e.id)));
    return records.filter(r => r.date === todayStr && userIds.has(String(r.user_id))).length;
  }, [records, filteredEmployees]);

  const totalExpiringCount = expiringContracts.length + expiringProbations.length;

  const seniorEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => {
      const a = calculateAge(emp.date_of_birth);
      return a !== null && a >= 55;
    });
  }, [filteredEmployees]);

  const probationEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => {
      const type = String(emp.employment_type || emp.contract_type || '').toLowerCase();
      return type.includes('probation') || type.includes('percobaan');
    });
  }, [filteredEmployees]);

  const incompleteEducationEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => !emp.last_education);
  }, [filteredEmployees]);

  // Dynamic Company Summary Table Rows
  const companySummaryRows = useMemo(() => {
    const compMap = new Map<string, any[]>();

    companiesList.forEach(c => {
      if (c.name) compMap.set(c.name, []);
    });

    filteredEmployees.forEach(emp => {
      const c = (emp.company || emp.company_name || 'The Gesit Companies').trim();
      if (!compMap.has(c)) compMap.set(c, []);
      compMap.get(c)!.push(emp);
    });

    return Array.from(compMap.entries())
      .filter(([_, emps]) => selectedCompany === 'all' || emps.length > 0)
      .map(([companyName, emps]) => {
        const count = emps.length;
        const ages = emps.map(e => calculateAge(e.date_of_birth)).filter((x): x is number => x !== null);
        const avgA = ages.length > 0 ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1).replace('.', ',') + ' tahun' : '-';

        const tenures = emps.map(e => calculateTenureYears(e.join_date)).filter((x): x is number => x !== null);
        const avgT = tenures.length > 0 ? (tenures.reduce((a, b) => a + b, 0) / tenures.length).toFixed(1).replace('.', ',') + ' tahun' : '-';

        let p = 0;
        let c = 0;
        let pr = 0;
        let exp = 0;

        emps.forEach(e => {
          const t = String(e.employment_type || e.contract_type || '').toLowerCase();
          if (t.includes('probation') || t.includes('percobaan')) pr++;
          else if (t.includes('pkwtt') || t.includes('tetap') || t.includes('permanent')) p++;
          else c++;

          if (isContractNeedingDecision(e.contract_end_date)) exp++;
        });

        return {
          company: companyName,
          employees: count,
          avgAge: avgA,
          tenure: avgT,
          breakdown: `${p} / ${c} / ${pr}`,
          expiringContract: `${exp} karyawan`,
          rawExpiring: exp,
          employeeList: emps,
        };
      })
      .sort((a, b) => b.employees - a.employees);
  }, [companiesList, filteredEmployees, selectedCompany]);

  // Nexora UI: Status Kepegawaian Percentages for Multi-segment Bar
  const permPct = totalHeadcount > 0 ? Math.round((statusPermanent / totalHeadcount) * 100) : 0;
  const contPct = totalHeadcount > 0 ? Math.round((statusContract / totalHeadcount) * 100) : 0;
  const probPct = totalHeadcount > 0 ? Math.round((statusProbation / totalHeadcount) * 100) : 0;
  const internPct = totalHeadcount > 0 ? Math.max(0, 100 - permPct - contPct - probPct) : 0;

  const largestAgeGroup = ageDistribution.filter(group => group.label !== 'Belum tercatat' && group.count > 0)
    .sort((a, b) => b.count - a.count)[0];
  const overFiveYearsPercentage = totalHeadcount > 0
    ? (overFiveYearsEmployees.length / totalHeadcount * 100).toFixed(1).replace('.', ',') : '0';

  // Nexora UI: Top Companies for Deal-style List Card with Colorized Company Logos
  const topCompanies = useMemo(() => {
    const list = (companySummaryRows || []).filter(c => c.employees > 0).slice(0, 5);
    
    const getCompanyColor = (name: string, fallbackIdx: number) => {
      const clean = (name || '').toUpperCase();
      if (clean.includes('GESIT PERKASA')) {
        return {
          bar: 'bg-[#2d3776]',
          badge: 'bg-[#2d3776]/10 text-[#2d3776] border-[#2d3776]/30 dark:bg-[#2d3776]/20 dark:text-[#9eaee6]',
          label: 'Holding Utama',
          logoColor: 'text-[#2d3776] dark:text-[#8d9ee8]',
          bg: 'bg-[#2d3776]/10',
          border: 'border-[#2d3776]/30'
        };
      }
      if (clean.includes('DHARMA ALUMAS')) {
        return {
          bar: 'bg-sky-500',
          badge: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300',
          label: 'Operasional',
          logoColor: 'text-sky-600 dark:text-sky-400',
          bg: 'bg-sky-500/10 dark:bg-sky-500/15',
          border: 'border-sky-500/30 dark:border-sky-500/35'
        };
      }
      if (clean.includes('GESIT ALUMAS')) {
        return {
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300',
          label: 'Bisnis Unit',
          logoColor: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          border: 'border-emerald-500/30 dark:border-emerald-500/35'
        };
      }
      if (clean.includes('PRODAS PERDANA')) {
        return {
          bar: 'bg-orange-500',
          badge: 'bg-orange-50 text-orange-700 border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300',
          label: 'Investasi',
          logoColor: 'text-orange-500 dark:text-orange-400',
          bg: 'bg-orange-500/10 dark:bg-orange-500/15',
          border: 'border-orange-500/30 dark:border-orange-500/35'
        };
      }
      if (clean.includes('GESIT INTRADE')) {
        return {
          bar: 'bg-indigo-500',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-950/40 dark:text-indigo-300',
          label: 'Proyek',
          logoColor: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
          border: 'border-indigo-500/30 dark:border-indigo-500/35'
        };
      }

      const fallbacks = [
        {
          bar: 'bg-[#2d3776]',
          badge: 'bg-[#2d3776]/10 text-[#2d3776] border-[#2d3776]/30 dark:bg-[#2d3776]/20 dark:text-[#9eaee6]',
          label: 'Holding Utama',
          logoColor: 'text-[#2d3776] dark:text-[#8d9ee8]',
          bg: 'bg-[#2d3776]/10',
          border: 'border-[#2d3776]/30'
        },
        {
          bar: 'bg-sky-500',
          badge: 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-950/40 dark:text-sky-300',
          label: 'Operasional',
          logoColor: 'text-sky-600 dark:text-sky-400',
          bg: 'bg-sky-500/10 dark:bg-sky-500/15',
          border: 'border-sky-500/30 dark:border-sky-500/35'
        },
        {
          bar: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300',
          label: 'Bisnis Unit',
          logoColor: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
          border: 'border-emerald-500/30 dark:border-emerald-500/35'
        },
      ];
      return fallbacks[fallbackIdx % fallbacks.length];
    };

    return list.map((item, idx) => {
      const pct = totalHeadcount > 0 ? Math.round((item.employees / totalHeadcount) * 100) : 0;
      return {
        ...item,
        percentage: pct,
        color: getCompanyColor(item.company, idx)
      };
    });
  }, [companySummaryRows, totalHeadcount]);

  // Helper to open drilldown list with real data
  const openDrilldown = (groupName: string, category: string, employeeList?: any[], options?: {
    subtitle?: string;
    dateField?: EmployeeDateField;
  }) => {
    drilldownTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let list = employeeList;
    if (!list) {
      if (groupName.includes('55')) list = seniorEmployees;
      else if (groupName.toLowerCase().includes('probation')) list = probationEmployees;
      else if (groupName.toLowerCase().includes('belum lengkap')) list = incompleteEducationEmployees;
      else if (groupName.toLowerCase().includes('kontrak')) list = expiringContracts;
      else list = filteredEmployees;
    }

    setDrilldownSearch('');
    setDrilldownModal({
      open: true,
      title: `${category}: ${groupName}`,
      subtitle: options?.subtitle ?? `Daftar karyawan aktif (${list.length} orang) berdasarkan filter terpilih`,
      employees: list,
      dateField: options?.dateField,
    });
  };

  // Filtered list inside drilldown modal
  const modalEmployeesFiltered = useMemo(() => {
    const q = drilldownSearch.toLowerCase().trim();
    if (!q) return drilldownModal.employees;
    return drilldownModal.employees.filter((emp: any) => {
      const name = String(emp.full_name || emp.name || '').toLowerCase();
      const code = String(emp.employee_code || emp.nik || '').toLowerCase();
      const title = String(emp.job_title || emp.position || '').toLowerCase();
      const comp = String(emp.company || '').toLowerCase();
      const dept = String(emp.department || '').toLowerCase();
      return name.includes(q) || code.includes(q) || title.includes(q) || comp.includes(q) || dept.includes(q);
    });
  }, [drilldownModal.employees, drilldownSearch]);

  // Helper to map an employee to a full Excel row
  const mapEmployeeToMasterRow = (emp: any, index: number) => {
    const branchLower = String(emp.branch || emp.work_location || '').toLowerCase().trim();
    const isNonHq = branchLower.includes('non') || branchLower.includes('site') || branchLower.includes('cabang') || branchLower.includes('field') || branchLower.includes('proyek');
    const placementType = !branchLower ? '-' : isNonHq ? 'Non-HQ (Site / Lapangan)' : branchLower === 'hq' || branchLower.includes('headquarter') ? 'HQ (Headquarter)' : emp.branch || emp.work_location;

    const age = calculateAge(emp.date_of_birth);
    const tenure = calculateTenureYears(emp.join_date);

    let contractRemainingDays: number | string = '-';
    let contractStatusAlert = 'Tanggal kontrak belum tercatat';
    if (emp.contract_end_date) {
      const end = new Date(emp.contract_end_date);
      if (!isNaN(end.getTime())) {
        const todayDate = new Date();
        const diff = Math.ceil((end.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        contractRemainingDays = diff >= 0 ? diff : 0;
        if (diff < 0) {
          contractStatusAlert = 'Tanggal kontrak telah lewat';
        } else if (diff <= 30) {
          contractStatusAlert = 'Perlu evaluasi (≤30 hari)';
        } else if (diff <= 60) {
          contractStatusAlert = 'Mendekati Jatuh Tempo (≤ 60 Hari)';
        } else {
          contractStatusAlert = 'Aktif';
        }
      }
    }

    return {
      'No': index + 1,
      'ID Karyawan': String(emp.id),
      'NIK / Employee ID': String(emp.employee_code || emp.nik || '-'),
      'Nama Lengkap': emp.full_name || emp.name || '-',
      'Perusahaan / Entitas': emp.company || emp.company_name || '-',
      'Departemen': emp.department || emp.department_name || '-',
      'Jabatan / Posisi': emp.job_title || emp.position || '-',
      'Level / Golongan': emp.job_level || emp.level || emp.grade || '-',
      'Grade / Class': emp.grade_class || '-',
      'Tipe Penempatan': placementType,
      'Lokasi Kantor / Cabang': emp.branch || emp.work_location || '-',
      'Status Kepegawaian': emp.contract_type || emp.employment_type || '-',
      'Status Akun': emp.status || 'Active',
      'Tanggal Bergabung': emp.join_date || '-',
      'Tanggal Keluar': emp.separation_date || '-',
      'Alasan Keluar': emp.separation_reason || '-',
      'Masa Kerja (Tahun)': tenure !== null ? tenure : '-',
      'Nomor Kontrak / SK': emp.pkwt_number || emp.contract_number || '-',
      'Mulai Kontrak': emp.contract_start_date || '-',
      'Selesai Kontrak': emp.contract_end_date || '-',
      'Sisa Kontrak (Hari)': contractRemainingDays,
      'Status Evaluasi Kontrak': contractStatusAlert,
      'Email Perusahaan': emp.email || '-',
      'No. Handphone / WA': emp.phone_number || emp.phone || '-',
      'Jenis Kelamin': emp.gender || '-',
      'Tanggal Lahir': emp.date_of_birth || '-',
      'Usia (Tahun)': age !== null ? age : '-',
      'Tempat Lahir': emp.birth_place || '-',
      'Agama': emp.religion || '-',
      'Status Pernikahan': emp.marital_status || '-',
      'Pendidikan Terakhir': emp.last_education || '-',
      'Nama Institusi / Kampus': emp.institution_name || '-',
      'Jurusan': emp.major || '-',
      'Alamat': emp.residential_address || emp.address || '-',
      'Mode Jadwal': emp.work_schedule_type || 'default',
      'ID Shift': emp.schedule_id != null ? String(emp.schedule_id) : '-',
      'Nama Shift': attendanceContext.schedules.find(schedule => String(schedule.id) === String(emp.schedule_id))?.name || '-',
      'Bank Payroll': emp.bank_name || '-',
      'Nomor Rekening': String(emp.bank_account_number || '-'),
      'Atas Nama Rekening': emp.bank_account_name || '-',
      'NPWP': String(emp.npwp || '-'),
      'BPJS Ketenagakerjaan': emp.bpjs_tk_number || '-',
      'BPJS Kesehatan': emp.bpjs_health_number || '-'
    };
  };

  // Every export uses the loaded snapshot, never the truncated on-screen lists.
  const handleExportFullExcel = () => {
    try {
      if (loading || exporting) return;
      if (attendanceContext.error) throw new Error('Ekspor lengkap dibatalkan: jadwal atau kalender belum berhasil dimuat. Muat ulang dashboard terlebih dahulu.');
      setExporting(true);

      // Sheet 1: Ringkasan Eksekutif & KPI
      const kpiOverviewRows = [
        { 'Kategori': 'INFORMASI DOKUMEN', 'Indikator': 'Judul Laporan', 'Nilai': 'Laporan Eksekutif Human Capital Management (HCM)', 'Catatan / Detail': 'The Gesit Companies' },
        { 'Kategori': 'INFORMASI DOKUMEN', 'Indikator': 'Tanggal Snapshot Data', 'Nilai': snapshotDate, 'Catatan / Detail': `Filter Entitas: ${selectedCompany === 'all' ? 'Semua Perusahaan' : selectedCompany}` },
        { 'Kategori': 'INFORMASI DOKUMEN', 'Indikator': 'Filter Departemen', 'Nilai': selectedDepartment === 'all' ? 'Semua Departemen' : selectedDepartment, 'Catatan / Detail': `Waktu Export: ${new Date().toLocaleString('id-ID')}` },
        { 'Kategori': '', 'Indikator': '', 'Nilai': '', 'Catatan / Detail': '' },
        
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Total Karyawan Aktif', 'Nilai': `${totalHeadcount} Orang`, 'Catatan / Detail': 'Karyawan terverifikasi aktif sistem' },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Karyawan Baru (Bulan Ini)', 'Nilai': `+${newHires} Orang`, 'Catatan / Detail': `Periode ${currentMonthStr}` },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Karyawan Keluar (Turnover)', 'Nilai': `${resignations} Orang (${turnoverRate}%)`, 'Catatan / Detail': 'Turnover bulan berjalan' },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Rata-Rata Usia', 'Nilai': `${avgAge} Tahun`, 'Catatan / Detail': ageRangeStr },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Rata-Rata Masa Kerja', 'Nilai': `${avgTenure} Tahun`, 'Catatan / Detail': `${overFiveYearsEmployees.length} karyawan masa kerja ≥5 tahun (${overFiveYearsPercentage}%)` },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Karyawan Tetap (PKWTT)', 'Nilai': `${statusPermanent} Orang`, 'Catatan / Detail': `${totalHeadcount > 0 ? ((statusPermanent / totalHeadcount) * 100).toFixed(1) : 0}% dari total` },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Karyawan Kontrak (PKWT)', 'Nilai': `${statusContract} Orang`, 'Catatan / Detail': `${totalHeadcount > 0 ? ((statusContract / totalHeadcount) * 100).toFixed(1) : 0}% dari total` },
        { 'Kategori': 'KOMPOSISI SDM', 'Indikator': 'Probation & Magang', 'Nilai': `${statusProbation + statusIntern} Orang`, 'Catatan / Detail': `Probation: ${statusProbation}, Magang: ${statusIntern}` },
        { 'Kategori': '', 'Indikator': '', 'Nilai': '', 'Catatan / Detail': '' },

        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Tingkat Kehadiran', 'Nilai': attendanceRate === '-' ? '-' : `${attendanceRate}%`, 'Catatan / Detail': `${checkedInCount} check-in / ${attendanceSnapshot.required} wajib hadir pada ${snapshotDate}; cuti dan hari libur dikecualikan` },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Hadir Tepat Waktu', 'Nilai': `${onTimeCount} Orang`, 'Catatan / Detail': 'Check-in sebelum batas toleransi' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Terlambat Masuk', 'Nilai': `${lateCount} Orang`, 'Catatan / Detail': 'Check-in melewati jam shift kerja' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Cuti / Izin / Sakit', 'Nilai': `${leaveCount} Orang`, 'Catatan / Detail': 'Pengajuan permohonan disetujui' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Belum Check-In', 'Nilai': `${notCheckedInCount} Orang`, 'Catatan / Detail': 'Waktu masuk telah lewat, bukan penetapan mangkir' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Masih Dalam Waktu Masuk', 'Nilai': `${attendanceSnapshot.upcoming.length} Orang`, 'Catatan / Detail': 'Berdasarkan jam masuk shift atau batas fleksibel' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Tidak Dijadwalkan', 'Nilai': `${attendanceSnapshot.offDuty.length} Orang`, 'Catatan / Detail': 'Hari libur atau di luar masa kerja' },
        { 'Kategori': 'PRESENSI & KEHADIRAN', 'Indikator': 'Jadwal Belum Lengkap', 'Nilai': `${attendanceSnapshot.unknown.length} Orang`, 'Catatan / Detail': 'Tidak diasumsikan belum check-in' },
        { 'Kategori': 'KELENGKAPAN DATA', 'Indikator': 'Tanggal Lahir Valid', 'Nilai': `${agesWithData.length} dari ${totalHeadcount}`, 'Catatan / Detail': 'Dasar perhitungan rata-rata usia' },
        { 'Kategori': 'KELENGKAPAN DATA', 'Indikator': 'Tanggal Masuk Tercatat', 'Nilai': `${tenuresWithData.length} dari ${totalHeadcount}`, 'Catatan / Detail': 'Dasar perhitungan rata-rata masa kerja' },
        { 'Kategori': '', 'Indikator': '', 'Nilai': '', 'Catatan / Detail': '' },

        { 'Kategori': 'KEPATUHAN & MONITORING', 'Indikator': 'Kontrak Berakhir ≤ 30 Hari', 'Nilai': `${expiringContracts.length} Orang`, 'Catatan / Detail': 'Mendesak: butuh evaluasi perpanjangan PKWT / SK' },
        { 'Kategori': 'KEPATUHAN & MONITORING', 'Indikator': 'Mendekati Pensiun (≥ 55 Thn)', 'Nilai': `${seniorEmployees.length} Orang`, 'Catatan / Detail': 'Perlu persiapan suksesi talenta' },
        { 'Kategori': 'KEPATUHAN & MONITORING', 'Indikator': 'Permohonan Pending Approval', 'Nilai': `${totalPendingRequestsCount} Pengajuan`, 'Catatan / Detail': 'Menunggu persetujuan atasan / HR' },
      ];

      // Sheet 2: Master Data Seluruh Karyawan
      const employeeRows = filteredEmployees.map(mapEmployeeToMasterRow);

      // Sheet 3: Monitoring Kontrak PKWT
      const contractRows = expiringContracts.map((emp, i) => {
        let days = '-';
        if (emp.contract_end_date) {
          const end = new Date(emp.contract_end_date);
          days = `${Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Hari`;
        }
        return {
          'No': i + 1,
          'NIK': emp.employee_code || emp.nik || '-',
          'Nama Lengkap': emp.full_name || emp.name || '-',
          'Perusahaan': emp.company || emp.company_name || '-',
          'Departemen': emp.department || emp.department_name || '-',
          'Jabatan': emp.job_title || emp.position || '-',
          'Nomor Kontrak / SK': emp.pkwt_number || emp.contract_number || '-',
          'Mulai Kontrak': emp.contract_start_date || '-',
          'Selesai Kontrak': emp.contract_end_date || '-',
          'Sisa Hari Menuju Jatuh Tempo': days,
          'Status Evaluasi': 'Jatuh tempo ≤30 hari',
          'Rekomendasi Tindakan HR': 'Perpanjangan PKWT / Evaluasi Pengangkatan PKWTT / Persiapan Surat Pengakhiran',
          'Email Karyawan': emp.email || '-',
          'No. Telp / WA': emp.phone_number || emp.phone || '-'
        };
      });

      // Sheet 4: Rekap Presensi & Kehadiran Hari Ini
      const presenceLabels = new Map<string, string>();
      for (const [label, list] of [
        ['Tepat waktu', attendanceSnapshot.onTime], ['Terlambat', attendanceSnapshot.late],
        ['Cuti / izin / sakit', attendanceSnapshot.leave], ['Belum check-in', attendanceSnapshot.pending],
        ['Masih dalam waktu masuk', attendanceSnapshot.upcoming], ['Tidak dijadwalkan', attendanceSnapshot.offDuty],
        ['Jadwal belum lengkap', attendanceSnapshot.unknown],
      ] as [string, any[]][]) list.forEach(employee => presenceLabels.set(String(employee.id), label));
      const formatExportTime = (value: string | null | undefined) => value ? new Date(value).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }) : '-';
      const attendanceRows = filteredEmployees.map((emp, i) => {
        const rec = todayAttendance.find(record => String(record.user_id) === String(emp.id));
        return {
          'No': i + 1,
          'ID Karyawan': String(emp.id), 'Tanggal': snapshotDate,
          'NIK': String(emp.employee_code || emp.nik || '-'),
          'Nama Karyawan': emp.full_name || emp.name || '-',
          'Perusahaan': emp.company || emp.company_name || '-',
          'Departemen': emp.department || emp.department_name || '-',
          'Status Kehadiran': presenceLabels.get(String(emp.id)) || 'Belum terklasifikasi',
          'Jam Masuk (Clock In)': formatExportTime(rec?.clock_in),
          'Jam Pulang (Clock Out)': formatExportTime(rec?.clock_out),
          'Durasi Kerja (Menit)': rec?.total_work_minutes ?? '-',
          'Verifikasi Geofence': rec?.geofence_verified == null ? 'Belum tercatat' : rec.geofence_verified ? 'Terverifikasi GPS' : 'Tidak terverifikasi',
        };
      });
      const demographicGroups = [
        { category: 'Usia', groups: ageDistribution },
        { category: 'Pendidikan', groups: educationDistribution },
        { category: 'Masa kerja', groups: tenureDistribution },
        { category: 'Departemen', groups: departmentDistribution },
        { category: 'Status kepegawaian', groups: Object.entries(statusEmployees).map(([label, employees]) => ({ label, employees, count: employees.length })) },
        { category: 'Gender', groups: Object.entries(genderEmployees).map(([label, employees]) => ({ label, employees, count: employees.length })) },
      ];
      const groupRows = demographicGroups.flatMap(({ category, groups }) => groups.map(group => ({
        'Kategori': category, 'Kelompok': group.label, 'Jumlah Karyawan': group.count,
        'Persentase (%)': totalHeadcount > 0 ? Number((group.count / totalHeadcount * 100).toFixed(1)) : 0,
      })));
      const groupMembers = demographicGroups.flatMap(({ category, groups }) => groups.flatMap(group => group.employees.map(employee => ({
        'Kategori': category, 'Kelompok': group.label, 'ID Karyawan': String(employee.id),
        'NIK': String(employee.employee_code || employee.nik || '-'), 'Nama Karyawan': employee.full_name || employee.name || '-',
        'Perusahaan': employee.company || employee.company_name || '-', 'Departemen': employee.department || employee.department_name || '-',
      }))));
      const accountMap = new Map(accounts.map(employee => [String(employee.id), employee]));
      const periodLogs = records.filter(record => record.date >= `${currentMonthStr}-01` && record.date <= snapshotDate &&
        ((selectedCompany === 'all' && selectedDepartment === 'all') || scopedEmployeeIds.has(String(record.user_id)))).map(record => {
        const employee = accountMap.get(String(record.user_id));
        return {
          'ID Log': String(record.id), 'ID Karyawan': String(record.user_id), 'Tanggal': record.date,
          'NIK': String(employee?.employee_code || employee?.nik || '-'), 'Nama Karyawan': employee?.full_name || employee?.name || '-',
          'Perusahaan': employee?.company || employee?.company_name || '-', 'Departemen': employee?.department || employee?.department_name || '-',
          'Status': record.status, 'Jam Masuk (WIB)': formatExportTime(record.clock_in), 'Jam Pulang (WIB)': formatExportTime(record.clock_out),
          'Durasi Kerja (Menit)': record.total_work_minutes ?? 0, 'Lembur (Menit)': record.total_overtime_minutes ?? 0,
          'Lokasi Masuk': record.clock_in_office_name || '-', 'Lokasi Pulang': record.clock_out_office_name || '-',
          'Catatan': record.notes || '-',
        };
      });
      const requestRows = scopedRequests.map(request => {
        const employee = accountMap.get(String(request.user_id));
        return {
          'ID Pengajuan': String(request.id), 'Jenis': request.type, 'ID Karyawan': String(request.user_id),
          'NIK': String(employee?.employee_code || employee?.nik || '-'), 'Nama Karyawan': employee?.full_name || employee?.name || '-',
          'Perusahaan': employee?.company || employee?.company_name || '-', 'Departemen': employee?.department || employee?.department_name || '-',
          'Status': resolveApprovalStatus(request), 'Tahap Approval': request.current_approval_level ?? '-',
          'Tanggal Pengajuan': request.created_at || '-', 'Tanggal Mulai': request.start_date || request.date || '-', 'Tanggal Selesai': request.end_date || '-',
          'Tipe Cuti': request.leave_type || '-', 'Nominal': request.amount ?? '-', 'Durasi (Jam)': request.duration_hours ?? '-',
          'Keterangan': request.reason || request.notes || request.description || '-',
        };
      });
      const masterHeaders = Object.keys(mapEmployeeToMasterRow({}, 0));
      const wb = dashboardWorkbook({ snapshotDate, company: selectedCompany, department: selectedDepartment, sections: [
        { name: '1. Ringkasan Eksekutif & KPI', rows: kpiOverviewRows, headers: ['Kategori', 'Indikator', 'Nilai', 'Catatan / Detail'], scope: 'Seluruh indikator dashboard sesuai filter. Usia dan masa kerja dihitung saat data dimuat; status karyawan adalah status akun saat ini.' },
        { name: '2. Master Data Karyawan', rows: employeeRows, headers: masterHeaders, scope: 'Seluruh karyawan aktif sesuai filter, tanpa batas daftar tampilan.' },
        { name: '3. Evaluasi Kontrak PKWT', rows: contractRows, headers: ['No', 'NIK', 'Nama Lengkap', 'Perusahaan', 'Departemen', 'Selesai Kontrak'], scope: 'Seluruh kontrak karyawan aktif yang berakhir dalam 30 hari dari hari ini.' },
        { name: '4. Rekap Presensi Harian', rows: attendanceRows, headers: ['ID Karyawan', 'Tanggal', 'NIK', 'Nama Karyawan', 'Status Kehadiran'], scope: 'Satu baris per karyawan aktif, termasuk yang belum memiliki log presensi.' },
        { name: '5. Log Presensi Bulan', rows: periodLogs, headers: ['ID Log', 'ID Karyawan', 'Tanggal', 'NIK', 'Nama Karyawan', 'Status'], scope: `${currentMonthStr}-01 sampai ${snapshotDate}, termasuk log milik karyawan nonaktif yang sesuai filter.` },
        { name: '6. Distribusi Demografi', rows: groupRows, headers: ['Kategori', 'Kelompok', 'Jumlah Karyawan', 'Persentase (%)'], scope: 'Usia, pendidikan, masa kerja, departemen, status kepegawaian, dan gender.' },
        { name: '7. Anggota Kelompok', rows: groupMembers, headers: ['Kategori', 'Kelompok', 'ID Karyawan', 'NIK', 'Nama Karyawan', 'Perusahaan', 'Departemen'], scope: 'Seluruh anggota tiap kelompok; satu karyawan muncul sekali per kategori.' },
        { name: '8. Ringkasan Perusahaan', rows: companySummaryRows.map(company => ({ 'Perusahaan': company.company, 'Karyawan Aktif': company.employees, 'Persentase (%)': totalHeadcount > 0 ? Number((company.employees / totalHeadcount * 100).toFixed(1)) : 0, 'Rata-rata Usia': company.avgAge, 'Rata-rata Masa Kerja': company.tenure, 'Tetap - Kontrak - Probation': company.breakdown, 'Kontrak Berakhir ≤30 Hari': company.rawExpiring })), headers: ['Perusahaan', 'Karyawan Aktif', 'Persentase (%)'], scope: 'Seluruh perusahaan pada ringkasan dashboard, bukan hanya 5 teratas.' },
        { name: '9. Karyawan Masuk', rows: newHiresList.map(mapEmployeeToMasterRow), headers: masterHeaders, scope: `Tanggal bergabung pada ${currentMonthLabel}, termasuk yang kini nonaktif.` },
        { name: '10. Karyawan Keluar', rows: resignationsList.map(mapEmployeeToMasterRow), headers: masterHeaders, scope: `Tanggal keluar pada ${currentMonthLabel}, dasar perhitungan turnover.` },
        { name: '11. Pengajuan', rows: requestRows, headers: ['ID Pengajuan', 'Jenis', 'ID Karyawan', 'NIK', 'Nama Karyawan', 'Status'], scope: 'Seluruh periode pengajuan cuti, lembur, reimbursement, dan koreksi yang dimuat dashboard, sesuai filter.' },
        { name: '12. Karyawan Nonaktif', rows: scopedEmployees.filter(employee => !filteredEmployeeIds.has(String(employee.id))).map(mapEmployeeToMasterRow), headers: masterHeaders, scope: 'Akun nonaktif dalam filter perusahaan/departemen; dipisahkan agar tidak tercampur dengan jumlah karyawan aktif.' },
      ] });

      XLSX.writeFile(wb, `GESIT-HCM-Laporan-Keseluruhan-${snapshotDate}.xlsx`);
      toast.success(`Laporan lengkap ${wb.SheetNames.length} sheet berhasil diunduh, termasuk ${employeeRows.length} karyawan aktif.`);
    } catch (err: any) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengunduh file Excel: ' + (err?.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  // 2. Ekspor Khusus Master Data Karyawan
  const handleExportEmployeeMasterExcel = () => {
    try {
      if (loading || exporting) return;
      if (attendanceContext.error) throw new Error('Data jadwal belum lengkap. Muat ulang sebelum ekspor.');
      setExporting(true);
      const rows = filteredEmployees.map(mapEmployeeToMasterRow);
      const wb = dashboardWorkbook({ snapshotDate, company: selectedCompany, department: selectedDepartment, sections: [{
        name: 'Master Data Karyawan', rows, headers: Object.keys(mapEmployeeToMasterRow({}, 0)), scope: 'Seluruh karyawan aktif sesuai filter dashboard.',
      }] });
      XLSX.writeFile(wb, `GESIT-HCM-Master-Data-Karyawan-${snapshotDate}.xlsx`);
      toast.success(`Master Data ${rows.length} Karyawan Excel (.xlsx) berhasil diunduh!`);
    } catch (err: any) {
      toast.error('Gagal mengunduh data karyawan: ' + (err?.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  // 3. Ekspor Khusus Kontrak PKWT
  const handleExportContractsExcel = () => {
    try {
      if (loading || exporting) return;
      setExporting(true);
      const rows = expiringContracts.map((emp, i) => {
        let days = '-';
        if (emp.contract_end_date) {
          const end = new Date(emp.contract_end_date);
          days = `${Math.ceil((end.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Hari`;
        }
        return {
          'No': i + 1,
          'NIK': String(emp.employee_code || emp.nik || '-'),
          'Nama Lengkap': emp.full_name || emp.name || '-',
          'Perusahaan': emp.company || emp.company_name || '-',
          'Departemen': emp.department || emp.department_name || '-',
          'Jabatan': emp.job_title || emp.position || '-',
          'Nomor Kontrak / SK': emp.pkwt_number || emp.contract_number || '-',
          'Mulai Kontrak': emp.contract_start_date || '-',
          'Selesai Kontrak': emp.contract_end_date || '-',
          'Sisa Hari': days,
          'Status Evaluasi': 'Jatuh tempo ≤30 hari',
          'Rekomendasi Tindakan HR': 'Perpanjangan PKWT / Pengangkatan PKWTT / Surat Pengakhiran'
        };
      });
      const wb = dashboardWorkbook({ snapshotDate, company: selectedCompany, department: selectedDepartment, sections: [{
        name: 'Jatuh Tempo Kontrak', rows, headers: ['No', 'NIK', 'Nama Lengkap', 'Perusahaan', 'Departemen', 'Jabatan', 'Nomor Kontrak / SK', 'Mulai Kontrak', 'Selesai Kontrak', 'Sisa Hari', 'Status Evaluasi', 'Rekomendasi Tindakan HR'], scope: 'Seluruh kontrak karyawan aktif yang berakhir dalam 30 hari dari hari ini, sesuai filter.',
      }] });
      XLSX.writeFile(wb, `GESIT-HCM-Jatuh-Tempo-Kontrak-${snapshotDate}.xlsx`);
      toast.success('Data Monitoring Jatuh Tempo Kontrak Excel (.xlsx) berhasil diunduh!');
    } catch (err: any) {
      toast.error('Gagal mengunduh monitoring kontrak: ' + (err?.message || 'Error'));
    } finally {
      setExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedCompany('all');
    setSelectedDepartment('all');
    setSnapshotDate(jakartaDate());
  };

  const userGreetingName = useMemo(() => {
    const raw = currentUser?.nickname || currentUser?.fullName || currentUser?.name || 'HR Admin';
    return String(raw).trim().split(' ')[0] || 'Admin';
  }, [currentUser]);

  const formattedTodayDate = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return 'Thursday, October 22, 2026';
    }
  }, []);

  const [weather, setWeather] = useState<{
    temp: number;
    condition: string;
    city: string;
  }>({
    temp: 31,
    condition: 'Cerah Berawan',
    city: 'Jakarta'
  });

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-6.2088&longitude=106.8456&current=temperature_2m,weather_code'
        );
        if (!res.ok) return;
        const data = await res.json();
        const temp = Math.round(data?.current?.temperature_2m ?? 31);
        const code = Number(data?.current?.weather_code ?? 1);
        let condition = 'Cerah';
        if (code === 0) condition = 'Cerah';
        else if (code >= 1 && code <= 3) condition = 'Cerah Berawan';
        else if (code >= 45 && code <= 48) condition = 'Berkabut';
        else if (code >= 51 && code <= 67) condition = 'Hujan Ringan';
        else if (code >= 80 && code <= 82) condition = 'Hujan';
        else if (code >= 95) condition = 'Hujan Petir';

        setWeather({ temp, condition, city: 'Jakarta' });
      } catch {
        // Fallback gracefully
      }
    };
    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 300_000);
    return () => clearInterval(weatherTimer);
  }, []);

  if (loadError) return (
    <section role="alert" className="rounded-[18px] border border-slate-200 bg-white p-6 text-slate-800 dark:border-slate-800 dark:bg-[#131316] dark:text-slate-200">
      <p>{loadError}</p>
      <Button className="mt-4" onClick={loadData}>Muat ulang dashboard</Button>
    </section>
  );

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ── NEXORA STYLE HERO GREETING BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-[18px] border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#131622] p-4.5 sm:p-7 shadow-xs transition-colors">
        {/* Subtle Ambient Radial Mesh Glow Pattern */}
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-96 rounded-full opacity-60 dark:opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(20, 184, 166, 0.12) 40%, transparent 70%)'
          }}
        />

        {/* Top Header: Date & Weather on Left, Download Excel on Right */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-zinc-300">
              <Calendar className="size-3.5 text-slate-400 dark:text-zinc-500" />
              <span>{formattedTodayDate}</span>
            </span>
            <span className="text-slate-300 dark:text-zinc-700 font-light">•</span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-semibold text-[11.5px] shadow-2xs">
              <CloudSun className="size-3.5 text-amber-500" />
              <span>{weather.temp}°C {weather.condition}</span>
              <span className="text-[10.5px] text-amber-600/75 dark:text-amber-300/75 font-normal">({weather.city})</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={exporting || loading}
                    className="h-8.5 rounded-lg gap-1.5 text-xs font-semibold border-slate-200 dark:border-zinc-700/80 bg-white dark:bg-[#181d2c] hover:bg-slate-50 dark:hover:bg-[#1e2538] text-slate-800 dark:text-zinc-200 shadow-2xs cursor-pointer"
                  >
                    <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{exporting ? 'Mengunduh...' : 'Download Excel'}</span>
                    <ChevronDown className="size-3 opacity-60 ml-0.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-68 p-1.5 rounded-xl shadow-2xl bg-white dark:bg-[#151926] border border-slate-200/80 dark:border-zinc-700/80">
                <DropdownMenuLabel className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                  Pilihan Ekspor Data Excel (.xlsx)
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleExportFullExcel}
                  className="text-xs font-medium cursor-pointer py-2 px-2.5 rounded-lg gap-2.5 hover:bg-slate-50 dark:hover:bg-[#1e2538]"
                >
                  <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white">Laporan Keseluruhan (Full)</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">13 sheet lengkap sesuai filter, termasuk demografi & pengajuan</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleExportEmployeeMasterExcel}
                  className="text-xs font-medium cursor-pointer py-2 px-2.5 rounded-lg gap-2.5 hover:bg-slate-50 dark:hover:bg-[#1e2538]"
                >
                  <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                    <Users className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white">Master Data Karyawan</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">{totalHeadcount} karyawan aktif sesuai filter, termasuk data bank</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleExportContractsExcel}
                  className="text-xs font-medium cursor-pointer py-2 px-2.5 rounded-lg gap-2.5 hover:bg-slate-50 dark:hover:bg-[#1e2538]"
                >
                  <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                    <AlertCircle className="size-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 dark:text-white">Monitoring Jatuh Tempo Kontrak</span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">{expiringContracts.length} PKWT & {expiringProbations.length} Probation perlu evaluasi (≤ 30 hari, termasuk yang sudah lewat)</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Welcome Headline & Subtitle */}
        <div className="relative z-10 mt-4 sm:mt-5 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {userGreetingName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal max-w-3xl leading-relaxed">
            Ringkasan performa tenaga kerja hari ini: total karyawan aktif tercatat sebanyak <strong className="font-semibold text-slate-800 dark:text-zinc-200">{totalHeadcount} orang</strong> dengan tingkat kehadiran <strong className="font-semibold text-slate-800 dark:text-zinc-200">{attendanceRate}%</strong>, serta <strong className="font-semibold text-slate-800 dark:text-zinc-200">{totalPendingRequestsCount} pengajuan</strong> yang memerlukan perhatian Anda.
          </p>
        </div>

        {/* Bottom Inline Metrics in Banner */}
        <div className="relative z-10 mt-5 sm:mt-7 pt-4 sm:pt-5 border-t border-slate-100 dark:border-zinc-800/80 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-4 sm:gap-10">
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
              TOTAL KARYAWAN
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 block">
              {totalHeadcount}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200/60 dark:bg-zinc-800 hidden sm:block" />

          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
              KEHADIRAN HARI INI
            </span>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5 block">
              {attendanceRate}%
            </span>
          </div>

          <div className="h-8 w-px bg-slate-200/60 dark:bg-zinc-800 hidden sm:block" />

          <div>
            <span className="block text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
              PENGAJUAN PENDING
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {totalPendingRequestsCount}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200/60 dark:bg-zinc-800 hidden lg:block" />

          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-2 overflow-hidden items-center">
              {accounts.slice(0, 3).map((a, i) => (
                <UserAvatar
                  key={a.id || i}
                  name={a.full_name || a.name || a.username || 'User'}
                  url={a.avatar_url || a.avatarUrl}
                  size="xs"
                  className="size-7 text-[10px] ring-2 ring-white dark:ring-[#131622] shadow-none"
                />
              ))}
              {accounts.length > 3 && (
                <div className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 ring-2 ring-white dark:ring-[#131622] shrink-0">
                  +{accounts.length - 3}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              karyawan terdaftar
            </span>
          </div>
        </div>
      </div>

      {/* ── 4 MODERN TOP KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Karyawan Aktif */}
        <div
          onClick={() => openDrilldown('Karyawan aktif', 'Ringkasan SDM', filteredEmployees, { subtitle: `Daftar karyawan aktif (${totalHeadcount} orang) berdasarkan filter terpilih` })}
          className="bg-white dark:bg-[#131622] rounded-[18px] p-5 border border-[#e5eaf1] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#eff6ff] dark:bg-blue-950/60 text-[#2563eb] dark:text-blue-400 flex items-center justify-center font-bold">
              <Users className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] dark:text-zinc-400 block">Karyawan Aktif</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] dark:text-white leading-none mt-1">
                {totalHeadcount}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] dark:border-zinc-800 flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">Komposisi Tim</span>
              <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1 mt-0.5">
                {statusPermanent} Tetap · {statusContract} PKWT
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">Status</span>
              <span className="font-semibold text-[#475569] dark:text-zinc-400 mt-0.5 block">SDM Terdata</span>
            </div>
          </div>
        </div>

        {/* Card 2: Presensi Hari Ini */}
        <div
          onClick={() => navigate('/attendance/report')}
          className="bg-white dark:bg-[#131622] rounded-[18px] p-5 border border-[#e5eaf1] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#f0fdf4] dark:bg-emerald-950/60 text-[#16a34a] dark:text-emerald-400 flex items-center justify-center font-bold">
              <Clock className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] dark:text-zinc-400 block">Presensi Hari Ini</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] dark:text-white leading-none mt-1">
                {checkedInCount}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] dark:border-zinc-800 flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">On-Time Presensi</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                {checkedInCount > 0 ? `${Math.round((onTimeCount / checkedInCount) * 100)}% (${onTimeCount} tepat waktu)` : 'Belum ada data'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">Wajib Masuk</span>
              <span className="font-semibold text-[#475569] dark:text-zinc-400 mt-0.5 block">{attendanceSnapshot.required} Orang</span>
            </div>
          </div>
        </div>

        {/* Card 3: Antrean Persetujuan */}
        <div
          onClick={() => navigate('/attendance/approvals')}
          className="bg-white dark:bg-[#131622] rounded-[18px] p-5 border border-[#e5eaf1] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(15,23,42,0.05),0_16px_32px_-12px_rgba(15,23,42,0.18)] transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#fffbeb] dark:bg-amber-950/60 text-[#d97706] dark:text-amber-400 flex items-center justify-center font-bold">
              <FileText className="size-5" />
            </div>
            <div>
              <span className="text-[12.5px] font-medium text-[#475569] dark:text-zinc-400 block">Antrean Persetujuan</span>
              <div className="text-[28px] font-extrabold text-[#0f172a] dark:text-white leading-none mt-1">
                {totalPendingRequestsCount}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#e5eaf1] dark:border-zinc-800 flex items-center justify-between text-[12.5px]">
            <div>
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">Tindak Lanjut</span>
              <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                {totalPendingRequestsCount > 0 ? `${totalPendingRequestsCount} butuh approval` : 'Semua diproses'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-[#94a3b8] dark:text-zinc-500 font-medium block">Kategori</span>
              <span className="font-semibold text-[#475569] dark:text-zinc-400 mt-0.5 block">Cuti & Izin</span>
            </div>
          </div>
        </div>

        {/* Card 4: Action Banner (#0f2b46 Navy - Rounded 18px) */}
        <div className="rounded-[18px] bg-[#0f2b46] dark:bg-[#0c1a2e] text-white p-5 shadow-lg border border-[#16324f] dark:border-blue-900/40 flex flex-col justify-between relative overflow-hidden group">
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
              {totalExpiringCount > 0
                ? `${totalExpiringCount} karyawan jatuh tempo kontrak/probation (≤ 30 hari).`
                : 'Tidak ada kontrak atau probation yang jatuh tempo dalam 30 hari.'}
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
        </div>
      </div>

      {/* ── COMPACT FILTER & SNAPSHOT BAR (BELOW CARDS) ── */}
      <div className="bg-white dark:bg-[#131622] border border-[#e5eaf1] dark:border-zinc-800/80 rounded-xl px-3.5 sm:px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-zinc-400 mr-0.5">
            <Filter className="size-3.5" />
            <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-400 dark:text-zinc-400">Filter:</span>
          </div>

          {/* Perusahaan Dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[170px]">
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-[#181d2c] dark:hover:bg-[#1f2639] dark:focus:bg-[#1f2639] px-3 py-1.5 pr-7 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#181d2c] text-slate-800 dark:text-zinc-200">Semua perusahaan</option>
              {companyOptions.map(c => (
                <option key={c} value={c} className="bg-white dark:bg-[#181d2c] text-slate-800 dark:text-zinc-200">
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-400 pointer-events-none" />
          </div>

          {/* Departemen Dropdown */}
          <div className="relative w-full sm:w-auto sm:min-w-[170px]">
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-[#181d2c] dark:hover:bg-[#1f2639] dark:focus:bg-[#1f2639] px-3 py-1.5 pr-7 text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#181d2c] text-slate-800 dark:text-zinc-200">Semua departemen</option>
              {departmentOptions.map(d => (
                <option key={d} value={d} className="bg-white dark:bg-[#181d2c] text-slate-800 dark:text-zinc-200">
                  {d}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-400 pointer-events-none" />
          </div>

          {/* Snapshot Date Picker + Reset */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <input
                type="date"
                value={snapshotDate}
                onChange={e => setSnapshotDate(e.target.value)}
                className="w-full sm:w-auto appearance-none rounded-lg border border-slate-200 dark:border-zinc-700/80 bg-slate-50/80 hover:bg-white focus:bg-white dark:bg-[#181d2c] dark:hover:bg-[#1f2639] dark:focus:bg-[#1f2639] px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-200 dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
                title="Pilih tanggal snapshot data"
              />
            </div>

            {/* Reset Filter Button */}
            {(selectedCompany !== 'all' || selectedDepartment !== 'all' || snapshotDate !== jakartaDate()) && (
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 py-1.5 px-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                title="Reset semua filter ke default"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Snapshot sub-indicator & DB Status */}
        <div className="flex items-center justify-between lg:justify-start gap-3 text-[11px] text-slate-500 dark:text-zinc-400 shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t border-slate-100 dark:border-zinc-800/60 lg:border-t-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />
            <span>
              Snapshot {snapshotDate} · <strong className="font-bold text-slate-800 dark:text-zinc-200">{totalHeadcount} karyawan aktif</strong>
            </span>
          </div>
          <span className="hidden xl:inline text-[10px] text-slate-400 dark:text-zinc-500 font-mono border-l border-slate-200 dark:border-zinc-800 pl-3">
            Database PostgreSQL Terverifikasi
          </span>
        </div>
      </div>

      {/* ── ROW 2: AKTIVITAS KEHADIRAN + JADWAL HARI INI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Aktivitas Kehadiran (Bar Chart - 7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#131622] rounded-2xl sm:rounded-[18px] p-4 sm:p-6 border border-[#e5eaf1] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] flex flex-col justify-between">
          <div>
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#0f172a] dark:text-white">Aktivitas Kehadiran</h3>
                <div className="flex items-center gap-1.5 text-[11.5px] sm:text-[12.5px] mt-0.5">
                  {attendanceActivity.hasComparison && attendanceActivity.diffPercent !== null ? (
                    <>
                      <span className={`font-semibold ${attendanceActivity.diffPercent >= 0 ? 'text-[#16a34a] dark:text-emerald-400' : 'text-[#e11d48] dark:text-rose-400'}`}>
                        {attendanceActivity.diffPercent >= 0 ? '↗ +' : '↘ '}
                        {Math.abs(attendanceActivity.diffPercent)}%
                      </span>
                      <span className="text-[#64748b] dark:text-zinc-400 font-normal">{attendanceActivity.comparisonLabel}</span>
                    </>
                  ) : (
                    <span className="text-[#64748b] dark:text-zinc-400 font-normal">Data presensi real terverifikasi</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setChartPeriod(p => p === 'weekly' ? 'monthly' : 'weekly')}
                className="px-2.5 sm:px-3 py-1.5 rounded-[10px] bg-[#f8fafc] dark:bg-[#181d2c] border border-[#cbd5e1] dark:border-zinc-700 text-[11.5px] sm:text-[12px] font-semibold text-[#475569] dark:text-zinc-300 hover:text-[#0f172a] dark:hover:text-white hover:bg-[#f1f5f9] dark:hover:bg-[#1e2538] flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <span>{chartPeriod === 'weekly' ? 'Mingguan' : 'Bulanan'}</span>
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* Vertical Bar Chart with Slim Rounded Bars */}
            <div className="mt-6 sm:mt-8 h-40 sm:h-44 flex items-end justify-between gap-1 sm:gap-3 px-1 sm:px-3 relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none border-b border-[#e5eaf1] dark:border-zinc-800">
                <div className="border-b border-[#f1f5f9] dark:border-zinc-800/60 w-full flex justify-end pr-1 text-[10px] text-[#94a3b8] dark:text-zinc-500">8h</div>
                <div className="border-b border-[#f1f5f9] dark:border-zinc-800/60 w-full flex justify-end pr-1 text-[10px] text-[#94a3b8] dark:text-zinc-500">6h</div>
                <div className="border-b border-[#f1f5f9] dark:border-zinc-800/60 w-full flex justify-end pr-1 text-[10px] text-[#94a3b8] dark:text-zinc-500">4h</div>
                <div className="border-b border-[#f1f5f9] dark:border-zinc-800/60 w-full flex justify-end pr-1 text-[10px] text-[#94a3b8] dark:text-zinc-500">2h</div>
                <div className="w-full flex justify-end pr-1 text-[10px] text-[#94a3b8] dark:text-zinc-500">0h</div>
              </div>

              {attendanceActivity.items.map((item, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === attendanceActivity.items.length - 1;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-2 relative z-10 group">
                    {/* Tooltip on hover or when highlighted with edge-safe alignment */}
                    <div className={`absolute -top-11 ${
                      isFirst ? 'left-0' : isLast ? 'right-0' : 'left-1/2 -translate-x-1/2'
                    } bg-[#0f172a] dark:bg-zinc-800 dark:border dark:border-zinc-700 text-white px-2.5 py-1 rounded-[8px] text-[10px] font-bold whitespace-nowrap shadow-md flex items-center gap-1 transition-all pointer-events-none ${
                      item.isHighlight ? 'opacity-100 z-20' : 'opacity-0 group-hover:opacity-100 z-20'
                    }`}>
                      <span>⏱️ {item.tooltip}</span>
                    </div>

                    <div className="w-2.5 sm:w-3.5 rounded-full bg-[#f1f5f9] dark:bg-zinc-800 h-28 sm:h-32 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${item.height}%` }}
                        className={`w-full rounded-full transition-all duration-500 ${
                          item.isHighlight
                            ? 'bg-[#2563eb] shadow-sm shadow-[#2563eb]/40'
                            : item.hours > 0
                            ? 'bg-[#cbd5e1] dark:bg-zinc-600 group-hover:bg-[#2563eb]'
                            : 'bg-[#e2e8f0] dark:bg-zinc-700/60'
                        }`}
                      />
                    </div>

                    <span className={`text-[11px] sm:text-[12px] ${item.isHighlight ? 'text-[#2563eb] dark:text-blue-400 font-bold' : 'text-[#64748b] dark:text-zinc-400 font-medium'}`}>
                      {item.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#e5eaf1] dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-[11.5px] sm:text-[12.5px] text-[#64748b] dark:text-zinc-400">
            <span>Total Terpantau: <strong className="text-[#0f172a] dark:text-white">{attendanceActivity.totalTerpantauStr}</strong></span>
            <span className="text-[#2563eb] dark:text-blue-400 font-bold">{attendanceActivity.stabilitasStr}</span>
          </div>
        </div>

        {/* Jadwal Hari Ini (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#131622] rounded-2xl sm:rounded-[18px] p-4 sm:p-6 border border-[#e5eaf1] dark:border-zinc-800/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.12)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#0f172a] dark:text-white">Jadwal Hari Ini</h3>
                <p className="text-[11.5px] sm:text-[12.5px] text-[#475569] dark:text-zinc-400 mt-0.5">Shift kerja & penugasan aktif</p>
              </div>
              <button
                onClick={() => navigate('/calendar')}
                className="text-[11.5px] text-[#2563eb] dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Kalender</span>
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {todayScheduleCards.map((sch, i) => (
                <div
                  key={i}
                  onClick={() => navigate('/calendar')}
                  className="flex items-center justify-between p-2.5 rounded-[10px] bg-[#f8fafc] dark:bg-[#181d2c] hover:bg-[#eff6ff] dark:hover:bg-blue-950/20 transition-colors cursor-pointer group border border-transparent hover:border-[#bfdbfe] dark:hover:border-blue-800/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-[8px] ${sch.bg} ${sch.text} flex items-center justify-center font-bold text-[11px] shrink-0`}>
                      {sch.badge}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-[12px] sm:text-[12.5px] font-semibold text-[#0f172a] dark:text-zinc-200 group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors truncate">
                        {sch.name}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] text-[#64748b] dark:text-zinc-400 truncate">{sch.time} • {sch.count} Karyawan</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-[#94a3b8] dark:text-zinc-500 group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#e5eaf1] dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11.5px] sm:text-[12px] text-[#64748b] dark:text-zinc-400">
            <span>Total Karyawan Terjadwal: <strong className="text-[#0f172a] dark:text-white">{totalHeadcount} Orang</strong></span>
            <span className="text-[#16a34a] dark:text-emerald-400 font-semibold">Tercakup Sistem</span>
          </div>
        </div>
      </div>

      {/* ── NEXORA ADAPTED ROW: WORKFORCE HEALTH & TOP ENTITAS PERUSAHAAN ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left (7 Cols): Sales Pipeline Health -> Kesehatan & Komposisi SDM */}
        <div className="xl:col-span-7 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Dark Square Icon */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-slate-900 dark:bg-zinc-800 text-white dark:text-zinc-100 flex items-center justify-center shadow-xs shrink-0">
                <Activity className="size-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Komposisi & Kehadiran Karyawan
              </h3>
            </div>

            {/* Subheader and Multi-segment Progress Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-bold text-slate-900 dark:text-white">
                  Distribusi Status Kepegawaian
                </span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  {totalHeadcount} karyawan aktif
                </span>
              </div>

              {/* Segmented Color Bar */}
              <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                <div
                  style={{ width: `${permPct}%` }}
                  className="h-full bg-emerald-500 rounded-l-full transition-all duration-700 ease-out"
                  title={`Tetap (PKWTT): ${statusPermanent} (${permPct}%)`}
                />
                <div
                  style={{ width: `${contPct}%` }}
                  className="h-full bg-blue-500 transition-all duration-700 ease-out"
                  title={`Kontrak (PKWT): ${statusContract} (${contPct}%)`}
                />
                <div
                  style={{ width: `${probPct}%` }}
                  className="h-full bg-amber-500 transition-all duration-700 ease-out"
                  title={`Probation: ${statusProbation} (${probPct}%)`}
                />
                <div
                  style={{ width: `${internPct}%` }}
                  className="h-full bg-purple-500 rounded-r-full transition-all duration-700 ease-out"
                  title={`Magang / Intern: ${statusIntern} (${internPct}%)`}
                />
              </div>

              {/* Legend with Color Dots */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Tetap (PKWTT) <strong className="text-slate-900 dark:text-white font-bold">{permPct}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Kontrak (PKWT) <strong className="text-slate-900 dark:text-white font-bold">{contPct}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Probation <strong className="text-slate-900 dark:text-white font-bold">{probPct}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Magang <strong className="text-slate-900 dark:text-white font-bold">{internPct}%</strong>
                  </span>
                </div>
              </div>
            </div>

            <section aria-label="Presensi berdasarkan jadwal" className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">Presensi {snapshotDate === today ? 'hari ini' : snapshotDate}</h4>
                <span className="text-slate-600 dark:text-zinc-400">{loading ? 'Memuat jadwal...' : attendanceContext.error ? 'Data jadwal belum tersedia' : `${checkedInCount} check-in / ${attendanceSnapshot.required} wajib hadir`}</span>
              </div>
              {attendanceContext.error ? (
                <p role="alert" className="mt-4 text-sm text-amber-800 dark:text-amber-300">{attendanceContext.error}</p>
              ) : (
                <>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800" aria-hidden="true">
                    {[
                      { employees: attendanceSnapshot.onTime, color: 'bg-emerald-500' },
                      { employees: attendanceSnapshot.late, color: 'bg-amber-500' },
                      { employees: attendanceSnapshot.pending, color: 'bg-slate-400' },
                      { employees: attendanceSnapshot.upcoming, color: 'bg-blue-400' },
                    ].map((group, index) => <span key={index} className={group.color} style={{ width: `${attendanceSnapshot.required > 0 ? group.employees.length / attendanceSnapshot.required * 100 : 0}%` }} />)}
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {[
                      { label: 'Tepat waktu', employees: attendanceSnapshot.onTime },
                      { label: 'Terlambat', employees: attendanceSnapshot.late },
                      { label: 'Belum check-in', employees: attendanceSnapshot.pending },
                      { label: 'Masih dalam waktu masuk', employees: attendanceSnapshot.upcoming },
                      { label: 'Cuti / izin / sakit', employees: attendanceSnapshot.leave },
                      { label: 'Tidak dijadwalkan', employees: attendanceSnapshot.offDuty },
                      { label: 'Jadwal belum lengkap', employees: attendanceSnapshot.unknown },
                    ].map(group => (
                      <button
                        key={group.label} type="button" aria-haspopup="dialog"
                        aria-label={`Lihat presensi ${group.label.toLowerCase()}: ${group.employees.length} orang`}
                        onClick={() => openDrilldown(group.label, 'Presensi', group.employees, { subtitle: `Tanggal ${snapshotDate}, berdasarkan jadwal, kalender kerja, dan cuti yang disetujui` })}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-left text-xs text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 cursor-pointer"
                      >
                        <span>{group.label}</span><strong className="text-slate-900 dark:text-white tabular-nums">{group.employees.length}</strong>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">
                    Wajib hadir tidak termasuk cuti yang disetujui dan hari libur. Belum check-in berarti waktu masuk telah lewat, bukan penetapan mangkir.
                    {!attendanceContext.settings?.work_days && ' Hari kerja mengikuti Senin–Jumat jika belum dikonfigurasi.'}
                  </p>
                </>
              )}
            </section>
          </div>
        </div>

        {/* Right (5 Cols): Top Open Deals -> Top Entitas Perusahaan */}
        <div className="xl:col-span-5 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Title, Badge, and More */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Top Entitas Perusahaan
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-400 mt-0.5">
                  Distribusi penempatan karyawan per badan hukum
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 px-2.5 py-0.5">
                  {topCompanies.length} dari {companySummaryRows.filter(company => company.employees > 0).length} perusahaan
                </span>
              </div>
            </div>

            {/* List of 5 Company Items with Colorized Gesit Logos */}
            <div className="space-y-2.5 mt-5">
              {topCompanies.map((comp) => {
                return (
                  <div
                    key={comp.company}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat perusahaan ${comp.company}: ${comp.employees} orang`}
                    aria-haspopup="dialog"
                    onClick={() => openDrilldown(comp.company, 'Perusahaan', comp.employeeList)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openDrilldown(comp.company, 'Perusahaan', comp.employeeList);
                      }
                    }}
                    className="group rounded-xl border border-slate-100 dark:border-zinc-800/60 bg-white dark:bg-[#181d2c] p-3 sm:p-3.5 hover:border-slate-200 dark:hover:border-zinc-700 hover:bg-slate-50/60 dark:hover:bg-[#1e2538] transition-all cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
                  >
                    {/* Left: Clean Frameless Colorized Gesit Logo & Details */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`size-7 shrink-0 ${comp.color.logoColor} group-hover:scale-110 transition-transform`}
                        style={{
                          maskImage: 'url(/image/logo.png)',
                          WebkitMaskImage: 'url(/image/logo.png)',
                          maskSize: 'contain',
                          WebkitMaskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          WebkitMaskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          backgroundColor: 'currentColor'
                        }}
                      />

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {comp.company}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-600 dark:text-zinc-400">
                            {new Set(comp.employeeList.map(employee => employee.department || employee.department_name).filter(Boolean)).size} departemen tercatat
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Value & Progress Bar */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {comp.employees} <span className="text-[11px] font-normal text-slate-600 dark:text-zinc-400">orang</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            style={{ width: `${comp.percentage}%` }}
                            className={`h-full rounded-full ${comp.color.bar}`}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-600 dark:text-zinc-400 min-w-6 text-right">
                          {comp.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {topCompanies.length === 0 && <p className="mt-4 text-sm text-slate-600 dark:text-zinc-400">Belum ada penempatan karyawan sesuai filter.</p>}
            <p className="mt-3 text-[11px] text-slate-600 dark:text-zinc-400">Persentase dari seluruh karyawan aktif sesuai filter.</p>
          </div>
          <a href="#ringkasan-perusahaan" className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 dark:border-zinc-700 px-3 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-blue-600">
            Lihat semua perusahaan
          </a>
        </div>
      </div>

      {/* ── ROW 2: OPERATIONAL CENTER (3 COLUMNS: ABSENSI, CUTI, ACTION CENTER) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Absensi & Kehadiran */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Absensi & kehadiran</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400 mt-0.5">
                  Snapshot: {snapshotDate} · Log Presensi
                </p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Detail</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-zinc-400 block mb-1">Tingkat kehadiran</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {attendanceRate}
                  </span>
                  <span className="text-sm font-bold text-slate-500 dark:text-zinc-400">%</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                  {attendanceContext.error ? 'Jadwal kerja belum tersedia' : `${checkedInCount} check-in dari ${attendanceSnapshot.required} wajib hadir`}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">Masih dalam waktu masuk</span>
                <span className="text-lg font-bold text-slate-800 dark:text-zinc-200">
                  {attendanceContext.error ? '-' : attendanceSnapshot.upcoming.length} orang
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-0.5">
                  Berdasarkan batas masuk shift
                </span>
              </div>
            </div>

            {/* Stacked Progress Bar with smooth entry animation */}
            <div className="w-full h-3 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 mt-6 p-0.5">
              <div
                style={{ width: `${chartsReady && !attendanceContext.error && attendanceSnapshot.required > 0 ? (onTimeCount / attendanceSnapshot.required) * 100 : 0}%` }}
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-l-full transition-all duration-1000 ease-out"
                title={`Tepat waktu (${onTimeCount})`}
              />
              <div
                style={{ width: `${chartsReady && !attendanceContext.error && attendanceSnapshot.required > 0 ? (lateCount / attendanceSnapshot.required) * 100 : 0}%` }}
                className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-1000 ease-out"
                title={`Terlambat (${lateCount})`}
              />
              <div
                style={{ width: `${chartsReady && !attendanceContext.error && attendanceSnapshot.required > 0 ? (attendanceSnapshot.upcoming.length / attendanceSnapshot.required) * 100 : 0}%` }}
                className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-1000 ease-out"
                title={`Masih dalam waktu masuk (${attendanceSnapshot.upcoming.length})`}
              />
              <div
                style={{ width: `${chartsReady && !attendanceContext.error && attendanceSnapshot.required > 0 ? (notCheckedInCount / attendanceSnapshot.required) * 100 : 0}%` }}
                className="h-full bg-slate-300 dark:bg-slate-700 rounded-r-full transition-all duration-1000 ease-out"
                title={`Belum check-in (${notCheckedInCount})`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2.5 mt-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-zinc-400">Tepat waktu</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{onTimeCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                <span className="text-slate-500 dark:text-zinc-400">Terlambat</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{lateCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span className="text-slate-500 dark:text-zinc-400">Cuti / Izin</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{leaveCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                <span className="text-slate-500 dark:text-zinc-400">Belum check-in</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{notCheckedInCount}</strong>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-600 dark:text-zinc-400">{attendanceContext.error || 'Persentase dari karyawan wajib hadir, tidak termasuk cuti dan hari libur.'}</p>
          </div>
        </div>

        {/* 2. Cuti & Izin */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cuti & izin</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400 mt-0.5">
                  Pengajuan tercatat di sistem
                </p>
              </div>
              <button
                onClick={() => navigate('/requests')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Kelola</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-zinc-400 block mb-1">Pengajuan masuk</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {totalLeaveRequests}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">pengajuan</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 dark:text-zinc-400 block mb-1">Cuti / izin hari ini</span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{leaveCount}</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">orang</span>
                </div>
              </div>
            </div>

            {/* 3 Status Cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-6">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40 text-center">
                <span className="text-xl font-black text-emerald-800 dark:text-emerald-300 block">
                  {approvedLeaves}
                </span>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  Disetujui
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800/40 text-center">
                <span className="text-xl font-black text-amber-800 dark:text-amber-300 block">
                  {pendingLeaves}
                </span>
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mt-0.5 block">
                  Menunggu
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 text-center">
                <span className="text-xl font-black text-rose-800 dark:text-rose-300 block">
                  {rejectedLeaves}
                </span>
                <span className="text-[10px] font-medium text-rose-700 dark:text-rose-400 mt-0.5 block">
                  Ditolak
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              <span>Sinkronisasi otomatis dari permohonan aktif</span>
            </div>
          </div>
        </div>

        {/* 3. Perlu Perhatian HR (Action Center) */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perlu perhatian HR</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Tindak lanjut & peringatan dini</p>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md uppercase border border-amber-200/50 dark:border-amber-900/40">
                Action Center
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {/* Row 1: Kontrak PKWT Berakhir */}
              <div
                onClick={() => openDrilldown('Kontrak PKWT Berakhir ≤30 Hari', 'Tinjau Kontrak PKWT', expiringContracts)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#181d2c] transition-colors cursor-pointer border border-slate-100 dark:border-zinc-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kontrak PKWT berakhir ≤30 hari</h4>
                  <p className={`text-[10px] ${overdueDecisions.contracts.length > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-400'}`}>
                    {overdueDecisions.contracts.length > 0
                      ? `${overdueDecisions.contracts.length} sudah lewat tanggal berakhir`
                      : 'Tinjau perpanjangan PKWT'}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-black ${overdueDecisions.contracts.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  <span className={`px-2 py-0.5 rounded-lg ${overdueDecisions.contracts.length > 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>{expiringContracts.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                </div>
              </div>

              {/* Row 2: Usia >= 55 Tahun */}
              <div
                onClick={() => openDrilldown('Usia ≥55 Tahun', 'Monitoring Masa Pensiun', seniorEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#181d2c] transition-colors cursor-pointer border border-slate-100 dark:border-zinc-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Usia ≥55 tahun</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400">Pemantauan persiapan pensiun</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-zinc-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg">{seniorEmployees.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                </div>
              </div>

              {/* Row 3: Masa Probation Berakhir */}
              <div
                onClick={() => openDrilldown('Probation Berakhir ≤30 Hari', 'Evaluasi Masa Percobaan', expiringProbations.length > 0 ? expiringProbations : probationEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#181d2c] transition-colors cursor-pointer border border-slate-100 dark:border-zinc-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Probation berakhir ≤30 hari</h4>
                  <p className={`text-[10px] ${overdueDecisions.probations.length > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-zinc-400'}`}>
                    {overdueDecisions.probations.length > 0
                      ? `${overdueDecisions.probations.length} sudah lewat tanggal berakhir`
                      : expiringProbations.length > 0
                        ? `${expiringProbations.length} dari ${probationEmployees.length} probation perlu keputusan`
                        : 'Evaluasi masa percobaan'}
                  </p>
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-black ${overdueDecisions.probations.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  <span className={`px-2 py-0.5 rounded-lg ${overdueDecisions.probations.length > 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-amber-50 dark:bg-amber-950/40'}`}>{expiringProbations.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                </div>
              </div>

              {/* Row 4: Data Pendidikan Belum Lengkap */}
              <div
                onClick={() => openDrilldown('Data Pendidikan Belum Lengkap', 'Kelengkapan Profil', incompleteEducationEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#181d2c] transition-colors cursor-pointer border border-slate-100 dark:border-zinc-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Data profil belum lengkap</h4>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-400">Lengkapi data SDM</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-zinc-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-lg">{incompleteEducationEmployees.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: PROFIL DEMOGRAFI KARYAWAN (3 KOLOM SEIMBANG) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Distribusi Usia */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distribusi usia</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Profil usia karyawan aktif</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-1 mt-4">
              {ageDistribution.map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan usia ${item.label}: ${item.count} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Usia', item.employees)}
                  className="block w-full min-h-11 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </span>
                  <span className="block w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <span
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`block h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${
                        item.isHighlight ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>

        {/* 2. Pendidikan Terakhir */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pendidikan terakhir</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Jenjang pendidikan tercatat</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-1 mt-4">
              {educationDistribution.map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan pendidikan ${item.label}: ${item.count} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Pendidikan terakhir', item.employees)}
                  className="block w-full min-h-11 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </span>
                  <span className="block w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <span
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`block h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${
                        item.isHighlight ? 'bg-amber-500 dark:bg-amber-400' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>

        {/* 3. Masa Kerja */}
        <div className="bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Masa kerja</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Durasi sejak tanggal bergabung</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-1 mt-4">
              {tenureDistribution.map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan masa kerja ${item.label}: ${item.count} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Masa kerja', item.employees)}
                  className="block w-full min-h-11 rounded-lg px-2 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </span>
                  <span className="block w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <span
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`block h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${
                        item.isHighlight ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>
      </div>

      {/* ── ROW 4: STRUKTUR ORGANISASI & KOMPOSISI SDM (4 KOLOM: 2 COL DEPARTEMEN + 1 COL STATUS + 1 COL GENDER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 1. Sebaran Departemen (Mengambil 2 Kolom dengan sub-grid 2 kolom sehingga padat dan seimbang) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sebaran departemen</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Distribusi karyawan pada tiap unit fungsi</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                {totalHeadcount} orang · {departmentDistribution.length} divisi
              </span>
            </div>

            {/* Sub-grid 2 kolom untuk departemen agar ringkas dan seimbang dengan tinggi donut chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3">
              {departmentDistribution.map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan departemen ${item.label}: ${item.count} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Departemen', item.employees)}
                  className="min-w-0 min-h-11 px-2 py-2 rounded-lg flex flex-col justify-center text-left hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex justify-between text-xs font-medium mb-1 w-full">
                    <span className="text-slate-600 dark:text-zinc-300 truncate pr-1" title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold shrink-0">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </span>
                  <span className="block w-full h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <span
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`block h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none ${
                        item.isHighlight ? 'bg-slate-900 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </span>
                </button>
              ))}
            </div>
            {departmentDistribution.length === 0 && (
              <p className="py-4 text-xs text-slate-600 dark:text-zinc-400">Belum ada karyawan sesuai filter terpilih.</p>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>

        {/* 2. Status Kepegawaian (1 Kolom: Donut Chart Centered & Legend Proporsional) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status kepegawaian</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Hubungan kerja</p>
              </div>
            </div>

            {/* Donut SVG Centered */}
            <div className="flex justify-center my-2">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-zinc-800" strokeWidth="14" />
                  {/* Permanent */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#103065] dark:text-blue-500 transition-all duration-1000 ease-out"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - statusPermanent / totalHeadcount) : 238.76}
                  />
                  {/* Contract */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#2563eb] dark:text-sky-400 transition-all duration-1000 ease-out"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - statusContract / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? (statusPermanent / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                  {/* Probation */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#d97706] dark:text-amber-400 transition-all duration-1000 ease-out"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - statusProbation / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? ((statusPermanent + statusContract) / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-slate-400 dark:text-slate-500 transition-all duration-1000 ease-out motion-reduce:transition-none"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - statusIntern / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? ((statusPermanent + statusContract + statusProbation) / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white block leading-none">
                    {totalHeadcount}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-zinc-500 block mt-0.5">Aktif</span>
                </div>
              </div>
            </div>

            {/* Legend Stacked */}
            <div className="space-y-1.5 text-xs mt-3">
              {[
                { label: 'PKWTT', color: 'bg-[#103065] dark:bg-blue-500' },
                { label: 'PKWT', color: 'bg-[#2563eb] dark:bg-sky-400' },
                { label: 'Probation', color: 'bg-[#d97706] dark:bg-amber-400' },
                { label: 'Magang', color: 'bg-slate-400 dark:bg-slate-500' },
              ].filter(item => item.label !== 'Magang' || statusIntern > 0).map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan status ${item.label}: ${statusEmployees[item.label].length} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Status kepegawaian', statusEmployees[item.label])}
                  className="flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-2 text-left border-b border-slate-50 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <strong className="font-bold text-slate-900 dark:text-white">{statusEmployees[item.label].length}</strong>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      ({totalHeadcount > 0 ? ((statusEmployees[item.label].length / totalHeadcount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>

        {/* 3. Komposisi Gender (1 Kolom: Donut Chart Centered & Legend Proporsional) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Komposisi gender</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-400">Gender database</p>
              </div>
            </div>

            {/* Donut SVG Centered */}
            <div className="flex justify-center my-2">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-zinc-800" strokeWidth="14" />
                  {/* Laki-laki */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#103065] dark:text-blue-500 transition-all duration-1000 ease-out"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - maleCount / totalHeadcount) : 238.76}
                  />
                  {/* Perempuan */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#0284C7] dark:text-sky-400 transition-all duration-1000 ease-out"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={chartsReady && totalHeadcount > 0 ? 238.76 * (1 - femaleCount / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? (maleCount / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white block leading-none">
                    {totalHeadcount}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-zinc-500 block mt-0.5">Aktif</span>
                </div>
              </div>
            </div>

            {/* Legend Stacked */}
            <div className="space-y-1.5 text-xs mt-3">
              {[
                { label: 'Laki-laki', color: 'bg-[#103065] dark:bg-blue-500' },
                { label: 'Perempuan', color: 'bg-[#0284C7] dark:bg-sky-400' },
                { label: 'Belum diisi', color: 'bg-slate-400 dark:bg-slate-600' },
              ].filter(item => item.label !== 'Belum diisi' || genderEmployees[item.label].length > 0).map(item => (
                <button
                  key={item.label}
                  type="button"
                  aria-label={`Lihat karyawan gender ${item.label}: ${genderEmployees[item.label].length} orang`}
                  aria-haspopup="dialog"
                  onClick={() => openDrilldown(item.label, 'Gender', genderEmployees[item.label])}
                  className="flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-2 py-2 text-left border-b border-slate-50 dark:border-zinc-800/60 hover:bg-slate-50 dark:hover:bg-[#181d2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${item.color}`} />
                    <span className="text-slate-600 dark:text-zinc-300">{item.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <strong className="font-bold text-slate-900 dark:text-white">{genderEmployees[item.label].length}</strong>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      ({totalHeadcount > 0 ? ((genderEmployees[item.label].length / totalHeadcount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-5 pt-3 border-t border-slate-100 dark:border-zinc-800">
            Klik kelompok untuk melihat karyawan
          </p>
        </div>
      </div>

      {/* ── ROW 5: RINGKASAN PER PERUSAHAAN (TABLE) ── */}
      <div id="ringkasan-perusahaan" className="scroll-mt-4 bg-white dark:bg-[#131622] border border-slate-200/80 dark:border-zinc-800/80 rounded-[18px] p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan per perusahaan</h3>
            <p className="text-[11px] text-slate-400 dark:text-zinc-400 mt-0.5">Karyawan aktif, demografi, dan status kerja dari database</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
            {snapshotDate}
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
                <th className="py-3 px-3">PERUSAHAAN</th>
                <th className="py-3 px-3">KARYAWAN</th>
                <th className="py-3 px-3">RATA-RATA USIA</th>
                <th className="py-3 px-3">MASA KERJA</th>
                <th className="py-3 px-3">TETAP / KONTRAK / PROBATION</th>
                <th className="py-3 px-3 text-right">KONTRAK ≤30 HARI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
              {companySummaryRows.map(row => (
                <tr key={row.company} className="hover:bg-slate-50/80 dark:hover:bg-[#181d2c]/60 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                    {row.company}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-zinc-200">
                    {row.employees}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-zinc-400">
                    {row.avgAge}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-zinc-400">
                    {row.tenure}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-zinc-400">
                    {row.breakdown}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => openDrilldown(row.company, 'Perusahaan', row.employeeList)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 cursor-pointer"
                    >
                      <span>{row.expiringContract}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DRILLDOWN EMPLOYEES MODAL (WITH SEARCH & HIGH-CONTRAST DARK/LIGHT THEME) ── */}
      <Dialog open={drilldownModal.open} onOpenChange={open => setDrilldownModal(prev => ({ ...prev, open }))}>
          <DialogContent
            showCloseButton={false}
            finalFocus={drilldownTriggerRef}
            className="sm:max-w-xl bg-white dark:bg-[#131622] border-slate-200 dark:border-zinc-800 flex flex-col max-h-[85dvh]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#181d2c]/70">
              <div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-white">{drilldownModal.title}</DialogTitle>
                <DialogDescription className="text-[11px] text-slate-600 dark:text-zinc-400">{drilldownModal.subtitle}</DialogDescription>
              </div>
              <button
                type="button"
                aria-label="Tutup daftar karyawan"
                onClick={() => setDrilldownModal(prev => ({ ...prev, open: false }))}
                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Internal Search Bar */}
            <div className="px-4 pt-3 pb-1 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-[#131622]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  aria-label="Cari karyawan dalam kelompok"
                  placeholder="Cari nama karyawan, NIK, jabatan, atau perusahaan..."
                  value={drilldownSearch}
                  onChange={e => setDrilldownSearch(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#181d2c] pl-9 pr-3.5 py-1.5 text-xs text-slate-800 dark:text-zinc-200 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400"
                />
              </div>
            </div>

            <div className="min-h-0 p-4 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-zinc-800/60">
              {modalEmployeesFiltered.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-600 dark:text-zinc-400">
                  {drilldownModal.employees.length === 0
                    ? 'Belum ada karyawan dalam kelompok ini.'
                    : 'Tidak ada karyawan yang sesuai kriteria pencarian ini.'}
                </div>
              ) : (
                modalEmployeesFiltered.map((emp: any) => (
                  <div key={emp.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar name={emp.full_name || 'Karyawan'} url={emp.avatar_url} size="sm" />
                      <div className="min-w-0 break-words">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {emp.full_name || emp.name}
                        </h4>
                        <p className="text-[10px] text-slate-600 dark:text-zinc-400">
                          {emp.employee_code || emp.nik || 'EMP'} · {emp.job_title || emp.position || 'Staff'} ·{' '}
                          {emp.company || emp.company_name || 'Perusahaan belum tercatat'} ({emp.department || emp.department_name || 'Departemen belum tercatat'})
                        </p>
                        {drilldownModal.dateField && (
                          <p className="mt-1 text-[11px] text-slate-700 dark:text-zinc-300">
                            {{ date_of_birth: 'Tanggal lahir', join_date: 'Tanggal masuk', separation_date: 'Tanggal keluar', contract_end_date: 'Kontrak berakhir' }[drilldownModal.dateField]}:{' '}
                            {new Date(emp[drilldownModal.dateField]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {drilldownModal.dateField === 'date_of_birth' && ` (${calculateAge(emp.date_of_birth)} tahun)`}
                            {drilldownModal.dateField === 'join_date' && ` (${calculateTenureYears(emp.join_date)?.toLocaleString('id-ID')} tahun)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDrilldownModal(prev => ({ ...prev, open: false }));
                        navigate('/employees');
                      }}
                      className="min-h-11 min-w-11 text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 shrink-0 cursor-pointer"
                    >
                      Profil →
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 shrink-0 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#181d2c]/50 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-600 dark:text-zinc-400" aria-live="polite">
                Menampilkan {modalEmployeesFiltered.length} dari {drilldownModal.employees.length} karyawan
              </span>
              <button
                onClick={() => setDrilldownModal(prev => ({ ...prev, open: false }))}
                className="min-h-11 px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-blue-600 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
