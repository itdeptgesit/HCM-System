import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authorizeGmail, HR_SENDER, renderEmail, sendGmail, signActionToken, verifyActionToken } from '../supabase/functions/send-workforce-emails/email.ts';
import { createEmailWorker } from '../supabase/functions/send-workforce-emails/worker.ts';

const secret = 'TEST_ONLY_WORKER_SECRET_NOT_A_REAL_CREDENTIAL_123456';
const credentials = { clientId: 'TEST-client', clientSecret: 'TEST-secret', refreshToken: 'TEST-refresh' };
const job = { id: '11111111-1111-4111-8111-111111111111', lease_token: 'TEST-lease' };
const envelope = {
  ...job, request_table: 'leave_requests', request_id: 'TEST-request', state: 'pending_level_2', level: 2,
  recipient_email: 'approver@example.invalid', recipient_name: 'TEST Approver', requester_name: 'TEST Karyawan',
  start_date: '2027-01-04', end_date: '2027-01-06',
  leave_type: 'annual', reason: 'TEST keperluan keluarga', days: 3, balance_days: 9,
};
const request = () => new Request('https://example.invalid/functions/v1/send-workforce-emails', {
  method: 'POST', headers: { 'x-email-worker-secret': secret },
  body: JSON.stringify({ to: 'attacker@example.invalid', from: 'it@example.invalid', action: 'approve' }),
});

function fixture(overrides = {}) {
  const calls = { enabled: 0, claim: 0, prepare: 0, finish: [], http: [] };
  const store = {
    async enabled() { calls.enabled++; return true; },
    async claim() { calls.claim++; return [job]; },
    async prepare() { calls.prepare++; return envelope; },
    async finish(job, result) { calls.finish.push({ job, result }); },
    ...overrides.store,
  };
  const fetcher = async (url, init) => {
    calls.http.push({ url, init });
    if (overrides.fetcher) return overrides.fetcher(url, init);
    if (url === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'TEST-access' });
    if (url === 'https://openidconnect.googleapis.com/v1/userinfo') return Response.json({ email: overrides.identity || HR_SENDER, email_verified: true });
    if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') return Response.json({ id: 'TEST-gmail-id' });
    throw new Error('Unexpected external request');
  };
  return { calls, store, handle: createEmailWorker({ secret, appUrl: 'https://hr.example.invalid', credentials, store, fetcher, ...overrides.options }) };
}

function decodeMail(raw) {
  const mime = Buffer.from(raw, 'base64url').toString('utf8');
  const parts = [...mime.matchAll(/Content-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+?)\r\n--/g)]
    .map(match => Buffer.from(match[1].replace(/\s/g, ''), 'base64').toString('utf8'));
  return { mime, text: parts[0], html: parts[1] };
}

test('rejects public callers and unsupported methods before database access', async () => {
  const { handle, calls } = fixture();
  assert.equal((await handle(new Request('https://example.invalid', { method: 'POST' }))).status, 401);
  assert.equal((await handle(new Request('https://example.invalid', { method: 'GET' }))).status, 405);
  assert.equal((await handle(new Request('https://example.invalid', { method: 'POST', headers: { Authorization: 'Bearer TEST-anon-key' } }))).status, 401);
  assert.equal(calls.enabled, 0);
  assert.equal(calls.http.length, 0);
});

test('disabled notifications do not contact Google or claim any work', async () => {
  const { handle, calls } = fixture({ store: { async enabled() { return false; } } });
  assert.deepEqual(await (await handle(request())).json(), { enabled: false, sent: 0 });
  assert.equal(calls.claim, 0);
  assert.equal(calls.http.length, 0);
});

test('sends only to the server-resolved approver as HR; caller cannot inject recipient/sender', async () => {
  const { handle, calls } = fixture();
  const response = await handle(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).sent, 1);
  const tokenBody = calls.http[0].init.body;
  assert.equal(tokenBody.get('grant_type'), 'refresh_token');
  const send = calls.http.find(call => call.url.includes('/messages/send'));
  const { raw } = JSON.parse(send.init.body);
  const { mime, text, html } = decodeMail(raw);
  assert.match(mime, /From: GESIT HR <hr-admin@gesit.co.id>/);
  assert.match(mime, /To: approver@example.invalid/);
  assert.equal(mime.includes('attacker@'), false);
  assert.equal(mime.includes('it@example'), false);
  assert.match(text, /Senin, 4 Januari 2027 – Rabu, 6 Januari 2027/);
  assert.match(text, /tahap 2/);
  assert.match(text, /Jenis cuti: Cuti Tahunan/);
  assert.match(text, /Durasi: 3 hari/);
  assert.match(text, /Alasan: TEST keperluan keluarga/);
  assert.match(text, /Sisa saldo cuti: 9 hari/);
  assert.match(html, /https:\/\/hr\.example\.invalid\/approvals/);
  assert.match(html, /<img src="https:\/\/hr\.example\.invalid\/image\/logo\.png"/);
  assert.match(html, />Setujui</);
  assert.match(html, />Tolak</);
  assert.equal((html.match(/href="https:\/\/hr\.example\.invalid\/approvals"/g) || []).length, 3);
  assert.equal(html.includes('action='), false);
  assert.equal(calls.finish[0].result.messageId, 'TEST-gmail-id');
});

