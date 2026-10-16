import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  ExternalLink
} from '@/components/ui/icons';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { isActiveEmployee, isHRAccount, jakartaDate, resolveApprovalStatus } from '../../lib/workforce-contract';
import { UserAvatar } from '../UserAvatar';

interface LiveHRDashboardProps {
  currentUser?: any;
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

export default function LiveHRDashboard({ currentUser }: LiveHRDashboardProps) {
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

  return (
    <div className="w-full space-y-6 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase block mb-1">
            PEOPLE INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Dashboard Human Capital
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Kenali profil, pergerakan, dan kebutuhan karyawan dalam satu pandangan terpadu.
          </p>
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

      {/* ── WORKFORCE SNAPSHOT BANNER ── */}
      <div className="bg-white dark:bg-[#131316] border-l-4 border-l-amber-500 border border-slate-200/80 dark:border-[#222225] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0 border border-amber-200/50 dark:border-amber-800/40">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400 uppercase block">
              WORKFORCE SNAPSHOT
            </span>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-0.5">
              Kelompok usia terbesar <strong className="font-bold text-slate-900 dark:text-white">{ageDistribution.find(x => x.isHighlight)?.label || '25–34 tahun'}</strong>,{' '}
              <strong className="font-bold text-slate-900 dark:text-white">
                {educationDistribution.find(x => x.label === 'S1')?.count || 0}
              </strong> karyawan berpendidikan S1 atau lebih tinggi, dan{' '}
              <strong className="font-bold text-slate-900 dark:text-white">{expiringContracts.length}</strong> kontrak berakhir dalam 30 hari.
            </p>
          </div>
        </div>
        <button
          onClick={() => openDrilldown('Kontrak Berakhir ≤30 Hari', 'Evaluasi Kontrak', expiringContracts)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white shrink-0 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span>Tinjau kontrak</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── ROW 2: ABSENSI & CUTI (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Absensi & Kehadiran */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Absensi & kehadiran</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Snapshot: {snapshotDate} · Log Presensi Karyawan
                </p>
              </div>
              <button
                onClick={() => navigate('/attendance')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <span>Lihat detail</span>
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
                  {checkedInCount} check-in dari {totalHeadcount} karyawan aktif
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block">Bulan berjalan</span>
                <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {checkedInCount > 0 ? attendanceRate : '0,0'}%
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                  Log presensi harian
                </span>
              </div>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full h-3.5 bg-slate-100 dark:bg-[#1F1F24] rounded-full overflow-hidden flex gap-1 mt-6 p-0.5">
              <div
                style={{ width: `${totalHeadcount > 0 ? (onTimeCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-l-full transition-all duration-500"
                title={`Tepat waktu (${onTimeCount})`}
              />
              <div
                style={{ width: `${totalHeadcount > 0 ? (lateCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                title={`Terlambat (${lateCount})`}
              />
              <div
                style={{ width: `${totalHeadcount > 0 ? (leaveCount / totalHeadcount) * 100 : 0}%` }}
                className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                title={`Cuti / Izin (${leaveCount})`}
              />
              <div
                style={{ width: `${totalHeadcount > 0 ? (notCheckedInCount / totalHeadcount) * 100 : 100}%` }}
                className="h-full bg-slate-300 dark:bg-slate-700 rounded-r-full transition-all duration-500"
                title={`Belum check-in (${notCheckedInCount})`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Tepat waktu</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{onTimeCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Terlambat</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{lateCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Cuti / Izin</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{leaveCount}</strong>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                <span className="text-slate-500 dark:text-slate-400">Belum check-in</span>
                <strong className="font-bold text-slate-900 dark:text-white ml-auto">{notCheckedInCount}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Cuti & Izin */}
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
                <span>Lihat pengajuan</span>
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
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-center">
                <span className="text-2xl font-black text-emerald-800 dark:text-emerald-300 block">
                  {approvedLeaves}
                </span>
                <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 mt-1 block">
                  Disetujui
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-center">
                <span className="text-2xl font-black text-amber-800 dark:text-amber-300 block">
                  {pendingLeaves}
                </span>
                <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 mt-1 block">
                  Menunggu
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-center">
                <span className="text-2xl font-black text-rose-800 dark:text-rose-300 block">
                  {rejectedLeaves}
                </span>
                <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 mt-1 block">
                  Ditolak
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-4">
              <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500" />
              <span>Sinkronisasi otomatis dari permohonan aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 3: 6 DEMOGRAPHIC & WORKFORCE CARDS (3x2 GRID) ── */}
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

            <div className="space-y-3.5 mt-4">
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
                      style={{ width: `${item.percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
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
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
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
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Jenjang pendidikan yang tercatat</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-3 mt-3">
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
                      style={{ width: `${item.percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
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

            <div className="space-y-3.5 mt-4">
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
                      style={{ width: `${item.percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
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
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 4. Status Kepegawaian (Donut) */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Status kepegawaian</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Komposisi hubungan kerja</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 my-4">
              {/* Donut SVG with theme-matched track */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-[#222225]" strokeWidth="14" />
                  {/* Permanent */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#103065] dark:text-blue-500"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={totalHeadcount > 0 ? 238.76 * (1 - statusPermanent / totalHeadcount) : 238.76}
                  />
                  {/* Contract */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#2563eb] dark:text-sky-400"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={totalHeadcount > 0 ? 238.76 * (1 - statusContract / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? (statusPermanent / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                  {/* Probation */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#d97706] dark:text-amber-400"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={totalHeadcount > 0 ? 238.76 * (1 - statusProbation / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? ((statusPermanent + statusContract) / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900 dark:text-white block leading-none">
                    {totalHeadcount}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Karyawan aktif</span>
                </div>
              </div>

              {/* Legend on right */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1E3A8A] dark:bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">PKWTT</span>
                  <strong className="font-bold text-slate-900 dark:text-white ml-2">{statusPermanent}</strong>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {totalHeadcount > 0 ? ((statusPermanent / totalHeadcount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3B82F6] dark:bg-blue-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">PKWT</span>
                  <strong className="font-bold text-slate-900 dark:text-white ml-2">{statusContract}</strong>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {totalHeadcount > 0 ? ((statusContract / totalHeadcount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B] dark:bg-amber-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Probation</span>
                  <strong className="font-bold text-slate-900 dark:text-white ml-2">{statusProbation}</strong>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {totalHeadcount > 0 ? ((statusProbation / totalHeadcount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                {statusIntern > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">Magang</span>
                    <strong className="font-bold text-slate-900 dark:text-white ml-2">{statusIntern}</strong>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {totalHeadcount > 0 ? ((statusIntern / totalHeadcount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            Proporsi berdasarkan data akun aktif
          </div>
        </div>

        {/* 5. Sebaran Departemen */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Sebaran departemen</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Jumlah karyawan pada setiap fungsi</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                {totalHeadcount} orang
              </span>
            </div>

            <div className="space-y-3.5 mt-4">
              {departmentDistribution.map(item => (
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
                      style={{ width: `${item.percentage}%` }}
                      className={`h-full rounded-full transition-all duration-500 ${
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
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80 transition-colors cursor-pointer"
          >
            <span>Klik kelompok untuk melihat karyawan</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* 6. Komposisi Gender (Donut) */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Komposisi gender</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Data gender yang tercatat</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 my-4">
              {/* Donut SVG */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-[#222225]" strokeWidth="14" />
                  {/* Laki-laki */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#103065] dark:text-blue-500"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={totalHeadcount > 0 ? 238.76 * (1 - maleCount / totalHeadcount) : 238.76}
                  />
                  {/* Perempuan */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-[#0284C7] dark:text-sky-400"
                    strokeWidth="14"
                    strokeDasharray="238.76"
                    strokeDashoffset={totalHeadcount > 0 ? 238.76 * (1 - femaleCount / totalHeadcount) : 238.76}
                    transform={`rotate(${totalHeadcount > 0 ? (maleCount / totalHeadcount) * 360 : 0} 50 50)`}
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-xl font-black text-slate-900 dark:text-white block leading-none">
                    {totalHeadcount}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-0.5">Karyawan aktif</span>
                </div>
              </div>

              {/* Legend on right */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1E3A8A] dark:bg-blue-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Laki-laki</span>
                  <strong className="font-bold text-slate-900 dark:text-white ml-2">{maleCount}</strong>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {totalHeadcount > 0 ? ((maleCount / totalHeadcount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#0284C7] dark:bg-sky-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Perempuan</span>
                  <strong className="font-bold text-slate-900 dark:text-white ml-2">{femaleCount}</strong>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {totalHeadcount > 0 ? ((femaleCount / totalHeadcount) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                {unspecifiedGenderCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
                    <span className="text-slate-600 dark:text-slate-300">Belum diisi</span>
                    <strong className="font-bold text-slate-900 dark:text-white ml-2">{unspecifiedGenderCount}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            Proporsi berdasarkan data gender database
          </div>
        </div>
      </div>

      {/* ── ROW 4: HEADCOUNT TREND & ACTION CENTER (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pergerakan Jumlah Karyawan */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pergerakan jumlah karyawan</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">6 bulan terakhir · Aktif pada akhir periode</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#18181b] px-2 py-0.5 rounded-md">
                Headcount
              </span>
            </div>

            {/* Vertical Bar Chart */}
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {monthlyTrend.map(t => {
                const maxVal = Math.max(...monthlyTrend.map(x => x.count), 1);
                const heightPercent = Math.max(15, Math.round((t.count / maxVal) * 100));
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t.count}
                    </span>
                    <div className="w-full max-w-[42px] bg-slate-100 dark:bg-[#1F1F24] rounded-t-lg h-full flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          t.isCurrent ? 'bg-[#b45309] dark:bg-amber-500' : 'bg-[#1e3a8a] hover:bg-[#1e40af] dark:bg-blue-600 dark:hover:bg-blue-500'
                        }`}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                      {t.month}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom movement stats */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Masuk bulan ini</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">+{newHires}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Keluar bulan ini</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white block">{resignations}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 block mb-1">Perubahan bersih</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white block">
                  {newHires - resignations >= 0 ? `+${newHires - resignations}` : newHires - resignations}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
              *Bulan terakhir sampai tanggal snapshot. Turnover = keluar ÷ headcount awal bulan × 100%.
            </p>
          </div>
        </div>

        {/* Perlu Perhatian HR (Action Center) */}
        <div className="bg-white dark:bg-[#131316] border border-slate-200/80 dark:border-[#222225] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Perlu perhatian HR</h3>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">Indikator untuk tindak lanjut</p>
              </div>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md uppercase border border-amber-200/50 dark:border-amber-900/40">
                Action center
              </span>
            </div>

            <div className="space-y-4 mt-4">
              {/* Row 1: Kontrak Berakhir */}
              <div
                onClick={() => openDrilldown('Kontrak Berakhir ≤30 Hari', 'Tinjau Kontrak', expiringContracts)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Kontrak berakhir ≤30 hari</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Tinjau perpanjangan atau akhir hubungan kerja</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg">{expiringContracts.length}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Row 2: Usia >= 55 Tahun */}
              <div
                onClick={() => openDrilldown('Usia ≥55 Tahun', 'Monitoring Masa Pensiun', seniorEmployees)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Usia ≥55 tahun</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Kelompok pemantauan usia, bukan penetapan pensiun</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{seniorEmployees.length}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Row 3: Karyawan Probation */}
              <div
                onClick={() => openDrilldown('Karyawan Probation', 'Evaluasi Masa Percobaan', probationEmployees)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Karyawan probation</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Pastikan evaluasi dan keputusan terdokumentasi</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{probationEmployees.length}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>

              {/* Row 4: Data Pendidikan Belum Lengkap */}
              <div
                onClick={() => openDrilldown('Data Pendidikan Belum Lengkap', 'Kelengkapan Profil', incompleteEducationEmployees)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-[#18181b] transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Data pendidikan belum lengkap</h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Lengkapi profil untuk meningkatkan kualitas analitik</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-300">
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#18181b] rounded-lg">{incompleteEducationEmployees.length}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>
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
