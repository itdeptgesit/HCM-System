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
    state: 'pending_level_2', approver: '2', action: 'approve', exp: Math.floor(Date.now() / 1000) + 600,
    ...overrides,
  }, secret);
}

function fixture({ state = 'pending_level_2', error = null } = {}) {
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
                  return { data: { full_name: String(value) === String(row.user_id) ? 'Budi' : 'Sari' }, error: null };
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

const get = (value = '') => new Request(`https://project.example.invalid/functions/v1/send-workforce-emails?t=${encodeURIComponent(value)}`, {
  headers: { Accept: 'application/json' },
});
const post = (value, action = 'approve') => new Request(`https://project.example.invalid/functions/v1/send-workforce-emails?t=${encodeURIComponent(value)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ action }),
});

test('GET returns the request as JSON for the HR page and never decides anything', async () => {
  const { handle, calls } = fixture();
  const response = await handle(get(await token()));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), appUrl);
  assert.deepEqual(await response.json(), {
    request: {
      requester_name: 'Budi', approver_name: 'Sari', leave_type: 'annual',
      start_date: '2027-01-04', end_date: '2027-01-06', total_days: 3,
      reason: 'Keperluan keluarga', level: 2, action: 'approve', sender: 'hr-admin@gesit.co.id',
    },
  });
  assert.deepEqual(calls.map(call => call.name), ['workforce_email_state']);
});

test('preflight and unsupported methods are handled with CORS headers', async () => {
  const { handle, calls } = fixture();
  const preflight = await handle(new Request('https://project.example.invalid/functions/v1/send-workforce-emails?t=x', { method: 'OPTIONS' }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), appUrl);
  assert.match(preflight.headers.get('access-control-allow-methods'), /GET,POST,OPTIONS/);

  const notAllowed = await handle(new Request('https://project.example.invalid/functions/v1/send-workforce-emails?t=x', { method: 'PUT' }));
  assert.equal(notAllowed.status, 400);
  assert.deepEqual(calls, []);
});

test('invalid, tampered, expired and non-leave links are refused as JSON', async () => {
  const { handle } = fixture();
  const valid = await token();
  for (const value of ['', 'not-a-token', valid.slice(0, -3), await token({ exp: 1 }), await token({ state: 'approved' }),
    await token({ table: 'attendance_requests' }), await token({ action: 'maybe' }), await signActionToken({ event: eventId, table: 'leave_requests', request: requestId, state: 'pending_level_2', approver: '2', action: 'approve', exp: Math.floor(Date.now() / 1000) + 600 }, `${secret}-other`)]) {
    const response = await handle(get(value));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'INVALID_TOKEN');
  }
});

test('a link whose stage already moved on reports ALREADY_PROCESSED', async () => {
  const { handle, calls } = fixture({ state: 'pending_level_3' });
  const response = await handle(get(await token()));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, 'ALREADY_PROCESSED');
  assert.equal(calls.some(call => call.name === 'decide_leave_via_email'), false);
});

test('POST records the approver decision and refuses unknown or failed choices', async () => {
  const approve = fixture();
  const ok = await approve.handle(post(await token(), 'approve'));
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { decision: 'approved' });
  assert.deepEqual(approve.calls.find(call => call.name === 'decide_leave_via_email').args, {
    p_request_id: requestId, p_approver_id: '2', p_expected_state: 'pending_level_2', p_decision: 'approved',
  });

  const reject = fixture();
  assert.deepEqual(await (await reject.handle(post(await token({ action: 'reject' }), 'reject'))).json(), { decision: 'rejected' });
  assert.equal(reject.calls.find(call => call.name === 'decide_leave_via_email').args.p_decision, 'rejected');

  // A link is bound to one decision and cannot be replayed for the other.
  const mismatch = fixture();
  assert.equal((await mismatch.handle(post(await token(), 'reject'))).status, 400);
  assert.equal(mismatch.calls.some(call => call.name === 'decide_leave_via_email'), false);

  const invalid = fixture();
  assert.equal((await invalid.handle(post(await token(), 'maybe'))).status, 400);
  assert.equal(invalid.calls.some(call => call.name === 'decide_leave_via_email'), false);

  const failed = fixture({ error: { message: 'INSUFFICIENT_LEAVE_BALANCE' } });
  const failure = await failed.handle(post(await token(), 'approve'));
  assert.equal(failure.status, 409);
  const payload = await failure.json();
  assert.equal(payload.error, 'DECISION_FAILED');
  assert.match(payload.message, /Saldo cuti karyawan tidak mencukupi/);
});

test('malformed bodies do not reach the database', async () => {
  const { handle, calls } = fixture();
  const response = await handle(new Request(`https://project.example.invalid/functions/v1/send-workforce-emails?t=${encodeURIComponent(await token())}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{not-json',
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'INVALID_ACTION');
  assert.equal(calls.some(call => call.name === 'decide_leave_via_email'), false);
});
