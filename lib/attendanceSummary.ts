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
  return {
    user, present, late, absent, missing, leave: leaveDates.size,
    holiday: recs.filter(row => row.status === 'holiday').length,
    totalWork: recs.reduce((sum, row) => sum + Number(row.total_work_minutes || 0), 0),
    totalOT: recs.reduce((sum, row) => sum + Number(row.total_overtime_minutes || 0), 0),
    onTime: present, total: recs.length,
  };
}
