export interface ShiftSchedule {
  id: number | string;
  name: string;
  work_start: string;
  work_end: string;
  is_flexible: boolean;
  is_active?: boolean;
}

export const STANDARD_SHIFTS = [
  { name: 'Shift Pagi 1', start: '07:00', end: '16:00' },
  { name: 'Shift Pagi 2', start: '08:00', end: '17:00' },
  { name: 'Shift Pagi 3', start: '09:00', end: '18:00' },
  { name: 'Middle Shift', start: '10:00', end: '19:00' },
] as const;

export function standardShiftOptions(schedules: ShiftSchedule[], selectedId?: number | string) {
  return STANDARD_SHIFTS.map(shift => {
    const matches = schedules.filter(schedule =>
      !schedule.is_flexible && schedule.is_active !== false &&
      schedule.work_start?.slice(0, 5) === shift.start &&
      schedule.work_end?.slice(0, 5) === shift.end,
    ).sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const schedule = matches.find(item => String(item.id) === String(selectedId)) ?? matches[0];
    return { ...shift, schedule, label: `${shift.name} (${shift.start} - ${shift.end})` };
  });
}
