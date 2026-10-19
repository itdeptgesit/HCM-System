import { jakartaDate, resolveApprovalStatus } from './workforce-contract';

export function dateRange(start: string, end: string): string[] {
  const result: string[] = [];
  for (const day = new Date(`${start}T00:00:00Z`); day <= new Date(`${end}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) result.push(day.toISOString().slice(0, 10));
  return result;
}

export function reportDatePreset(preset: 'today' | 'last7' | 'thisMonth' | 'lastMonth', today = jakartaDate()) {
  const day = new Date(`${today}T00:00:00Z`);
  if (preset === 'today') return { start: today, end: today };
  if (preset === 'last7') { day.setUTCDate(day.getUTCDate() - 6); return { start: day.toISOString().slice(0, 10), end: today }; }
  if (preset === 'thisMonth') return { start: `${today.slice(0, 7)}-01`, end: today };
  const first = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1));
  const last = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 0));
  return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
}

export function summarizeEmployee(user: any, records: any[], leaves: any[], start: string, end: string, holidays: Set<string>, today = jakartaDate()) {
  const recs = records.filter(row => String(row.user_id) === String(user.id) && row.date >= start && row.date <= end && row.date <= today);
  const recordedDates = new Set(recs.map(row => row.date));
  const scheduled = dateRange(start, end < today ? end : today).filter(date => {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    return weekday !== 0 && weekday !== 6 && !holidays.has(date) && (!user.join_date || date >= user.join_date) && (!user.separation_date || date <= user.separation_date);
  });
  const leaveDates = new Set<string>(recs.filter(row => ['leave', 'sick', 'permission'].includes(row.status)).map(row => row.date));
  for (const leave of leaves) {
    if (String(leave.user_id) !== String(user.id) || resolveApprovalStatus(leave) !== 'approved') continue;
    for (const date of scheduled) if (date >= leave.start_date && date <= leave.end_date && !recordedDates.has(date)) leaveDates.add(date);
  }
  const present = recs.filter(row => row.status === 'present').length;
  const late = recs.filter(row => row.status === 'late').length;
  const absent = recs.filter(row => row.status === 'absent').length;
  const missing = scheduled.filter(date => date < today && !recordedDates.has(date) && !leaveDates.has(date)).length;
  const missingCheckout = recs.filter(row => Boolean(row.clock_in) && !row.clock_out).length;

  let totalWork = 0;
  let totalOT = 0;
  for (const row of recs) {
    let wm = Number(row.total_work_minutes ?? row.work_duration_minutes ?? 0);
    if ((!wm || wm <= 0) && row.clock_in && row.clock_out) {
      const diff = (new Date(row.clock_out).getTime() - new Date(row.clock_in).getTime()) / 60000;
      if (diff > 0) wm = Math.round(diff);
    }
    if (wm > 840) wm = 540; // cap extreme runaway checkouts
    totalWork += wm;
    totalOT += Number(row.total_overtime_minutes || 0);
  }

  const attendedDays = present + late;
  const scheduledDays = scheduled.length;
  const approvedLeaveDays = leaveDates.size;
  
  // Tingkat Kehadiran Adil: Karyawan yang cuti resmi tidak dianggap mangkir/penalti
  // Total hari evaluasi = Hari Kerja Wajib terjadwal
  const attendanceRate = scheduledDays > 0
    ? Math.min(100, Math.round(((attendedDays + approvedLeaveDays) / scheduledDays) * 100))
    : (attendedDays > 0 ? 100 : 0);

  // Rata-rata jam kerja saat hadir
  const avgDailyWorkMinutes = attendedDays > 0 ? Math.round(totalWork / attendedDays) : 0;

  return {
    user,
    present,
    late,
    absent,
    missing,
    missingCheckout,
    leave: approvedLeaveDays,
    holiday: recs.filter(row => row.status === 'holiday').length,
    scheduledDays,
    attendedDays,
    attendanceRate,
    totalWork,
    avgDailyWorkMinutes,
    totalOT,
    onTime: present,
    total: recs.length,
  };
}
