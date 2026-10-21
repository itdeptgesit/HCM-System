import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createEmailAction } from '../supabase/functions/send-workforce-emails/action.ts';
import { signActionToken } from '../supabase/functions/send-workforce-emails/email.ts';

const secret = 'TEST_ONLY_WORKER_SECRET_NOT_A_REAL_CREDENTIAL_123456';
const appUrl = 'https://hr.example.invalid';
const requestId = '33333333-3333-4333-8333-333333333333';
const eventId = '11111111-1111-4111-8111-111111111111';

const row = {
  id: requestId, user_id: '1', leave_type: 'annual',
  start_date: '2027-01-04', end_date: '2027-01-06', total_days: 3,
  reason: 'Keperluan keluarga', status: 'pending', approval_status: 'pending_level_2', current_approval_level: 2,
};

async function token(overrides = {}) {
  return signActionToken({
    event: eventId, table: 'leave_requests', request: requestId,
    state: 'pending_level_2', approver: '2', exp: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  }, secret);
}

function fixture({ state = 'pending_level_2', error = null, requester = 'Budi', approver = 'Sari' } = {}) {
  const calls = [];
  const database = {
    from(table) {
      return {
        select() {
          return {
            eq(column, value) {
              return {
                async maybeSingle() {
                  if (table === 'leave_requests') return { data: row, error: null };
                  const name = String(value) === String(row.user_id) ? requester : approver;
                  return { data: { full_name: name }, error: null };
                },
              };
            },
          };
        },
      };
    },
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve(name === 'workforce_email_state'
        ? { data: state, error: null }
        : { data: {}, error });
    },
  };
  return { calls, handle: createEmailAction({ secret, appUrl, database }) };
}

const get = (value = '') => new Request(`https://project.example.invalid/functions/v1/send-workforce-emails?t=${encodeURIComponent(value)}`);
const post = (value, action) => new Request(`https://project.example.invalid/functions/v1/send-workforce-emails?t=${encodeURIComponent(value)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ action }).toString(),
});

test('confirmation page shows the request only and changes nothing on GET', async () => {
  const { handle, calls } = fixture();
  const response = await handle(get(await token()));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const html = await response.text();
  assert.match(html, /Konfirmasi pengajuan cuti/);
  assert.match(html, /Halo Sari/);
  assert.match(html, /Budi/);
  assert.match(html, /Cuti Tahunan/);
  assert.match(html, /Senin, 4 Januari 2027 – Rabu, 6 Januari 2027/);
  assert.match(html, /3 hari/);
  assert.match(html, /Level 2/);
  assert.match(html, /name="action" value="approve"/);
  assert.match(html, /name="action" value="reject"/);
  assert.match(html, /https:\/\/hr\.example\.invalid\/image\/logo\.png/);
  assert.deepEqual(calls.map(call => call.name), ['workforce_email_state']);
});

test('invalid, tampered, expired and non-leave links are refused', async () => {
  const { handle } = fixture();
  const valid = await token();
  for (const value of ['', 'not-a-token', valid.slice(0, -3), await token({ exp: 1 }), await token({ state: 'approved' }),
    await token({ table: 'attendance_requests' }), await signActionToken({ event: eventId, table: 'leave_requests', request: requestId, state: 'pending_level_2', approver: '2', exp: Math.floor(Date.now() / 1000) + 600 }, `${secret}-other`)]) {
    const response = await handle(get(value));
    assert.equal(response.status, 400);
    assert.match(await response.text(), /Tautan tidak berlaku/);
  }
});

test('a link whose stage already moved on cannot be used', async () => {
  const { handle, calls } = fixture({ state: 'pending_level_3' });
  const response = await handle(get(await token()));
  assert.equal(response.status, 409);
  const html = await response.text();
  assert.match(html, /Sudah diproses/);
  assert.equal(html.includes('name="action"'), false);
  assert.equal(calls.some(call => call.name === 'decide_leave_via_email'), false);
});

test('POST records the approver decision and refuses unknown or failed choices', async () => {
  const approve = fixture();
  const ok = await approve.handle(post(await token(), 'approve'));
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Cuti disetujui/);
  assert.deepEqual(approve.calls.find(call => call.name === 'decide_leave_via_email').args, {
    p_request_id: requestId, p_approver_id: '2', p_expected_state: 'pending_level_2', p_decision: 'approved',
  });

  const reject = fixture();
  assert.match(await (await reject.handle(post(await token(), 'reject'))).text(), /Cuti ditolak/);
  assert.equal(reject.calls.find(call => call.name === 'decide_leave_via_email').args.p_decision, 'rejected');

  const invalid = fixture();
  assert.equal((await invalid.handle(post(await token(), 'maybe'))).status, 400);
  assert.equal(invalid.calls.some(call => call.name === 'decide_leave_via_email'), false);

  const failed = fixture({ error: { message: 'INSUFFICIENT_LEAVE_BALANCE' } });
  const failure = await failed.handle(post(await token(), 'approve'));
  assert.equal(failure.status, 409);
  assert.match(await failure.text(), /Saldo cuti karyawan tidak mencukupi/);
});

test('names and reasons from the database are escaped', async () => {
  const { handle } = fixture({ requester: '<script>alert(1)</script>', approver: 'Sari <b>' });
  const html = await (await handle(get(await token()))).text();
  assert.equal(html.includes('<script>alert(1)</script>'), false);
  assert.equal(html.includes('Sari <b>'), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