test('refuses OAuth belonging to IT or an unverified account before claiming jobs', async t => {
  t.mock.method(console, 'error', () => {});
  const { handle, calls } = fixture({ identity: 'it@example.invalid' });
  const response = await handle(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'GMAIL_ACCOUNT_IS_NOT_HR' });
  assert.equal(calls.claim, 0);
  await assert.rejects(authorizeGmail(credentials, async url => Response.json(url.includes('/token')
    ? { access_token: 'TEST-access' } : { email: HR_SENDER, email_verified: false })), /GMAIL_ACCOUNT_IS_NOT_HR/);
});

test('credential failures do not consume job retries or return provider secrets', async t => {
  t.mock.method(console, 'error', () => {});
  const { handle, calls } = fixture({ fetcher: async () => Response.json({ error: 'invalid_grant', error_description: 'TEST-SECRET' }, { status: 400 }) });
  const response = await handle(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'GMAIL_OAUTH_HTTP_400' });
  assert.equal(calls.claim, 0);
  assert.equal(calls.finish.length, 0);
});

test('superseded/blocked jobs do not send', async () => {
  const { handle, calls } = fixture({ store: { async prepare() { return null; } } });
  assert.equal((await (await handle(request())).json()).skipped, 1);
  assert.equal(calls.http.some(call => call.url.includes('/messages/send')), false);
  assert.equal(calls.finish.length, 0);
});

test('MIME supports Unicode, escapes HTML, contains no one-click approval, and rejects header injection', () => {
  const { text, html } = decodeMail(renderEmail({ ...envelope, requester_name: 'TEST Siti “É” <img src=x onerror=alert(1)>', recipient_name: 'TEST 李' }, 'https://hr.example.invalid'));
  assert.match(text, /TEST 李/);
  assert.match(text, /“É”/);
  assert.match(html, /&lt;img/);
  // The only real <img> is our own logo; injected markup stays escaped.
  assert.deepEqual(html.match(/<img[^>]*>/g), ['<img src="https://hr.example.invalid/image/logo.png" width="66" height="78" alt="GESIT" style="display:block;border:0;outline:none;text-decoration:none;">']);
  assert.equal(html.includes('<img src=x'), false);
  assert.equal(html.includes('action=approve'), false);
  assert.throws(() => renderEmail({ ...envelope, recipient_email: 'safe@example.invalid\r\nBcc: other@example.invalid' }, 'https://hr.example.invalid'), /INVALID_RECIPIENT_EMAIL/);
  assert.throws(() => renderEmail(envelope, 'http://hr.example.invalid'), /INVALID_HR_APP_URL/);
  assert.throws(() => renderEmail({ ...envelope, state: 'cancelled' }, 'https://hr.example.invalid'), /INVALID_EMAIL_STATE/);
});

test('final approval/rejection mail labels and absence links are correct', () => {
  for (const table of ['leave_requests', 'attendance_requests', 'attendance_correction_requests']) {
    for (const state of ['approved', 'rejected']) {
      const { text, html } = decodeMail(renderEmail({ ...envelope, request_table: table, state, level: null, start_date: '2027-01-04', end_date: null }, 'https://hr.example.invalid'));
      assert.match(text, state === 'approved' ? /telah disetujui/ : /telah ditolak/);
      assert.equal(text.includes('tahap null'), false);
      assert.match(html, table === 'leave_requests' ? /\/requests"/ : /\/attendance\/requests"/);
    }
  }
});

test('Gmail transient/network failures retry; bad requests and permission errors do not', async () => {
  for (const [status, retryable] of [[429, true], [500, true], [400, false], [403, false], [401, false]]) {
    await assert.rejects(sendGmail('TEST-token', 'TEST-raw', async () => Response.json({ error: {} }, { status })), error => error.retryable === retryable && error.message === `GMAIL_SEND_HTTP_${status}`);
  }
  await assert.rejects(sendGmail('TEST-token', 'TEST-raw', async () => Response.json({ error: { errors: [{ reason: 'userRateLimitExceeded' }] } }, { status: 403 })), error => error.retryable === true);
  await assert.rejects(sendGmail('TEST-token', 'TEST-raw', async () => { throw new Error('TEST-network-secret'); }), error => error.retryable === true && error.message === 'GOOGLE_NETWORK_ERROR');
});

