'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Users,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Info,
  CalendarDays,
  User,
  Briefcase,
  X,
  FileText,
  MapPin,
  Eye,
  SlidersHorizontal,
  Download
} from '@/components/ui/icons';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/UserAvatar';
import { toast } from 'sonner';
import { CollectiveLeaveConfigModal } from '../../attendance/CollectiveLeaveConfigModal';

// Official Indonesian Holidays Reference (SKB 2026 & SKB 2027)
const OFFICIAL_SKB_HOLIDAYS: Record<number, Array<{ holiday_date: string; name: string; holiday_type: 'national' | 'collective_leave' }>> = {
  2026: [
    { holiday_date: '2026-01-01', name: 'Tahun Baru 2026 Masehi', holiday_type: 'national' },
    { holiday_date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad SAW', holiday_type: 'national' },
    { holiday_date: '2026-02-16', name: 'Cuti Bersama Tahun Baru Imlek', holiday_type: 'collective_leave' },
    { holiday_date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', holiday_type: 'national' },
    { holiday_date: '2026-03-18', name: 'Cuti Bersama Hari Suci Nyepi', holiday_type: 'collective_leave' },
    { holiday_date: '2026-03-19', name: 'Hari Suci Nyepi (Tahun Baru Saka 1948)', holiday_type: 'national' },
    { holiday_date: '2026-03-20', name: 'Idul Fitri 1447 Hijriah', holiday_type: 'national' },
    { holiday_date: '2026-03-21', name: 'Idul Fitri 1447 Hijriah (Hari Kedua)', holiday_type: 'national' },
    { holiday_date: '2026-03-22', name: 'Cuti Bersama Idul Fitri 1447 H', holiday_type: 'collective_leave' },
    { holiday_date: '2026-03-23', name: 'Cuti Bersama Idul Fitri 1447 H', holiday_type: 'collective_leave' },
    { holiday_date: '2026-03-24', name: 'Cuti Bersama Idul Fitri 1447 H', holiday_type: 'collective_leave' },
    { holiday_date: '2026-04-03', name: 'Wafat Yesus Kristus', holiday_type: 'national' },
    { holiday_date: '2026-04-05', name: 'Hari Paskah (Kebangkitan Yesus Kristus)', holiday_type: 'national' },
    { holiday_date: '2026-05-01', name: 'Hari Buruh Internasional', holiday_type: 'national' },
    { holiday_date: '2026-05-14', name: 'Kenaikan Yesus Kristus', holiday_type: 'national' },
    { holiday_date: '2026-05-15', name: 'Cuti Bersama Kenaikan Yesus Kristus', holiday_type: 'collective_leave' },
    { holiday_date: '2026-05-27', name: 'Idul Adha 1447 Hijriah', holiday_type: 'national' },
    { holiday_date: '2026-05-28', name: 'Cuti Bersama Idul Adha 1447 H', holiday_type: 'collective_leave' },
    { holiday_date: '2026-05-31', name: 'Hari Raya Waisak 2570 BE', holiday_type: 'national' },
    { holiday_date: '2026-06-01', name: 'Hari Lahir Pancasila', holiday_type: 'national' },
    { holiday_date: '2026-06-16', name: '1 Muharam Tahun Baru Islam 1448 H', holiday_type: 'national' },
    { holiday_date: '2026-08-17', name: 'Proklamasi Kemerdekaan RI', holiday_type: 'national' },
    { holiday_date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', holiday_type: 'national' },
    { holiday_date: '2026-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus', holiday_type: 'collective_leave' },
    { holiday_date: '2026-12-25', name: 'Kelahiran Yesus Kristus (Hari Raya Natal)', holiday_type: 'national' },
  ],
  2027: [
    { holiday_date: '2027-01-01', name: 'Tahun Baru 2027 Masehi', holiday_type: 'national' },
    { holiday_date: '2027-01-05', name: 'Isra Mikraj Nabi Muhammad S.A.W. 1448 Hijriah', holiday_type: 'national' },
    { holiday_date: '2027-02-05', name: 'Cuti Bersama Tahun Baru Imlek 2578 Kongzili', holiday_type: 'collective_leave' },
    { holiday_date: '2027-02-06', name: 'Tahun Baru Imlek 2578 Kongzili', holiday_type: 'national' },
    { holiday_date: '2027-03-08', name: 'Hari Suci Nyepi (Tahun Baru Saka 1949)', holiday_type: 'national' },
    { holiday_date: '2027-03-09', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
    { holiday_date: '2027-03-10', name: 'Idul Fitri 1448 Hijriah', holiday_type: 'national' },
    { holiday_date: '2027-03-11', name: 'Idul Fitri 1448 Hijriah (Hari Kedua)', holiday_type: 'national' },
    { holiday_date: '2027-03-12', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
    { holiday_date: '2027-03-15', name: 'Cuti Bersama Idul Fitri 1448 Hijriah', holiday_type: 'collective_leave' },
    { holiday_date: '2027-03-25', name: 'Cuti Bersama Wafat Yesus Kristus', holiday_type: 'collective_leave' },
    { holiday_date: '2027-03-26', name: 'Wafat Yesus Kristus', holiday_type: 'national' },
    { holiday_date: '2027-03-28', name: 'Kebangkitan Yesus Kristus (Paskah)', holiday_type: 'national' },
    { holiday_date: '2027-05-01', name: 'Hari Buruh Internasional', holiday_type: 'national' },
    { holiday_date: '2027-05-06', name: 'Kenaikan Yesus Kristus', holiday_type: 'national' },
    { holiday_date: '2027-05-17', name: 'Idul Adha 1448 Hijriah', holiday_type: 'national' },
    { holiday_date: '2027-05-18', name: 'Cuti Bersama Idul Adha 1448 Hijriah', holiday_type: 'collective_leave' },
    { holiday_date: '2027-05-19', name: 'Cuti Bersama Hari Raya Waisak 2571 BE', holiday_type: 'collective_leave' },
    { holiday_date: '2027-05-20', name: 'Hari Raya Waisak 2571 BE', holiday_type: 'national' },
    { holiday_date: '2027-06-01', name: 'Hari Lahir Pancasila', holiday_type: 'national' },
    { holiday_date: '2027-06-06', name: '1 Muharam Tahun Baru Islam 1449 Hijriah', holiday_type: 'national' },
    { holiday_date: '2027-08-15', name: 'Maulid Nabi Muhammad S.A.W.', holiday_type: 'national' },
    { holiday_date: '2027-08-17', name: 'Proklamasi Kemerdekaan', holiday_type: 'national' },
    { holiday_date: '2027-12-24', name: 'Cuti Bersama Kelahiran Yesus Kristus', holiday_type: 'collective_leave' },
    { holiday_date: '2027-12-25', name: 'Kelahiran Yesus Kristus', holiday_type: 'national' },
    { holiday_date: '2027-12-26', name: 'Isra Mikraj Nabi Muhammad S.A.W. 1449 Hijriah', holiday_type: 'national' },
  ],
};

export type HREventCategory =
  | 'national_holiday'
  | 'collective_leave'
  | 'company_holiday'
  | 'leave_annual'
  | 'leave_sick'
  | 'leave_special';

export interface HREvent {
  id: string;
  title: string;
  category: HREventCategory;
  date: string; // YYYY-MM-DD
  startDate: string;
  endDate: string;
  isAllDay: boolean;
  // Holiday specifics
  holidayType?: string;
  deductLeave?: boolean;
  source?: string;
  isActive?: boolean;
  // Employee leave specifics
  userId?: string;
  employeeName?: string;
  employeeNik?: string;
  department?: string;
  avatarUrl?: string;
  leaveType?: string;
  reason?: string;
  status?: string;
  approvalStatus?: string;
}

export const CATEGORY_CONFIG: Record<
  HREventCategory,
  { label: string; dot: string; chip: string; badge: string }
> = {
  national_holiday: {
    label: 'Libur Nasional',
    dot: 'bg-rose-500',
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
  },
  collective_leave: {
    label: 'Cuti Bersama',
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
  },
  company_holiday: {
    label: 'Libur Kantor',
    dot: 'bg-blue-500',
    chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30',
    badge: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
  },
  leave_annual: {
    label: 'Cuti Tahunan Karyawan',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  },
  leave_sick: {
    label: 'Cuti Sakit',
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
    badge: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400'
  },
  leave_special: {
    label: 'Izin Khusus / Lainnya',
    dot: 'bg-purple-500',
    chip: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30',
    badge: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400'
  }
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

interface HRWorkforceCalendarProps {
  currentUser?: any;
}

export function HRWorkforceCalendar({ currentUser }: HRWorkforceCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda'>('calendar');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Filter Categories State
  const [activeCategories, setActiveCategories] = useState<HREventCategory[]>([
    'national_holiday',
    'collective_leave',
    'company_holiday',
    'leave_annual',
    'leave_sick',
    'leave_special'
  ]);

  // Raw Data State
  const [dbHolidays, setDbHolidays] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [departments, setDepartments] = useState<string[]>([]);

  // Dialog & Detail states
  const [selectedEvent, setSelectedEvent] = useState<HREvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ date: string; events: HREvent[] } | null>(null);
  const [addHolidayOpen, setAddHolidayOpen] = useState(false);
  const [collectiveModalOpen, setCollectiveModalOpen] = useState(false);

  // New Holiday Form State
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState<'national' | 'collective_leave' | 'company'>('company');
  const [newHolidayDeduct, setNewHolidayDeduct] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Load all workforce calendar data
  const loadCalendarData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user accounts for identity lookup
      const { data: usersData, error: userErr } = await supabase
        .from('user_accounts')
        .select('id, full_name, nickname, employee_code, department, avatar_url');
      
      if (userErr) {
        console.warn('Error fetching user_accounts in calendar:', userErr);
      }
      
      const uMap: Record<string, any> = {};
      const depts = new Set<string>();
      if (usersData) {
        usersData.forEach((u) => {
          const key = String(u.id);
          const empName = u.full_name || u.nickname || 'Karyawan';
          uMap[key] = {
            name: empName,
            nik: u.employee_code || '',
            department: u.department || 'Umum',
            avatar: u.avatar_url || ''
          };
          if (u.department) depts.add(u.department);
        });
      }
      setUsersMap(uMap);
      setDepartments(Array.from(depts).sort());

      // 2. Fetch company holidays from DB
      const { data: holidaysData } = await supabase
        .from('company_holidays')
        .select('*')
        .order('holiday_date');
      setDbHolidays(holidaysData || []);

      // 3. Fetch approved leave requests only (pending requests must NOT appear as scheduled leave)
      const { data: leavesData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'approved')
        .order('start_date');
      setLeaveRequests(leavesData || []);

    } catch (err: any) {
      console.error('Error loading calendar data:', err);
      toast.error('Gagal memuat data kalender kerja.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [currentYear]);

  // Aggregate all events into HREvent format
  const allEvents = useMemo<HREvent[]>(() => {
    const list: HREvent[] = [];

    // 1. Process Official Holidays (with DB overrides)
    const officialHolidays = OFFICIAL_SKB_HOLIDAYS[currentYear] || [];
    const dbHolidayMap: Record<string, any> = {};
    dbHolidays.forEach((h) => {
      dbHolidayMap[h.holiday_date] = h;
    });

    // Merge official holidays
    officialHolidays.forEach((oh) => {
      const override = dbHolidayMap[oh.holiday_date];
      const isActive = override ? override.is_active !== false : true;
      if (!isActive) return;

      const cat: HREventCategory =
        oh.holiday_type === 'collective_leave' ? 'collective_leave' : 'national_holiday';

      list.push({
        id: `skb-${oh.holiday_date}`,
        title: override?.name || oh.name,
        category: cat,
        date: oh.holiday_date,
        startDate: oh.holiday_date,
        endDate: oh.holiday_date,
        isAllDay: true,
        holidayType: oh.holiday_type,
        deductLeave: override?.deduct_annual_leave ?? (oh.holiday_type === 'collective_leave'),
        source: 'SKB Pemerintah',
        isActive: true
      });
    });

    // Add company-specific holidays from DB not in official list
    dbHolidays.forEach((dh) => {
      if (!dh.holiday_date.startsWith(String(currentYear))) return;
      if (dh.is_active === false) return;
      const isOfficial = officialHolidays.some((oh) => oh.holiday_date === dh.holiday_date);
      if (isOfficial) return; // already processed above

      let cat: HREventCategory = 'company_holiday';
      if (dh.holiday_type === 'national') cat = 'national_holiday';
      else if (dh.holiday_type === 'collective_leave') cat = 'collective_leave';

      list.push({
        id: `db-holiday-${dh.id || dh.holiday_date}`,
        title: dh.name || dh.holiday_name || 'Libur Perusahaan',
        category: cat,
        date: dh.holiday_date,
        startDate: dh.holiday_date,
        endDate: dh.holiday_date,
        isAllDay: true,
        holidayType: dh.holiday_type || 'company',
        deductLeave: dh.deduct_annual_leave || false,
        source: dh.source || 'Kebijakan Perusahaan',
        isActive: true
      });
    });

    // 2. Process Employee Leave Requests (Approved only)
    leaveRequests.forEach((req) => {
      const reqStatus = String(req.status || req.approval_status || '').toLowerCase();
      if (reqStatus !== 'approved') return;
      const reqUid = String(req.user_id || '');
      const u = usersMap[reqUid] || {
        name: req.user_name || 'Karyawan',
        nik: '',
        department: req.department || 'Umum',
        avatar: ''
      };

      const start = req.start_date;
      const end = req.end_date || req.start_date;

      let cat: HREventCategory = 'leave_annual';
      const typeStr = (req.leave_type || '').toLowerCase();
      if (typeStr.includes('sick') || typeStr.includes('sakit')) {
        cat = 'leave_sick';
      } else if (
        typeStr.includes('maternity') ||
        typeStr.includes('paternity') ||
        typeStr.includes('marriage') ||
        typeStr.includes('bereavement') ||
        typeStr.includes('khusus') ||
        typeStr.includes('izin')
      ) {
        cat = 'leave_special';
      }

      // Generate date span
      const cur = new Date(start);
      const stop = new Date(end);
      while (cur <= stop) {
        const dStr = cur.toISOString().split('T')[0];
        if (dStr.startsWith(String(currentYear))) {
          list.push({
            id: `leave-${req.id}-${dStr}`,
            title: `${u.name} - ${CATEGORY_CONFIG[cat].label.replace(' Karyawan', '')}`,
            category: cat,
            date: dStr,
            startDate: start,
            endDate: end,
            isAllDay: true,
            userId: req.user_id,
            employeeName: u.name,
            employeeNik: u.nik,
            department: u.department,
            avatarUrl: u.avatar,
            leaveType: req.leave_type,
            reason: req.reason,
            status: req.status || req.approval_status || 'approved',
            approvalStatus: req.approval_status
          });
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    return list;
  }, [currentYear, dbHolidays, leaveRequests, usersMap]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Category filter
      if (!activeCategories.includes(ev.category)) return false;

      // Department filter
      if (departmentFilter !== 'all' && ev.department && ev.department !== departmentFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchName = ev.employeeName?.toLowerCase().includes(q);
        const matchDept = ev.department?.toLowerCase().includes(q);
        const matchReason = ev.reason?.toLowerCase().includes(q);
        if (!matchTitle && !matchName && !matchDept && !matchReason) return false;
      }

      return true;
    });
  }, [allEvents, activeCategories, departmentFilter, searchQuery]);

  // Event category counts for active month
  const categoryCounts = useMemo(() => {
    const counts: Record<HREventCategory, number> = {
      national_holiday: 0,
      collective_leave: 0,
      company_holiday: 0,
      leave_annual: 0,
      leave_sick: 0,
      leave_special: 0
    };

    allEvents.forEach((ev) => {
      const evDate = new Date(ev.date);
      if (evDate.getFullYear() === currentYear && evDate.getMonth() === currentMonth) {
        counts[ev.category] = (counts[ev.category] || 0) + 1;
      }
    });

    return counts;
  }, [allEvents, currentYear, currentMonth]);

  // Upcoming 5 events
  const upcomingEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const seen = new Set<string>();
    const list: HREvent[] = [];

    // Sort ascending by date
    const sorted = [...allEvents].sort((a, b) => a.date.localeCompare(b.date));

    for (const ev of sorted) {
      if (ev.date >= todayStr) {
        const key = `${ev.category}-${ev.title}-${ev.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push(ev);
        }
      }
      if (list.length >= 6) break;
    }

    return list;
  }, [allEvents]);

  // Calendar Grid Days (Month View)
  const monthCalendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const cells: (Date | null)[] = [];

    // Empty lead cells
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push(null);
    }

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push(new Date(currentYear, currentMonth, d));
    }

    // Pad trailing cells to fill row
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentYear, currentMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const toggleCategory = (cat: HREventCategory) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  // Save Custom Company Holiday
  const handleSaveHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim()) {
      toast.error('Harap pilih tanggal dan isi nama hari libur.');
      return;
    }
    setSavingHoliday(true);
    try {
      const year = parseInt(newHolidayDate.split('-')[0], 10) || currentYear;
      const payload = {
        holiday_date: newHolidayDate,
        name: newHolidayName.trim(),
        holiday_name: newHolidayName.trim(),
        holiday_type: newHolidayType,
        deduct_annual_leave: newHolidayDeduct,
        source: 'Kebijakan Perusahaan',
        is_active: true,
        year: year,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase.from('company_holidays').upsert(payload, { onConflict: 'holiday_date' });
      if (error) throw error;

      toast.success('Hari libur berhasil disimpan.');
      setAddHolidayOpen(false);
      setNewHolidayDate('');
      setNewHolidayName('');
      loadCalendarData();
    } catch (err: any) {
      toast.error('Gagal menyimpan hari libur: ' + (err.message || 'Error'));
    } finally {
      setSavingHoliday(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── HEADER SECTION ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Kalender Cuti & Hari Libur HR
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Pantau hari libur nasional SKB, cuti bersama, serta jadwal cuti & izin karyawan dalam satu kalender interaktif.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadCalendarData}
            disabled={loading}
            className="h-9 px-3 text-xs gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollectiveModalOpen(true)}
            className="h-9 px-3.5 text-xs gap-1.5 shadow-2xs font-semibold border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Atur Cuti Bersama</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setAddHolidayOpen(true)}
            className="h-9 px-3.5 text-xs gap-1.5 shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Libur Khusus</span>
          </Button>
        </div>
      </div>

      {/* ── MAIN WORKSPACE: SIDEBAR + CALENDAR CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT SIDEBAR (FILTERS & UPCOMING) ── */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          {/* Mini Month Picker & Jump */}
          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Pilih Bulan & Tahun</span>
                <CalendarIcon className="h-4 w-4 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 pt-0 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentDate(new Date(currentYear, Number(e.target.value), 1))}
                  className="h-8.5 rounded-lg border border-border/80 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentMonth, 1))}
                  className="h-8.5 rounded-lg border border-border/80 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  {[2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="w-full h-8 text-xs font-semibold border-border/70"
              >
                Kembali ke Hari Ini
              </Button>
            </CardContent>
          </Card>

          {/* Filter Categories */}
          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Kategori Event</span>
                <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-1">
              {(Object.keys(CATEGORY_CONFIG) as HREventCategory[]).map((cat) => {
                const conf = CATEGORY_CONFIG[cat];
                const isChecked = activeCategories.includes(cat);
                const count = categoryCounts[cat] || 0;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Checkbox
                        checked={isChecked}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${conf.dot}`} />
                      <span className={`truncate ${isChecked ? 'font-semibold text-foreground' : 'text-muted-foreground line-through opacity-70'}`}>
                        {conf.label}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/60 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Upcoming Leaves & Holidays */}
          <Card className="border-border/70 shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Agenda Terdekat</span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {upcomingEvents.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Tidak ada agenda cuti atau libur terdekat.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map((ev) => {
                    const conf = CATEGORY_CONFIG[ev.category];
                    const dateObj = new Date(ev.date);
                    const formattedDate = dateObj.toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short'
                    });

                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        className="flex items-start gap-2.5 p-2 rounded-lg border border-border/50 hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${conf.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{formattedDate}</span>
                            {ev.department && (
                              <span>· {ev.department}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT MAIN CONTENT: TOOLBAR + CALENDAR / AGENDA VIEW ── */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          {/* Calendar Toolbar */}
          <Card className="border-border/70 shadow-2xs p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Prev / Today / Next & Month Heading */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <h2 className="text-base sm:text-lg font-bold text-foreground min-w-[170px] text-center sm:text-left">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h2>

                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={handleNextMonth}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Search, Department Filter, & View Mode */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative min-w-[150px] sm:min-w-[180px] flex-1 sm:flex-none">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari karyawan / libur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/20 border-border/80"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
                >
                  <option value="all">Semua Divisi</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                {/* View Switcher: Bulan vs Agenda */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList className="h-8 p-0.5">
                    <TabsTrigger value="calendar" className="text-xs px-2.5 py-1">
                      Bulan
                    </TabsTrigger>
                    <TabsTrigger value="agenda" className="text-xs px-2.5 py-1">
                      Agenda
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </Card>

          {/* ── TAB 1: MONTH CALENDAR GRID ── */}
          {activeTab === 'calendar' && (
            <Card className="border-border/70 shadow-sm overflow-hidden bg-card">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-center">
                {DAY_NAMES.map((day, idx) => (
                  <div
                    key={day}
                    className={`py-2 text-[11px] font-bold uppercase tracking-wider ${
                      idx === 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : idx === 6
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
                {monthCalendarGrid.map((dayDate, idx) => {
                  if (!dayDate) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[120px] xl:min-h-[145px] bg-muted/15 p-1"
                      />
                    );
                  }

                  const dateStr = dayDate.toISOString().split('T')[0];
                  const dayNum = dayDate.getDate();
                  const dayOfWeek = dayDate.getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;

                  const today = new Date();
                  const isToday =
                    dayDate.getFullYear() === today.getFullYear() &&
                    dayDate.getMonth() === today.getMonth() &&
                    dayDate.getDate() === today.getDate();

                  // Get events matching this date
                  const dayEvents = filteredEvents.filter((ev) => ev.date === dateStr);
                  const isHoliday = dayEvents.some(
                    (ev) =>
                      ev.category === 'national_holiday' ||
                      ev.category === 'collective_leave' ||
                      ev.category === 'company_holiday'
                  );

                  const MAX_VISIBLE = 3;
                  const visibleEvents = dayEvents.slice(0, MAX_VISIBLE);
                  const overflowCount = dayEvents.length - MAX_VISIBLE;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        if (dayEvents.length > 0) {
                          setSelectedDayEvents({ date: dateStr, events: dayEvents });
                        }
                      }}
                      className={`min-h-[120px] xl:min-h-[145px] p-2 transition-colors flex flex-col justify-between group ${
                        isToday
                          ? 'bg-primary/5 dark:bg-primary/10'
                          : isHoliday || isSunday
                          ? 'bg-rose-500/[0.03] dark:bg-rose-500/[0.05]'
                          : isSaturday
                          ? 'bg-muted/10'
                          : 'bg-card hover:bg-muted/30'
                      }`}
                    >
                      {/* Cell Header: Day Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isToday
                              ? 'bg-primary text-primary-foreground shadow-2xs'
                              : isHoliday || isSunday
                              ? 'text-rose-600 dark:text-rose-400 font-black'
                              : isSaturday
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-foreground'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips */}
                      <div className="space-y-1 overflow-hidden flex-1">
                        {visibleEvents.map((ev) => {
                          const conf = CATEGORY_CONFIG[ev.category];

                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(ev);
                              }}
                              className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight transition-transform hover:scale-[1.02] cursor-pointer ${conf.chip}`}
                              title={ev.title}
                            >
                              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${conf.dot}`} />
                              <span className="truncate">{ev.title}</span>
                            </button>
                          );
                        })}

                        {overflowCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDayEvents({ date: dateStr, events: dayEvents });
                            }}
                            className="text-[10px] font-semibold text-primary hover:underline px-1 block text-left"
                          >
                            +{overflowCount} lainnya...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── TAB 2: AGENDA LIST VIEW ── */}
          {activeTab === 'agenda' && (
            <Card className="border-border/70 shadow-sm overflow-hidden">
              <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Daftar Agenda & Cuti Karyawan ({filteredEvents.length} entri)</span>
                  <Badge variant="outline" className="text-xs font-semibold">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredEvents.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <CalendarDays className="h-8 w-8 opacity-30 text-muted-foreground" />
                    <p className="font-semibold text-sm">Tidak ada agenda cuti atau hari libur.</p>
                    <p className="text-xs">Coba sesuaikan filter kategori atau kata kunci pencarian Anda.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {filteredEvents.map((ev) => {
                      const conf = CATEGORY_CONFIG[ev.category];
                      const dateObj = new Date(ev.date);
                      const formattedDate = dateObj.toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      });

                      const isHoliday =
                        ev.category === 'national_holiday' ||
                        ev.category === 'collective_leave' ||
                        ev.category === 'company_holiday';

                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {isHoliday ? (
                              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${conf.chip}`}>
                                <CalendarDays className="h-5 w-5" />
                              </div>
                            ) : (
                              <UserAvatar name={ev.employeeName || 'User'} url={ev.avatarUrl} size="md" />
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                  {ev.title}
                                </h4>
                                <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-semibold ${conf.badge}`}>
                                  {conf.label}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="font-medium text-foreground">{formattedDate}</span>
                                {ev.department && (
                                  <span>· Divisi: <b>{ev.department}</b></span>
                                )}
                                {ev.reason && (
                                  <span className="truncate max-w-xs">· "{ev.reason}"</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-muted-foreground group-hover:text-foreground shrink-0"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Rincian
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── EVENT DETAILS DIALOG ── */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs font-semibold ${CATEGORY_CONFIG[selectedEvent.category].badge}`}>
                    {CATEGORY_CONFIG[selectedEvent.category].label}
                  </Badge>
                  {selectedEvent.status && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedEvent.status === 'approved' ? 'Disetujui' : 'Menunggu Approval'}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-foreground mt-2">
                  {selectedEvent.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Informasi rinci kalender kerja The Gesit Companies
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-2 text-xs">
                {/* Dates */}
                <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tanggal:</span>
                    <span className="font-bold text-foreground">
                      {new Date(selectedEvent.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {selectedEvent.startDate !== selectedEvent.endDate && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-muted-foreground">Rentang Durasi:</span>
                      <span className="font-semibold text-foreground">
                        {selectedEvent.startDate} s/d {selectedEvent.endDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* If employee leave */}
                {selectedEvent.employeeName && (
                  <div className="space-y-2 rounded-lg border border-border/70 p-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={selectedEvent.employeeName} url={selectedEvent.avatarUrl} size="md" />
                      <div>
                        <p className="font-bold text-sm text-foreground">{selectedEvent.employeeName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {selectedEvent.employeeNik ? `NIK: ${selectedEvent.employeeNik} · ` : ''}
                          Divisi: {selectedEvent.department || 'Umum'}
                        </p>
                      </div>
                    </div>

                    {selectedEvent.reason && (
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <span className="text-muted-foreground block text-[11px] mb-0.5">Alasan Permohonan:</span>
                        <p className="text-foreground font-medium italic">"{selectedEvent.reason}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* If holiday */}
                {!selectedEvent.employeeName && (
                  <div className="space-y-2 rounded-lg border border-border/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Dasar Kebijakan / Sumber:</span>
                      <span className="font-semibold text-foreground">{selectedEvent.source || 'SKB 3 Menteri'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Potong Cuti Tahunan:</span>
                      <span className="font-semibold text-foreground">
                        {selectedEvent.deductLeave ? 'Ya (Memotong Kuota)' : 'Tidak (Libur Resmi)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DAY EVENTS OVERVIEW DIALOG (When clicking a date with multiple events) ── */}
      <Dialog open={!!selectedDayEvents} onOpenChange={(open) => !open && setSelectedDayEvents(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedDayEvents && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground">
                  Agenda Tanggal {new Date(selectedDayEvents.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Terdapat {selectedDayEvents.events.length} agenda cuti & hari libur pada tanggal ini.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 max-h-80 overflow-y-auto py-2 pr-1">
                {selectedDayEvents.events.map((ev) => {
                  const conf = CATEGORY_CONFIG[ev.category];

                  return (
                    <div
                      key={ev.id}
                      onClick={() => {
                        setSelectedDayEvents(null);
                        setSelectedEvent(ev);
                      }}
                      className="p-3 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${conf.dot}`} />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                            {ev.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {ev.department ? `Divisi: ${ev.department}` : conf.label}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className={`text-[10px] py-0 px-1.5 shrink-0 ${conf.badge}`}>
                        {conf.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setSelectedDayEvents(null)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── ADD CUSTOM COMPANY HOLIDAY DIALOG ── */}
      <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Tambah Hari Libur Perusahaan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tetapkan hari libur khusus internal kantor atau cuti bersama The Gesit Companies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Tanggal Hari Libur</label>
              <Input
                type="date"
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nama Hari Libur</label>
              <Input
                placeholder="Contoh: Libur Ulang Tahun Perusahaan"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Kategori Libur</label>
              <select
                value={newHolidayType}
                onChange={(e) => setNewHolidayType(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-border/80 bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="company">Libur Khusus Kantor (Company Holiday)</option>
                <option value="collective_leave">Cuti Bersama (Collective Leave)</option>
                <option value="national">Libur Nasional Tambahan</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="deduct-leave"
                checked={newHolidayDeduct}
                onCheckedChange={(checked) => setNewHolidayDeduct(!!checked)}
              />
              <label htmlFor="deduct-leave" className="text-xs font-medium text-foreground cursor-pointer">
                Memotong kuota cuti tahunan karyawan
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={savingHoliday}
              onClick={() => setAddHolidayOpen(false)}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={savingHoliday}
              onClick={handleSaveHoliday}
            >
              {savingHoliday ? 'Menyimpan...' : 'Simpan Hari Libur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CollectiveLeaveConfigModal
        open={collectiveModalOpen}
        onOpenChange={setCollectiveModalOpen}
        year={currentYear}
        onSuccess={() => loadCalendarData()}
      />
    </div>
  );
}

export default HRWorkforceCalendar;
