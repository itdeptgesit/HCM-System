import assert from 'node:assert/strict';
import { standardShiftOptions } from '../../lib/standardShifts.ts';

const row = (id, start, end, extra = {}) => ({ id, name: `TEST ${id}`, work_start: `${start}:00`, work_end: `${end}:00`, is_flexible: false, is_active: true, ...extra });
const schedules = [
  row(1, '07:00', '19:00', { is_flexible: true }),
  row(2, '08:30', '17:30'),
  row(3, '07:00', '16:00'),
  row(4, '09:00', '18:00'),
  row(6, '08:00', '17:00'),
  row(7, '10:00', '19:00'),
  row(10, '08:00', '17:00'),
  row(5, '08:00', '17:00', { is_active: false }),
];
const options = standardShiftOptions(schedules);
assert.deepEqual(options.map(option => option.label), [
  'Shift Pagi 1 (07:00 - 16:00)', 'Shift Pagi 2 (08:00 - 17:00)',
  'Shift Pagi 3 (09:00 - 18:00)', 'Middle Shift (10:00 - 19:00)',
]);
assert.deepEqual(options.map(option => option.schedule.id), [3, 6, 4, 7]);
assert.equal(standardShiftOptions(schedules, '10')[1].schedule.id, 10);
assert.equal(standardShiftOptions(schedules, '2').length, 4);
assert.equal(standardShiftOptions([]).every(option => !option.schedule), true);
assert.equal(standardShiftOptions([...schedules].reverse())[1].schedule.id, 6);
console.log('PASS: exactly 4 standard shifts, correct labels, no flexible/08:30/inactive/duplicate options, selected ID preserved, missing masters unavailable.');