test('failed send is not marked sent; database acknowledgement failure is not reclassified', async t => {
  t.mock.method(console, 'error', () => {});
  const retry = fixture({ fetcher: async url => url.includes('/token') ? Response.json({ access_token: 'TEST-access' })
    : url.includes('/userinfo') ? Response.json({ email: HR_SENDER, email_verified: true })
    : Response.json({}, { status: 429 }) });
  assert.equal((await (await retry.handle(request())).json()).failed, 1);
  assert.deepEqual(retry.calls.finish[0].result, { error: 'GMAIL_SEND_HTTP_429', retryable: true });
  const ack = fixture({ store: { async finish(_job, result) { assert.ok(result.messageId); throw new Error('TEST-db-error'); } } });
  const response = await ack.handle(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'EMAIL_QUEUE_UPDATE_FAILED' });
});

test('waits for all claimed jobs even if one database operation fails', async t => {
  t.mock.method(console, 'error', () => {});
  let finished = false;
  const secondJob = { ...job, id: '22222222-2222-4222-8222-222222222222' };
  const { handle } = fixture({ store: {
    async claim() { return [job, secondJob]; },
    async prepare(current) {
      if (current.id === job.id) throw new Error('TEST-prepare-failure');
      await new Promise(resolve => setTimeout(resolve, 20));
      return { ...envelope, id: current.id };
    },
    async finish() { finished = true; },
  } });
  assert.equal((await handle(request())).status, 503);
  assert.equal(finished, true);
});

test('invalid configuration fails closed without invoking Gmail', async t => {
  t.mock.method(console, 'error', () => {});
  const { handle, calls } = fixture({ options: { appUrl: 'http://localhost:3000' } });
  assert.equal((await handle(request())).status, 503);
  assert.equal(calls.http.length, 0);
});

test('emailed leave approvals link to a signed confirmation page, attendance stays in the app', async () => {
  const actionBaseUrl = 'https://project.supabase.co/functions/v1/send-workforce-emails';
  const { handle, calls } = fixture({
    options: { actionBaseUrl },
    store: { async prepare() { return { ...envelope, recipient_id: '77' }; } },
  });
  assert.equal((await handle(request())).status, 200);
  const send = calls.http.find(call => call.url.includes('/messages/send'));
  const { html, text } = decodeMail(JSON.parse(send.init.body).raw);
  const links = [...html.matchAll(/href="(https:\/\/project\.supabase\.co[^"]+)"/g)].map(match => match[1]);
  assert.equal(links.length, 2);
  const token = new URL(links[0]).searchParams.get('t');
  assert.ok(token);
  const payload = await verifyActionToken(token, secret);
  assert.deepEqual(payload, {
    event: job.id, table: 'leave_requests', request: envelope.request_id,
    state: envelope.state, approver: '77', exp: payload.exp,
  });
  assert.ok(payload.exp > Date.now() / 1000);
  assert.match(text, /Setujui atau tolak melalui tautan berikut/);
  assert.match(text, /tidak dapat dipakai ulang/);

  // Tampering, another secret and expiry all invalidate the link.
  assert.equal(await verifyActionToken(token.slice(0, -2), secret), null);
  assert.equal(await verifyActionToken(token, `${secret}-other`), null);
  const expired = await signActionToken({ ...payload, exp: 1 }, secret);
  assert.equal(await verifyActionToken(expired, secret), null);

  const attendance = fixture({
    options: { actionBaseUrl },
    store: { async prepare() { return { ...envelope, request_table: 'attendance_requests', recipient_id: '77' }; } },
  });
  await attendance.handle(request());
  const attendanceSend = attendance.calls.http.find(call => call.url.includes('/messages/send'));
  const attendanceMail = decodeMail(JSON.parse(attendanceSend.init.body).raw);
  assert.equal(attendanceMail.html.includes('project.supabase.co'), false);
  assert.match(attendanceMail.html, /approvals/);

  const final = fixture({
    options: { actionBaseUrl },
    store: { async prepare() { return { ...envelope, state: 'approved', level: null, recipient_id: '1' }; } },
  });
  await final.handle(request());
  const finalSend = final.calls.http.find(call => call.url.includes('/messages/send'));
  assert.equal(decodeMail(JSON.parse(finalSend.init.body).raw).html.includes('project.supabase.co'), false);
});
