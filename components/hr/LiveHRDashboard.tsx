import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  BarChart2,
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
  Sparkles,
  Activity,
  MoreHorizontal,
  Target,
  Layers,
  ShieldCheck
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { isActiveEmployee, isHRAccount, jakartaDate, resolveApprovalStatus } from '../../lib/workforce-contract';
import { UserAvatar } from '../UserAvatar';

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

function isContractExpiringWithin30Days(contractEndDateStr?: string | null): boolean {
  if (!contractEndDateStr) return false;
  const end = new Date(contractEndDateStr);
  if (isNaN(end.getTime())) return false;
  const today = new Date();
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 30;
}

export default function LiveHRDashboard({ currentUser, onMetricsUpdate }: LiveHRDashboardProps) {
  const navigate = useNavigate();

  // Filters State
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [snapshotDate, setSnapshotDate] = useState<string>(() => jakartaDate());

  // Real Database State
  const [accounts, setAccounts] = useState<any[]>([]);
  const [companiesList, setCompaniesList] = useState<any[]>([]);
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Drilldown Modal State with Search
  const [drilldownModal, setDrilldownModal] = useState<{
    open: boolean;
    title: string;
    subtitle?: string;
    employees: any[];
  }>({
    open: false,
    title: '',
    subtitle: '',
    employees: [],
  });
  const [drilldownSearch, setDrilldownSearch] = useState<string>('');
  const [chartsReady, setChartsReady] = useState<boolean>(false);

  useEffect(() => {
    setChartsReady(false);
    const timer = setTimeout(() => setChartsReady(true), 150);
    return () => clearTimeout(timer);
  }, [loading, selectedCompany, selectedDepartment]);

  const today = jakartaDate();
  const isHR = isHRAccount(currentUser);

  // Load Real Data from Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const monthPrefix = snapshotDate.slice(0, 7);
      const [users, companies, depts, attendance, leaves, overtime, reimb, corrections] = await Promise.all([
        (async () => { try { return await loadWorkforceAccounts(); } catch { return []; } })(),
        (async () => { try { const r = await supabase.from('companies').select('*').order('name'); return r.data || []; } catch { return []; } })(),
        (async () => { try { const r = await supabase.from('departments').select('*').order('name'); return r.data || []; } catch { return []; } })(),
        (async () => { try { return await fetchAllRows((from, to) => supabase.from('attendance_records').select('*').gte('date', `${monthPrefix}-01`).order('id').range(from, to)); } catch { return []; } })(),
        (async () => { try { return await fetchAllRows((from, to) => supabase.from('leave_requests').select('*').order('id').range(from, to)); } catch { return []; } })(),
        (async () => { try { return await fetchAllRows((from, to) => supabase.from('overtime_requests').select('*').order('id').range(from, to)); } catch { return []; } })(),
        (async () => { try { return await fetchAllRows((from, to) => supabase.from('reimbursements').select('*').order('id').range(from, to)); } catch { return []; } })(),
        (async () => { try { return await fetchAllRows((from, to) => supabase.from('attendance_correction_requests').select('*').order('id').range(from, to)); } catch { return []; } })(),
      ]);

      setAccounts(users || []);
      setCompaniesList(companies || []);
      setDepartmentsList(depts || []);
      setRecords((attendance || []).map(normalizeAttendance));

      const tagged = (rows: any[], type: string) => rows.map(r => ({ ...r, type }));
      setRequests([
        ...tagged(leaves || [], 'leave'),
        ...tagged(overtime || [], 'overtime'),
        ...tagged(reimb || [], 'reimbursement'),
        ...tagged(corrections || [], 'correction'),
      ]);
    } catch (err) {
      console.warn('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [snapshotDate]);

  useEffect(() => {
    loadData();
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

  // Filtered Real Employees
  const filteredEmployees = useMemo(() => {
    return accounts.filter(a => {
      const statusLower = String(a.status || a.employment_status || 'active').toLowerCase();
      if (['inactive', 'suspended', 'terminated', 'resigned'].includes(statusLower)) return false;

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

  const totalHeadcount = filteredEmployees.length;

  // New Hires this month
  const currentMonthStr = snapshotDate.slice(0, 7);
  const newHiresList = useMemo(() => {
    return filteredEmployees.filter(a => a.join_date && String(a.join_date).startsWith(currentMonthStr));
  }, [filteredEmployees, currentMonthStr]);
  const newHires = newHiresList.length;

  // Resignations this month
  const resignationsList = useMemo(() => {
    return accounts.filter(a => {
      const sep = a.separation_date;
      if (!sep || !String(sep).startsWith(currentMonthStr)) return false;
      if (selectedCompany !== 'all' && (a.company || a.company_name) !== selectedCompany) return false;
      if (selectedDepartment !== 'all' && (a.department || a.department_name) !== selectedDepartment) return false;
      return true;
    });
  }, [accounts, currentMonthStr, selectedCompany, selectedDepartment]);
  const resignations = resignationsList.length;

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

  const onTimeCount = useMemo(() => {
    return todayAttendance.filter(r => ['present', 'tepat_waktu'].includes(String(r.status).toLowerCase())).length;
  }, [todayAttendance]);

  const lateCount = useMemo(() => {
    return todayAttendance.filter(r => ['late', 'terlambat'].includes(String(r.status).toLowerCase())).length;
  }, [todayAttendance]);

  const leaveCount = useMemo(() => {
    return todayAttendance.filter(r => ['leave', 'cuti', 'izin', 'sick', 'sakit'].includes(String(r.status).toLowerCase())).length;
  }, [todayAttendance]);

  const checkedInCount = onTimeCount + lateCount;
  const notCheckedInCount = Math.max(0, totalHeadcount - checkedInCount - leaveCount);
  const attendanceRate = useMemo(() => {
    if (totalHeadcount === 0) return '0,0';
    return ((checkedInCount / totalHeadcount) * 100).toFixed(1).replace('.', ',');
  }, [checkedInCount, totalHeadcount]);

  // Real Leave Requests
  const filteredLeaves = useMemo(() => {
    return requests.filter(r => r.type === 'leave' && (filteredEmployeeIds.has(String(r.user_id)) || filteredEmployees.length === accounts.length));
  }, [requests, filteredEmployeeIds, filteredEmployees.length, accounts.length]);

  const totalLeaveRequests = filteredLeaves.length;
  const approvedLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r) === 'approved').length;
  const pendingLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r) === 'pending').length;
  const rejectedLeaves = filteredLeaves.filter(r => resolveApprovalStatus(r) === 'rejected').length;

  const totalPendingRequestsCount = useMemo(() => {
    return requests.filter(r => resolveApprovalStatus(r) === 'pending').length;
  }, [requests]);

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
      .filter(r => resolveApprovalStatus(r) === 'pending')
      .map(r => {
        const emp = accounts.find(a => String(a.id) === String(r.user_id));
        const typeLabel =
          r.type === 'leave'
            ? `Cuti: ${r.leave_type || 'Tahunan'}`
            : r.type === 'overtime'
            ? `Lembur: ${r.duration_hours || 2} Jam`
            : r.type === 'reimbursement'
            ? `Klaim: Rp ${(r.amount || 0).toLocaleString('id-ID')}`
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
  const ageDistribution: DemographicGroup[] = useMemo(() => {
    const groups = [
      { label: '<25 tahun', count: 0, min: 0, max: 24 },
      { label: '25–34 tahun', count: 0, min: 25, max: 34 },
      { label: '35–44 tahun', count: 0, min: 35, max: 44 },
      { label: '45–54 tahun', count: 0, min: 45, max: 54 },
      { label: '≥55 tahun', count: 0, min: 55, max: 150 },
      { label: 'Belum tercatat', count: 0, min: -1, max: -1 },
    ];

    filteredEmployees.forEach(emp => {
      const a = calculateAge(emp.date_of_birth);
      if (a === null) {
        groups[5].count++;
      } else {
        const found = groups.slice(0, 5).find(g => a >= g.min && a <= g.max);
        if (found) {
          found.count++;
        }
      }
    });

    const maxCount = Math.max(...groups.map(g => g.count), 1);
    return groups.map(g => ({
      label: g.label,
      count: g.count,
      percentage: totalHeadcount > 0 ? Number(((g.count / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: g.count === maxCount && g.count > 0,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Education Distribution
  const educationDistribution: DemographicGroup[] = useMemo(() => {
    const buckets: Record<string, number> = {
      'SMA / SMK': 0,
      'Diploma': 0,
      'S1': 0,
      'S2': 0,
      'S3': 0,
      'Belum tercatat': 0,
    };

    filteredEmployees.forEach(emp => {
      const ed = String(emp.last_education || '').toLowerCase().trim();
      if (!ed) {
        buckets['Belum tercatat']++;
      } else if (ed.includes('s1') || ed.includes('sarjana') || ed.includes('bachelor')) {
        buckets['S1']++;
      } else if (ed.includes('s2') || ed.includes('magister') || ed.includes('master')) {
        buckets['S2']++;
      } else if (ed.includes('s3') || ed.includes('doktor')) {
        buckets['S3']++;
      } else if (ed.includes('d1') || ed.includes('d2') || ed.includes('d3') || ed.includes('d4') || ed.includes('diploma')) {
        buckets['Diploma']++;
      } else if (ed.includes('sma') || ed.includes('smk') || ed.includes('slta')) {
        buckets['SMA / SMK']++;
      } else {
        buckets['S1']++;
      }
    });

    const maxCount = Math.max(...Object.values(buckets), 1);
    return Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      percentage: totalHeadcount > 0 ? Number(((count / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: count === maxCount && count > 0,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Tenure Distribution
  const tenureDistribution: DemographicGroup[] = useMemo(() => {
    const buckets: Record<string, number> = {
      '<1 tahun': 0,
      '1–3 tahun': 0,
      '3–5 tahun': 0,
      '5–10 tahun': 0,
      '≥10 tahun': 0,
    };

    filteredEmployees.forEach(emp => {
      const t = calculateTenureYears(emp.join_date);
      if (t === null || t < 1) buckets['<1 tahun']++;
      else if (t < 3) buckets['1–3 tahun']++;
      else if (t < 5) buckets['3–5 tahun']++;
      else if (t < 10) buckets['5–10 tahun']++;
      else buckets['≥10 tahun']++;
    });

    const maxCount = Math.max(...Object.values(buckets), 1);
    return Object.entries(buckets).map(([label, count]) => ({
      label,
      count,
      percentage: totalHeadcount > 0 ? Number(((count / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: count === maxCount && count > 0,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Status Kepegawaian (Donut)
  const { statusPermanent, statusContract, statusProbation, statusIntern } = useMemo(() => {
    let perm = 0;
    let cont = 0;
    let prob = 0;
    let intern = 0;

    filteredEmployees.forEach(emp => {
      const type = `${emp.contract_type || ''} ${emp.employment_type || ''}`.toLowerCase();
      if (type.includes('probation') || type.includes('percobaan')) prob++;
      else if (type.includes('magang') || type.includes('intern')) intern++;
      else if (type.includes('pkwtt') || type.includes('tetap') || type.includes('permanent')) perm++;
      else if (type.includes('pkwt') || type.includes('kontrak') || type.includes('contract')) cont++;
      else perm++;
    });

    return { statusPermanent: perm, statusContract: cont, statusProbation: prob, statusIntern: intern };
  }, [filteredEmployees]);

  // Department Distribution
  const departmentDistribution: DemographicGroup[] = useMemo(() => {
    const map = new Map<string, number>();
    filteredEmployees.forEach(emp => {
      const d = (emp.department || emp.department_name || 'Lainnya').trim();
      map.set(d, (map.get(d) || 0) + 1);
    });

    if (map.size === 0) {
      map.set('General', 0);
    }

    const arr = Array.from(map.entries()).map(([label, count]) => ({ label, count }));
    const maxCount = Math.max(...arr.map(x => x.count), 1);

    return arr.map(item => ({
      label: item.label,
      count: item.count,
      percentage: totalHeadcount > 0 ? Number(((item.count / totalHeadcount) * 100).toFixed(1)) : 0,
      isHighlight: item.count === maxCount && item.count > 0,
    }));
  }, [filteredEmployees, totalHeadcount]);

  // Gender Composition
  const { maleCount, femaleCount, unspecifiedGenderCount } = useMemo(() => {
    let m = 0;
    let f = 0;
    let un = 0;

    filteredEmployees.forEach(emp => {
      const g = String(emp.gender || '').toLowerCase();
      if (g.includes('laki') || g.includes('male') || g.includes('pria')) m++;
      else if (g.includes('perempuan') || g.includes('female') || g.includes('wanita')) f++;
      else un++;
    });

    return { maleCount: m, femaleCount: f, unspecifiedGenderCount: un };
  }, [filteredEmployees]);

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

  // HR Action Center Items
  const expiringContracts = useMemo(() => {
    return filteredEmployees.filter(emp => isContractExpiringWithin30Days(emp.contract_end_date));
  }, [filteredEmployees]);

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

          if (isContractExpiringWithin30Days(e.contract_end_date)) exp++;
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

  const retentionRate = useMemo(() => {
    if (totalHeadcount === 0) return '100.0';
    const num = Number(String(turnoverRate || '0').replace(',', '.'));
    return (100 - num).toFixed(1);
  }, [totalHeadcount, turnoverRate]);

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
  const openDrilldown = (groupName: string, category: string, employeeList?: any[]) => {
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
      subtitle: `Daftar karyawan aktif (${list.length} orang) berdasarkan filter terpilih`,
      employees: list,
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

  // Export KPI Report
  const handleExportKPI = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Indikator,Nilai,Keterangan\n' +
      `Karyawan Aktif,${totalHeadcount},Orang\n` +
      `Karyawan Baru Masuk,+${newHires},Bulan Berjalan\n` +
      `Karyawan Keluar,${resignations},Bulan Berjalan\n` +
      `Rata-Rata Usia,${avgAge} tahun,${ageRangeStr}\n` +
      `Rata-Rata Masa Kerja,${avgTenure} tahun,${overFiveYearsEmployees.length} karyawan > 5 tahun\n` +
      `Turnover Rate,${turnoverRate}%,Bulan berjalan\n` +
      `Tingkat Kehadiran,${attendanceRate}%,${checkedInCount} check-in\n` +
      `Kontrak Berakhir <=30 Hari,${expiringContracts.length},Perlu evaluasi\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KPI_Human_Capital_${snapshotDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return 'Monday, 19 October 2026';
    }
  }, []);

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ── NEXORA STYLE HERO GREETING BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#131316] p-6 sm:p-7 shadow-xs transition-colors">
        {/* Subtle Ambient Radial Mesh Glow Pattern */}
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-72 w-96 rounded-full opacity-60 dark:opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(20, 184, 166, 0.12) 40%, transparent 70%)'
          }}
        />

        {/* Top Pills and Action Buttons */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 px-3 py-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>AI insights refreshed {loading ? 'memuat...' : 'baru saja'}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-1.5">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportKPI}
                className="h-8.5 rounded-lg gap-1.5 text-xs font-medium border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                <Download className="size-3.5" />
                <span>Export Report</span>
              </Button>
              <Button
                size="sm"
                onClick={() => loadData()}
                disabled={loading}
                className="h-8.5 rounded-lg gap-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-xs cursor-pointer"
              >
                <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </Button>
            </div>
            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500">
              {formattedTodayDate}
            </span>
          </div>
        </div>

        {/* Welcome Headline & Subtitle */}
        <div className="relative z-10 mt-4 sm:mt-5 space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {userGreetingName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-normal max-w-3xl leading-relaxed">
            Here's how your workforce is performing today — headcount is stable at <strong className="font-semibold text-slate-800 dark:text-zinc-200">{totalHeadcount} active employees</strong> with <strong className="font-semibold text-slate-800 dark:text-zinc-200">{attendanceRate}% attendance</strong>, and <strong className="font-semibold text-slate-800 dark:text-zinc-200">{totalPendingRequestsCount} pending requests</strong> needing your attention.
          </p>
        </div>

        {/* Bottom Inline Metrics in Banner */}
        <div className="relative z-10 mt-6 sm:mt-7 pt-5 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-6 sm:gap-10">
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
                  className="size-7 text-[10px] ring-2 ring-white dark:ring-[#131316] shadow-none"
                />
              ))}
              {accounts.length > 3 && (
                <div className="inline-flex size-7 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-600 dark:text-zinc-300 ring-2 ring-white dark:ring-[#131316] shrink-0">
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

      {/* ── FILTER BAR CARD ── */}
      <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-4 sm:p-5 shadow-xs transition-colors">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Perusahaan
            </label>
            <div className="relative">
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/50 hover:bg-white focus:bg-white dark:bg-[#18181b] dark:hover:bg-[#1f1f23] dark:focus:bg-[#1f1f23] px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
              >
                <option value="all">Semua perusahaan</option>
                {companyOptions.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Departemen
            </label>
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/50 hover:bg-white focus:bg-white dark:bg-[#18181b] dark:hover:bg-[#1f1f23] dark:focus:bg-[#1f1f23] px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
              >
                <option value="all">Semua departemen</option>
                {departmentOptions.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Snapshot data
            </label>
            <div className="relative">
              <input
                type="date"
                value={snapshotDate}
                onChange={e => setSnapshotDate(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/50 hover:bg-white focus:bg-white dark:bg-[#18181b] dark:hover:bg-[#1f1f23] dark:focus:bg-[#1f1f23] px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all cursor-pointer"
              />
            </div>
          </div>

          <div className="flex sm:justify-end items-center">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset filter</span>
            </button>
          </div>
        </div>

        {/* Snapshot sub-indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-xs" />
            <span>
              Snapshot {snapshotDate} · <strong className="font-bold text-slate-800 dark:text-slate-200">{totalHeadcount} karyawan aktif</strong>
            </span>
          </div>
          <span className="mt-1 sm:mt-0 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            Sumber Data: Database PostgreSQL Terverifikasi
          </span>
        </div>
      </div>

      {/* ── 4 MAIN TOP KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Karyawan Aktif */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Karyawan aktif</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {totalHeadcount}
                </span>
                <span className="text-xs font-medium text-slate-500">orang</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/40">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 font-bold text-[11px]">
              +{newHires} masuk
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              {resignations} keluar bulan ini
            </span>
          </div>
        </div>

        {/* Card 2: Rata-rata Usia */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata usia</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {avgAge}
                </span>
                <span className="text-xs font-medium text-slate-500">tahun</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
            {ageRangeStr}
          </div>
        </div>

        {/* Card 3: Rata-rata Masa Kerja */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata masa kerja</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {avgTenure}
                </span>
                <span className="text-xs font-medium text-slate-500">tahun</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/40">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
            {overFiveYearsEmployees.length} karyawan bekerja &gt;5 tahun
          </div>
        </div>

        {/* Card 4: Turnover Bulan Berjalan */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Turnover bulan berjalan</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {turnoverRate}
                </span>
                <span className="text-xs font-medium text-slate-500">%</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100/50 dark:border-sky-900/40">
              <BarChart2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] text-slate-500 dark:text-slate-400">
            {resignations} keluar / {totalHeadcount} karyawan aktif
          </div>
        </div>
      </div>

      {/* ── NEXORA ADAPTED ROW: WORKFORCE HEALTH & TOP ENTITAS PERUSAHAAN ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left (7 Cols): Sales Pipeline Health -> Kesehatan & Komposisi SDM */}
        <div className="xl:col-span-7 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Dark Square Icon */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-xs shrink-0">
                <Activity className="size-4.5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Kesehatan & Komposisi SDM
              </h3>
            </div>

            {/* Subheader and Multi-segment Progress Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-bold text-slate-900 dark:text-white">
                  Distribusi Status Kepegawaian
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">
                  100% dari {totalHeadcount} karyawan aktif
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

            {/* Section 2: Presensi & Disiplin Hari Ini */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/60">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-bold text-slate-900 dark:text-white">
                  Monitoring Presensi Hari Ini
                </span>
                <span className="text-slate-400 dark:text-zinc-500 font-medium">
                  {checkedInCount} check-in dari {totalHeadcount} karyawan
                </span>
              </div>

              {/* Attendance Segmented Bar */}
              <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                <div
                  style={{ width: `${totalHeadcount > 0 ? (onTimeCount / totalHeadcount) * 100 : 0}%` }}
                  className="h-full bg-emerald-500 rounded-l-full transition-all duration-700 ease-out"
                  title={`Tepat Waktu: ${onTimeCount}`}
                />
                <div
                  style={{ width: `${totalHeadcount > 0 ? (lateCount / totalHeadcount) * 100 : 0}%` }}
                  className="h-full bg-amber-500 transition-all duration-700 ease-out"
                  title={`Terlambat: ${lateCount}`}
                />
                <div
                  style={{ width: `${totalHeadcount > 0 ? (leaveCount / totalHeadcount) * 100 : 0}%` }}
                  className="h-full bg-blue-500 transition-all duration-700 ease-out"
                  title={`Cuti / Izin: ${leaveCount}`}
                />
                <div
                  style={{ width: `${totalHeadcount > 0 ? (notCheckedInCount / totalHeadcount) * 100 : 0}%` }}
                  className="h-full bg-slate-300 dark:bg-zinc-700 rounded-r-full transition-all duration-700 ease-out"
                  title={`Belum Absen: ${notCheckedInCount}`}
                />
              </div>

              {/* Attendance Legend */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Tepat Waktu <strong className="text-slate-900 dark:text-white font-bold">{onTimeCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Terlambat <strong className="text-slate-900 dark:text-white font-bold">{lateCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Cuti / Izin <strong className="text-slate-900 dark:text-white font-bold">{leaveCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-slate-400 dark:bg-zinc-500 shrink-0" />
                  <span className="text-slate-600 dark:text-zinc-400 font-medium">
                    Belum Absen <strong className="text-slate-900 dark:text-white font-bold">{notCheckedInCount}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Bottom Sub-Cards matching Screenshot 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/80">
              <div className="rounded-xl border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    Karyawan Tetap
                  </span>
                  <Users className="size-3.5 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                  {statusPermanent} <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">Orang</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    Kehadiran
                  </span>
                  <Target className="size-3.5 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                  {attendanceRate}%
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    Masa Kerja
                  </span>
                  <TrendingUp className="size-3.5 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                  {avgTenure} <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">Thn</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/70 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/40 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    Retensi SDM
                  </span>
                  <ShieldCheck className="size-3.5 text-slate-400 dark:text-zinc-500" />
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-2">
                  {retentionRate}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right (5 Cols): Top Open Deals -> Top Entitas Perusahaan */}
        <div className="xl:col-span-5 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Title, Badge, and More */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Top Entitas Perusahaan
                </h3>
                <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                  Distribusi penempatan karyawan per badan hukum
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 px-2.5 py-0.5">
                  {topCompanies.length} entitas
                </span>
                <button
                  type="button"
                  onClick={() => openDrilldown('Perusahaan', 'Entitas')}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </div>
            </div>

            {/* List of 5 Company Items with Colorized Gesit Logos */}
            <div className="space-y-2.5 mt-5">
              {topCompanies.map((comp) => {
                return (
                  <div
                    key={comp.company}
                    onClick={() => openDrilldown(comp.company, 'Perusahaan', comp.employeeList)}
                    className="group rounded-xl border border-slate-100 dark:border-zinc-800/60 bg-white dark:bg-[#131316] p-3 sm:p-3.5 hover:border-slate-200 dark:hover:border-zinc-700 hover:bg-slate-50/60 dark:hover:bg-zinc-900/60 transition-all cursor-pointer flex items-center justify-between gap-3"
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
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                            HQ
                          </span>
                          <span className="text-slate-300 dark:text-zinc-700">•</span>
                          <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${comp.color.badge}`}>
                            {comp.color.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Value & Progress Bar */}
                    <div className="text-right shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {comp.employees} <span className="text-[11px] font-normal text-slate-400 dark:text-zinc-500">Orang</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            style={{ width: `${comp.percentage}%` }}
                            className={`h-full rounded-full ${comp.color.bar}`}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-zinc-500 min-w-6 text-right">
                          {comp.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: OPERATIONAL CENTER (3 COLUMNS: ABSENSI, CUTI, ACTION CENTER) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Absensi & Kehadiran */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Absensi & kehadiran</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Snapshot: {snapshotDate} · Log Presensi
                </p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Detail</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Tingkat kehadiran</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {attendanceRate}
                  </span>
                  <span className="text-sm font-bold text-slate-500">%</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {checkedInCount} check-in dari {totalHeadcount} karyawan
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Bulan berjalan</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {checkedInCount > 0 ? attendanceRate : '0,0'}%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Harian realtime
                </span>
              </div>
            </div>

            {/* Stacked Progress Bar with smooth entry animation */}
            <div className="w-full h-3 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden flex gap-0.5 mt-6 p-0.5">
              <div
                style={{ width: `${chartsReady && totalHeadcount > 0 ? (onTimeCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-l-full transition-all duration-1000 ease-out"
                title={`Tepat waktu (${onTimeCount})`}
              />
              <div
                style={{ width: `${chartsReady && totalHeadcount > 0 ? (lateCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-1000 ease-out"
                title={`Terlambat (${lateCount})`}
              />
              <div
                style={{ width: `${chartsReady && totalHeadcount > 0 ? (leaveCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-1000 ease-out"
                title={`Cuti / Izin (${leaveCount})`}
              />
              <div
                style={{ width: `${chartsReady && totalHeadcount > 0 ? (notCheckedInCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-slate-300 dark:bg-slate-700 rounded-r-full transition-all duration-1000 ease-out"
                title={`Belum check-in (${notCheckedInCount})`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2.5 mt-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Tepat waktu</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{onTimeCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Terlambat</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{lateCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Cuti / Izin</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{leaveCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Belum absen</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{notCheckedInCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Cuti & Izin */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cuti & izin</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Pengajuan tercatat di sistem
                </p>
              </div>
              <button
                onClick={() => navigate('/requests')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Kelola</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Pengajuan masuk</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {totalLeaveRequests}
                  </span>
                  <span className="text-xs font-medium text-slate-500">pengajuan</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Cuti / izin hari ini</span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{leaveCount}</span>
                  <span className="text-xs font-medium text-slate-500">orang</span>
                </div>
              </div>
            </div>

            {/* 3 Status Cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-6">
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-xl font-black text-emerald-800 dark:text-emerald-300 block">
                  {approvedLeaves}
                </span>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                  Disetujui
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
                <span className="text-xl font-black text-amber-800 dark:text-amber-300 block">
                  {pendingLeaves}
                </span>
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mt-0.5 block">
                  Menunggu
                </span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-center">
                <span className="text-xl font-black text-rose-800 dark:text-rose-300 block">
                  {rejectedLeaves}
                </span>
                <span className="text-[10px] font-medium text-rose-700 dark:text-rose-400 mt-0.5 block">
                  Ditolak
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-500" />
              <span>Sinkronisasi otomatis dari permohonan aktif</span>
            </div>
          </div>
        </div>

        {/* 3. Perlu Perhatian HR (Action Center) */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perlu perhatian HR</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Tindak lanjut & peringatan dini</p>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md uppercase border border-amber-200/50 dark:border-amber-900/40">
                Action Center
              </span>
            </div>

            <div className="space-y-2 mt-2">
              {/* Row 1: Kontrak Berakhir */}
              <div
                onClick={() => openDrilldown('Kontrak Berakhir ≤30 Hari', 'Tinjau Kontrak', expiringContracts)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kontrak berakhir ≤30 hari</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Tinjau perpanjangan PKWT</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg">{expiringContracts.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              {/* Row 2: Usia >= 55 Tahun */}
              <div
                onClick={() => openDrilldown('Usia ≥55 Tahun', 'Monitoring Masa Pensiun', seniorEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Usia ≥55 tahun</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Pemantauan persiapan pensiun</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{seniorEmployees.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              {/* Row 3: Karyawan Probation */}
              <div
                onClick={() => openDrilldown('Karyawan Probation', 'Evaluasi Masa Percobaan', probationEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Karyawan probation</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Evaluasi masa percobaan</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{probationEmployees.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>

              {/* Row 4: Data Pendidikan Belum Lengkap */}
              <div
                onClick={() => openDrilldown('Data Pendidikan Belum Lengkap', 'Kelengkapan Profil', incompleteEducationEmployees)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-slate-100 dark:border-slate-800/60"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Data profil belum lengkap</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Lengkapi data SDM</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{incompleteEducationEmployees.length}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: PROFIL DEMOGRAFI KARYAWAN (3 KOLOM SEIMBANG) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Distribusi Usia */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Distribusi usia</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Profil usia karyawan aktif</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {ageDistribution.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        item.isHighlight ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => openDrilldown('Kelompok Usia', 'Demografi')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 2. Pendidikan Terakhir */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pendidikan terakhir</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Jenjang pendidikan tercatat</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {educationDistribution.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        item.isHighlight ? 'bg-amber-500 dark:bg-amber-400' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => openDrilldown('Jenjang Pendidikan', 'Pendidikan')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 3. Masa Kerja */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Masa kerja</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Durasi sejak tanggal bergabung</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {tenureDistribution.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        item.isHighlight ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => openDrilldown('Masa Kerja', 'Tenur Karyawan')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── ROW 4: STRUKTUR ORGANISASI & KOMPOSISI SDM (4 KOLOM: 2 COL DEPARTEMEN + 1 COL STATUS + 1 COL GENDER) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 1. Sebaran Departemen (Mengambil 2 Kolom dengan sub-grid 2 kolom sehingga padat dan seimbang) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sebaran departemen</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Distribusi karyawan pada tiap unit fungsi</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang · {departmentDistribution.length} divisi
              </span>
            </div>

            {/* Sub-grid 2 kolom untuk departemen agar ringkas dan seimbang dengan tinggi donut chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">
              {departmentDistribution.map(item => (
                <div key={item.label} className="flex flex-col justify-center">
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-slate-600 dark:text-slate-300 truncate pr-1" title={item.label}>
                      {item.label}
                    </span>
                    <span className="text-slate-900 dark:text-white font-bold shrink-0">
                      {item.count}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({item.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${chartsReady ? item.percentage : 0}%` }}
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        item.isHighlight ? 'bg-slate-900 dark:bg-blue-500' : 'bg-slate-400 dark:bg-slate-600'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => openDrilldown('Departemen', 'Fungsi Organisasi')}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 2. Status Kepegawaian (1 Kolom: Donut Chart Centered & Legend Proporsional) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status kepegawaian</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Hubungan kerja</p>
              </div>
            </div>

            {/* Donut SVG Centered */}
            <div className="flex justify-center my-2">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-[#222225]" strokeWidth="14" />
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
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white block leading-none">
                    {totalHeadcount}
                  </span>
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-0.5">Aktif</span>
                </div>
              </div>
            </div>

            {/* Legend Stacked */}
            <div className="space-y-1.5 text-xs mt-3">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#103065] dark:bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">PKWTT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-slate-900 dark:text-white">{statusPermanent}</strong>
                  <span className="text-[10px] text-slate-400">
                    ({totalHeadcount > 0 ? ((statusPermanent / totalHeadcount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#2563eb] dark:bg-sky-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">PKWT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-slate-900 dark:text-white">{statusContract}</strong>
                  <span className="text-[10px] text-slate-400">
                    ({totalHeadcount > 0 ? ((statusContract / totalHeadcount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#d97706] dark:bg-amber-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Probation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-slate-900 dark:text-white">{statusProbation}</strong>
                  <span className="text-[10px] text-slate-400">
                    ({totalHeadcount > 0 ? ((statusProbation / totalHeadcount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            Database karyawan aktif
          </div>
        </div>

        {/* 3. Komposisi Gender (1 Kolom: Donut Chart Centered & Legend Proporsional) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Komposisi gender</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Gender database</p>
              </div>
            </div>

            {/* Donut SVG Centered */}
            <div className="flex justify-center my-2">
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-[#222225]" strokeWidth="14" />
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
                  <span className="text-[8px] text-slate-400 dark:text-slate-500 block mt-0.5">Aktif</span>
                </div>
              </div>
            </div>

            {/* Legend Stacked */}
            <div className="space-y-1.5 text-xs mt-3">
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#103065] dark:bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Laki-laki</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-slate-900 dark:text-white">{maleCount}</strong>
                  <span className="text-[10px] text-slate-400">
                    ({totalHeadcount > 0 ? ((maleCount / totalHeadcount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#0284C7] dark:bg-sky-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Perempuan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <strong className="font-bold text-slate-900 dark:text-white">{femaleCount}</strong>
                  <span className="text-[10px] text-slate-400">
                    ({totalHeadcount > 0 ? ((femaleCount / totalHeadcount) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              </div>
              {unspecifiedGenderCount > 0 && (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">Belum diisi</span>
                  </div>
                  <strong className="font-bold text-slate-900 dark:text-white">{unspecifiedGenderCount}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            Proporsi database gender
          </div>
        </div>
      </div>

      {/* ── ROW 5: RINGKASAN PER PERUSAHAAN (TABLE) ── */}
      <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ringkasan per perusahaan</h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Karyawan aktif, demografi, dan status kerja dari database</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2.5 py-1 rounded-md">
            {snapshotDate}
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                <th className="py-3 px-3">PERUSAHAAN</th>
                <th className="py-3 px-3">KARYAWAN</th>
                <th className="py-3 px-3">RATA-RATA USIA</th>
                <th className="py-3 px-3">MASA KERJA</th>
                <th className="py-3 px-3">TETAP / KONTRAK / PROBATION</th>
                <th className="py-3 px-3 text-right">KONTRAK ≤30 HARI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {companySummaryRows.map(row => (
                <tr key={row.company} className="hover:bg-slate-50/80 dark:hover:bg-[#18181b]/60 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                    {row.company}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                    {row.employees}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                    {row.avgAge}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                    {row.tenure}
                  </td>
                  <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                    {row.breakdown}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <button
                      onClick={() => openDrilldown(row.company, 'Perusahaan', row.employeeList)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 cursor-pointer"
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
      {drilldownModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#131316] rounded-2xl border border-slate-200 dark:border-[#27272a] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#18181b]/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{drilldownModal.title}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{drilldownModal.subtitle}</p>
              </div>
              <button
                onClick={() => setDrilldownModal(prev => ({ ...prev, open: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Internal Search Bar */}
            <div className="px-4 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#131316]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama karyawan, NIK, jabatan, atau perusahaan..."
                  value={drilldownSearch}
                  onChange={e => setDrilldownSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] pl-9 pr-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {modalEmployeesFiltered.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  Tidak ada karyawan yang sesuai kriteria pencarian ini.
                </div>
              ) : (
                modalEmployeesFiltered.map((emp: any) => (
                  <div key={emp.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={emp.full_name || 'Karyawan'} url={emp.avatar_url} size="sm" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {emp.full_name || emp.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {emp.employee_code || emp.nik || 'EMP'} · {emp.job_title || emp.position || 'Staff'} ·{' '}
                          {emp.company || 'The Gesit Companies'} ({emp.department || 'General'})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setDrilldownModal(prev => ({ ...prev, open: false }));
                        navigate('/employees');
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline shrink-0 cursor-pointer"
                    >
                      Profil →
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#18181b]/50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                Menampilkan {modalEmployeesFiltered.length} dari {drilldownModal.employees.length} karyawan
              </span>
              <button
                onClick={() => setDrilldownModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
