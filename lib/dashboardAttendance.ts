import { jakartaDate, resolveApprovalStatus } from './workforce-contract.ts';

interface Schedule {
  id: string | number;
  is_active?: boolean;
  is_flexible?: boolean;
  work_start?: string;
  start_time?: string;
  flex_end?: string;
  grace_period_minutes?: number;
  work_days?: number[];
}

interface AttendanceSettings {
  default_schedule_id?: string | number | null;
  work_days?: number[];
}

export function dashboardAttendance({ employees, records, leaves, schedules, settings, holidays, workingDates = new Set<string>(), date, now = new Date() }: {
  employees: any[];
  records: any[];
  leaves: any[];
  schedules: Schedule[];
  settings: AttendanceSettings | null;
  holidays: Set<string>;
  workingDates?: Set<string>;
  date: string;
  now?: Date;
}) {
  const groups = {
    onTime: [] as any[], late: [] as any[], leave: [] as any[],
    pending: [] as any[], upcoming: [] as any[], offDuty: [] as any[], unknown: [] as any[],
  };
  const today = jakartaDate(now);
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const minutesNow = Number(parts.find(part => part.type === 'hour')?.value) * 60 + Number(parts.find(part => part.type === 'minute')?.value);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const activeSchedules = schedules.filter(schedule => schedule.is_active !== false);
  const globalSchedule = activeSchedules.find(schedule => String(schedule.id) === String(settings?.default_schedule_id))
    ?? activeSchedules.find(schedule => schedule.is_flexible) ?? activeSchedules[0];
  const toMinutes = (value?: string) => {
    const match = value?.match(/^(\d{2}):(\d{2})/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  for (const employee of employees) {
    if ((employee.join_date && employee.join_date.slice(0, 10) > date) ||
      (employee.separation_date && employee.separation_date.slice(0, 10) < date)) {
      groups.offDuty.push(employee);
      continue;
    }
    const dayRecords = records.filter(record => String(record.user_id) === String(employee.id) && record.date === date);
    const checkedIn = dayRecords.find(record => record.clock_in || ['present', 'tepat_waktu', 'late', 'terlambat', 'half_day'].includes(String(record.status).toLowerCase()));
    if (checkedIn) {
      (['late', 'terlambat'].includes(String(checkedIn.status).toLowerCase()) ? groups.late : groups.onTime).push(employee);
      continue;
    }
    const schedule = employee.work_schedule_type === 'custom'
      ? { work_start: employee.custom_work_start, grace_period_minutes: employee.custom_grace_period_minutes ?? 15 }
      : employee.schedule_id
        ? activeSchedules.find(item => String(item.id) === String(employee.schedule_id))
        : globalSchedule;
    const days = (schedule as Schedule | undefined)?.work_days ?? settings?.work_days ?? [1, 2, 3, 4, 5];
    if ((!days.includes(weekday) && !workingDates.has(date)) || holidays.has(date) || dayRecords.some(record => record.status === 'holiday')) {
      groups.offDuty.push(employee);
      continue;
    }
    const approvedLeave = leaves.some(leave => String(leave.user_id) === String(employee.id)
      && resolveApprovalStatus(leave) === 'approved' && leave.start_date <= date && leave.end_date >= date);
    if (approvedLeave || dayRecords.some(record => ['leave', 'cuti', 'izin', 'sick', 'sakit', 'permission'].includes(String(record.status).toLowerCase()))) {
      groups.leave.push(employee);
      continue;
    }
    const start = toMinutes((schedule as Schedule | undefined)?.is_flexible ? (schedule as Schedule).flex_end : schedule?.work_start ?? (schedule as Schedule | undefined)?.start_time);
    if (start === null) {
      groups.unknown.push(employee);
      continue;
    }
    const deadline = start + ((schedule as Schedule).is_flexible ? 0 : Math.max(0, Number(schedule?.grace_period_minutes ?? 0)));
    if (date > today || (date === today && minutesNow <= deadline)) groups.upcoming.push(employee);
    else groups.pending.push(employee);
  }
  const checkedIn = groups.onTime.length + groups.late.length;
  const required = checkedIn + groups.pending.length + groups.upcoming.length;
  return { ...groups, checkedIn, required, rate: required > 0 ? (checkedIn / required * 100).toFixed(1).replace('.', ',') : null };
}
