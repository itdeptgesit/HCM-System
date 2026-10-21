import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { before, beforeEach, after, test } from 'node:test';
const require = createRequire(import.meta.url);
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const migration = readFileSync(new URL('../supabase/14_workforce_email_notifications.sql', import.meta.url), 'utf8');
const chainSource = readFileSync(new URL('../supabase/09_master_fix_all_bugs.sql', import.meta.url), 'utf8');
const query = async (sql, args = []) => (await db.query(sql, args)).rows;
const claim = () => query('select * from claim_workforce_emails()');
const prepare = async job => (await query('select prepare_workforce_email($1,$2) as envelope', [job.id, job.lease_token]))[0].envelope;
const finish = async (job, messageId = null, error = null, retryable = false) => (await query('select finish_workforce_email($1,$2,$3,$4,$5) as ok', [job.id, job.lease_token, messageId, error, retryable]))[0].ok;

before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table user_accounts (
      id bigint primary key, email text, full_name text, status text default 'Active', employment_status text default 'Active',
      supervisor_id bigint, attendance_supervisor_id bigint, attendance_hr_id bigint,
      manager_id bigint, attendance_manager_id bigint, vp_id bigint, attendance_vp_id bigint
    );
    create table leave_requests (
      id uuid primary key default gen_random_uuid(), user_id text, status text default 'pending',
      approval_status text default 'pending', current_approval_level integer default 1,
      start_date date, end_date date, reason text
    );
    create table attendance_correction_requests (
      id uuid primary key default gen_random_uuid(), user_id text, status text default 'pending',
      attendance_date date, clock_in_time timestamptz, reason text
    );
    create table attendance_requests (
      id uuid primary key default gen_random_uuid(), user_id text, status text default 'pending',
      request_date date, latitude float, longitude float, photo_url text, reason text
    );
  `);
  const chain = chainSource.match(/CREATE OR REPLACE FUNCTION public\.workforce_approval_chain\(p_user_id text\)[\s\S]*?\$\$;/)?.[0];
  assert.ok(chain);
  await db.exec(chain);
  await db.exec("insert into leave_requests(user_id) values('1')");
  await db.exec(migration);
  assert.equal((await query('select count(*)::integer as count from workforce_email_outbox'))[0].count, 0, 'No historical backfill');
});
beforeEach(async () => {
  await db.exec(`
    truncate workforce_email_outbox,leave_requests,attendance_requests,attendance_correction_requests,user_accounts;
    insert into user_accounts(id,email,full_name) values
      (1,'employee@example.invalid','TEST Employee'),(2,'spv@example.invalid','TEST Supervisor'),
      (3,'hr@example.invalid','TEST HR'),(4,'manager@example.invalid','TEST Manager');
    update user_accounts set attendance_supervisor_id=2,attendance_hr_id=3,attendance_manager_id=4 where id=1;
    update workforce_email_settings set enabled=true;
  `);
});
after(() => db.close());

test('disabled by configuration, migration is repeatable and preserves enable state', async () => {
  await db.exec('update workforce_email_settings set enabled=false');
  await db.exec("insert into leave_requests(user_id) values('1')");
  assert.deepEqual(await claim(), []);
  await db.exec(migration);
  assert.equal((await query('select enabled from workforce_email_settings'))[0].enabled, false);
  await db.exec('update workforce_email_settings set enabled=true');
  await db.exec(migration);
  assert.equal((await claim()).length, 1);
});

test('all three request kinds go to the first designated approver with only email-safe detail', async () => {
  await db.exec(`
    insert into leave_requests(user_id,start_date,end_date,reason) values('1','2027-01-04','2027-01-05','PRIVATE MEDICAL DETAIL');
    insert into attendance_correction_requests(user_id,attendance_date) values('1','2027-01-04');
    insert into attendance_requests(user_id,request_date,latitude,longitude,photo_url) values('1','2027-01-04',-6,106,'PRIVATE PHOTO');
  `);
  const jobs = await claim();
  assert.equal(jobs.length, 3);
  const prepared = [];
  for (const job of jobs) {
    const envelope = await prepare(job);
    assert.equal(envelope.recipient_email, 'spv@example.invalid');
    assert.equal(envelope.state, 'pending_level_1');
    assert.equal(envelope.start_date, '2027-01-04');
    assert.equal(JSON.stringify(envelope).includes('PRIVATE PHOTO'), false);
    assert.equal(JSON.stringify(envelope).includes('latitude'), false);
    prepared.push({ table: job.request_table, envelope });
    assert.equal(await finish(job, 'gmail-test'), true);
  }
  const leave = prepared.find(item => item.table === 'leave_requests').envelope;
  assert.equal(leave.reason, 'PRIVATE MEDICAL DETAIL');
  assert.equal(Number(leave.days), 2);
  // The balance table is absent here: the lookup must degrade to null, not fail.
  assert.equal(leave.balance_days, null);
  assert.deepEqual(await claim(), []);
});

test('current approval stage is normalized for both RPC and legacy direct updates', async () => {
  const [{ id }] = await query("insert into leave_requests(user_id) values('1') returning id");
  await query("update leave_requests set approval_status='pending_level_2',current_approval_level=2 where id=$1", [id]);
  for (const job of await claim()) {
    const envelope = await prepare(job);
    if (job.request_state === 'pending_level_1') assert.equal(envelope, null);
    else assert.equal(envelope.recipient_email, 'hr@example.invalid');
  }
  await query("update leave_requests set status='pending_senior',approval_status='pending_level_3',current_approval_level=3 where id=$1", [id]);
  const [job] = await claim();
  assert.equal((await prepare(job)).recipient_email, 'manager@example.invalid');
  await query("update leave_requests set reason='edited only' where id=$1", [id]);
  assert.equal((await query('select count(*)::integer as count from workforce_email_outbox'))[0].count, 3);
});

test('attendance legacy stages advance and final decisions notify the employee only', async () => {
  for (const table of ['attendance_correction_requests', 'attendance_requests']) {
    const [{ id }] = await query(`insert into ${table}(user_id) values('1') returning id`);
    await query(`update ${table} set status='pending_line_2' where id=$1`, [id]);
    for (const job of await claim()) {
      const envelope = await prepare(job);
      if (envelope) {
        assert.equal(envelope.recipient_email, 'hr@example.invalid');
        await finish(job, 'gmail-test');
      }
    }
    await query(`update ${table} set status='approved' where id=$1`, [id]);
    const [job] = await claim();
    const envelope = await prepare(job);
    assert.equal(envelope.recipient_email, 'employee@example.invalid');
    assert.equal(envelope.state, 'approved');
    await finish(job, 'gmail-test');
  }
  await db.exec("insert into leave_requests(user_id,status,approval_status) values('1','rejected','pending')");
  const [job] = await claim();
  assert.equal((await prepare(job)).state, 'rejected');
});

test('revalidates reassigned approvers and blocks missing, inactive, invalid or self recipients', async () => {
  await db.exec("insert into leave_requests(user_id) values('1')");
  const [job] = await claim();
  await db.exec('update user_accounts set attendance_supervisor_id=4 where id=1');
  assert.equal((await prepare(job)).recipient_email, 'manager@example.invalid');
  await db.exec("update user_accounts set email=E'bad\r\nBcc: stolen@example.invalid' where id=4");
  assert.equal(await prepare(job), null);
  assert.equal((await query('select status from workforce_email_outbox where id=$1', [job.id]))[0].status, 'blocked');
  await db.exec("update user_accounts set attendance_supervisor_id=1,attendance_hr_id=null,attendance_manager_id=null where id=1; insert into attendance_requests(user_id) values('1')");
  const [self] = await claim();
  assert.equal(await prepare(self), null);
  await db.exec("update user_accounts set attendance_supervisor_id=2 where id=1; update user_accounts set status='Inactive' where id=2; insert into attendance_correction_requests(user_id) values('1')");
  const [inactive] = await claim();
  assert.equal(await prepare(inactive), null);
});

test('events and source changes roll back together; cancelled/deleted tasks never send', async () => {
  await db.exec("begin; insert into leave_requests(user_id) values('1'); rollback;");
  assert.deepEqual(await claim(), []);
  const [{ id }] = await query("insert into leave_requests(user_id) values('1') returning id");
  const [job] = await claim();
  await query("update leave_requests set status='cancelled' where id=$1", [id]);
  assert.equal(await prepare(job), null);
  await db.exec("insert into attendance_requests(user_id) values('1')");
  const [deleted] = await claim();
  await db.exec('delete from attendance_requests');
  assert.equal(await prepare(deleted), null);
});

test('leases prevent duplicate claims and fence stale acknowledgements, retries are delayed', async () => {
  await db.exec("insert into leave_requests(user_id) values('1')");
  const [old] = await claim();
  assert.deepEqual(await claim(), []);
  await query("update workforce_email_outbox set lease_until=now()-interval '1 second' where id=$1", [old.id]);
  const [retry] = await claim();
  assert.notEqual(retry.lease_token, old.lease_token);
  assert.equal(await finish(old, 'old-message'), false);
  assert.equal(await finish(retry, null, 'GMAIL_SEND_HTTP_429', true), true);
  assert.deepEqual(await claim(), []);
  await db.exec("update workforce_email_outbox set available_at=now()-interval '1 second'");
  const [next] = await claim();
  assert.equal(next.attempts, 3);
  assert.equal(await finish(next, null, 'GMAIL_SEND_HTTP_400', false), true);
  assert.deepEqual(await claim(), []);
});

test('stops retrying after five attempts and releases work if disabled during delivery', async () => {
  await db.exec("insert into leave_requests(user_id) values('1')");
  const [job] = await claim();
  await db.exec('update workforce_email_settings set enabled=false');
  assert.equal(await prepare(job), null);
  assert.equal((await query('select attempts from workforce_email_outbox'))[0].attempts, 0);
  await db.exec("update workforce_email_settings set enabled=true; update workforce_email_outbox set attempts=4");
  const [last] = await claim();
  assert.equal(last.attempts, 5);
  await finish(last, null, 'GOOGLE_NETWORK_ERROR', true);
  assert.equal((await query('select status from workforce_email_outbox'))[0].status, 'failed');
});

test('anonymous and authenticated clients cannot read queues or call sending RPCs', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try {
      await assert.rejects(query('select * from workforce_email_outbox'), /permission denied/);
      await assert.rejects(query('select * from claim_workforce_emails()'), /permission denied/);
      await assert.rejects(query('update workforce_email_settings set enabled=true'), /permission denied/);
    } finally { await db.exec('reset role'); }
  }
});
