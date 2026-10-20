import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const sql = await readFile(new URL('../../supabase/13_standard_shift_assignments.sql', import.meta.url), 'utf8');
const db = new PGlite();
try {
  await db.exec(`
    create table attendance_schedules (
      id bigint generated always as identity primary key, name text,
      work_start time, work_end time, grace_period_minutes integer,
      is_flexible boolean, flex_start time, flex_end time,
      required_work_hours numeric, is_active boolean
    );
    create table user_accounts (
      id bigint primary key, employee_code text, full_name text,
      work_schedule_type text, schedule_id bigint references attendance_schedules(id),
      custom_work_start time, custom_work_end time
    );
    insert into attendance_schedules (name, work_start, work_end, is_flexible, is_active, grace_period_minutes)
    values ('Existing morning', '07:00', '16:00', false, true, 15),
           ('Existing daytime', '09:00', '18:00', false, true, 15),
           ('Inactive eight', '08:00', '17:00', false, false, 15),
           ('Flexible eight', '08:00', '17:00', true, true, 15);
  `);
  for (const [id, code] of [[27, '12020029'], [28, '93100003'], [31, '23080361'], [32, '24090376'], [29, '6020017'], [71, '13110063'], [35, '26060389'], [133, 'unrelated']]) {
    await db.query("insert into user_accounts (id, employee_code, work_schedule_type, custom_work_start, custom_work_end) values ($1, $2, 'custom', '08:00', '17:00')", [id, code]);
  }
  const unrelated = (await db.query('select * from user_accounts where id=133')).rows;
  await db.exec(sql);
  const assigned = (await db.query(`select u.id, u.work_schedule_type, u.custom_work_start, u.custom_work_end, s.work_start, s.work_end, s.is_active, s.is_flexible
    from user_accounts u join attendance_schedules s on s.id=u.schedule_id order by u.id`)).rows;
  assert.equal(assigned.length, 7);
  for (const row of assigned) {
    assert.equal(row.work_schedule_type, 'shift');
    assert.equal(row.custom_work_start, null);
    assert.equal(row.custom_work_end, null);
    assert.equal(row.is_active, true);
    assert.equal(row.is_flexible, false);
    const expected = row.id === 28 ? ['09:00:00', '18:00:00'] : row.id === 31 ? ['07:00:00', '16:00:00'] : row.id === 32 ? ['10:00:00', '19:00:00'] : ['08:00:00', '17:00:00'];
    assert.deepEqual([row.work_start, row.work_end], expected);
  }
  assert.deepEqual((await db.query('select * from user_accounts where id=133')).rows, unrelated);
  assert.equal((await db.query('select count(*)::integer as count from attendance_schedules')).rows[0].count, 6);
  await db.exec(sql);
  assert.equal((await db.query('select count(*)::integer as count from attendance_schedules')).rows[0].count, 6);
  await db.exec("update user_accounts set employee_code='WRONG' where id=27");
  await assert.rejects(db.exec(sql), /SHIFT_EMPLOYEE_MISMATCH/);
  await db.exec('rollback');
  console.log('PASS: 7 assignments, active fixed shifts, existing shifts reused, unrelated employee unchanged, idempotency, ID/NIK mismatch guard.');
} finally {
  await db.close();
}
