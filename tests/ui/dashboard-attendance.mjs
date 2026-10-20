import assert from 'node:assert/strict';
import { dashboardAttendance } from '../../lib/dashboardAttendance.ts';
const schedules = [
  { id: 1, work_start: '07:00', grace_period_minutes: 15 },
  { id: 2, work_start: '10:00', grace_period_minutes: 15 },
  { id: 3, is_flexible: true, work_start: '07:00', flex_end: '10:00', grace_period_minutes: 180 },
];
const employees = Array.from({ length: 9 }, (_, id) => ({ id, schedule_id: 1 }));
employees[3].schedule_id = 2;
employees[4].schedule_id = 3;
employees[5].schedule_id = 999;
employees[6].join_date = '2026-10-21';
const input = {
  employees, schedules, settings: { default_schedule_id: 1, work_days: [1, 2, 3, 4, 5] },
  records: [{ user_id: 0, date: '2026-10-20', status: 'present' }, { user_id: 0, date: '2026-10-20', status: 'present' }, { user_id: 1, date: '2026-10-20', status: 'late' }],
  leaves: [{ user_id: 2, status: 'approved', start_date: '2026-10-20', end_date: '2026-10-20' }, { user_id: 7, status: 'pending', start_date: '2026-10-20', end_date: '2026-10-20' }],
  holidays: new Set(), date: '2026-10-20', now: new Date('2026-10-20T01:30:00Z'),
};
const result = dashboardAttendance(input);
assert.equal(result.checkedIn, 2);
assert.equal(result.required, 6);
assert.equal(result.leave.length, 1);
assert.deepEqual(result.upcoming.map(employee => employee.id), [3, 4]);
assert.deepEqual(result.pending.map(employee => employee.id), [7, 8]);
assert.deepEqual(result.unknown.map(employee => employee.id), [5]);
assert.equal(result.offDuty.length, 1);
assert.equal(result.rate, '33,3');
const holiday = dashboardAttendance({ ...input, records: [], holidays: new Set(['2026-10-20']) });
assert.equal(holiday.required, 0);
assert.equal(holiday.rate, null);
const weekend = dashboardAttendance({ ...input, records: [], date: '2026-10-18' });
assert.equal(weekend.required, 0);
const workingWeekend = dashboardAttendance({ ...input, records: [], date: '2026-10-18', workingDates: new Set(['2026-10-18']) });
assert.ok(workingWeekend.required > 0);
const past = dashboardAttendance({ ...input, records: [], date: '2026-10-19' });
assert.equal(past.upcoming.length, 0);
const future = dashboardAttendance({ ...input, records: [], date: '2026-10-21' });
assert.equal(future.pending.length, 0);
assert.equal(dashboardAttendance({ ...input, employees: [] }).rate, null);
console.log('PASS: WIB shift cutoff, flexible window, approved/pending leave, holidays, weekends, future/past dates, missing schedules, unique employees, empty denominator.');
