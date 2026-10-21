import { authorizeGmail, EmailError, renderEmail, sendGmail, signActionToken } from './email.ts';
import type { EmailEnvelope, GmailCredentials } from './email.ts';

export interface EmailJob { id: string; lease_token: string }

export interface EmailStore {
  enabled(): Promise<boolean>;
  claim(): Promise<EmailJob[]>;
  prepare(job: EmailJob): Promise<EmailEnvelope | null>;
  finish(job: EmailJob, result: { messageId?: string; error?: string; retryable?: boolean }): Promise<void>;
}

interface WorkerOptions {
  secret: string;
  appUrl: string;
  actionBaseUrl?: string;
  actionTtlSeconds?: number;
  credentials: GmailCredentials;
  store: EmailStore;
  fetcher?: typeof fetch;
}

async function buildActionUrls(
  envelope: EmailEnvelope,
  secret: string,
  baseUrl: string | undefined,
  ttlSeconds: number,
): Promise<{ approve: string; reject: string } | undefined> {
  // Attendance requests still require the application UI.
  if (!baseUrl || envelope.request_table !== 'leave_requests') return undefined;
  if (!envelope.recipient_id || !/^pending_level_[1-4]$/.test(envelope.state)) return undefined;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const link = async (action: 'approve' | 'reject') => {
    const token = await signActionToken({
      event: envelope.id,
      table: envelope.request_table,
      request: envelope.request_id,
      state: envelope.state,
      approver: envelope.recipient_id!,
      action,
      exp: expires,
    }, secret);
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${encodeURIComponent(token)}`;
  };
  return { approve: await link('approve'), reject: await link('reject') };
}

const respond = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function authorized(request: Request, secret: string): boolean {
  const provided = request.headers.get('x-email-worker-secret') || '';
  if (secret.length < 32 || provided.length !== secret.length) return false;
  let difference = 0;
  for (let i = 0; i < secret.length; i++) difference |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  return difference === 0;
}

export function createEmailWorker({
  secret, appUrl, actionBaseUrl, actionTtlSeconds = 3 * 24 * 60 * 60, credentials, store, fetcher = fetch,
}: WorkerOptions) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
    if (!authorized(request, secret)) return respond({ error: 'Unauthorized' }, 401);
    try {
      const url = new URL(appUrl);
      if (url.protocol !== 'https:' || url.username || url.password || !credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
        throw new EmailError('HR_EMAIL_CONFIGURATION_MISSING_OR_INVALID');
      }
      if (!await store.enabled()) return respond({ enabled: false, sent: 0 });
      // Validate HR OAuth before leasing jobs, so credential failures cannot exhaust retries.
      const token = await authorizeGmail(credentials, fetcher);
      const jobs = await store.claim();
      const completed = await Promise.allSettled(jobs.map(async job => {
        const envelope = await store.prepare(job);
        if (!envelope) return 'skipped';
        let messageId: string;
        try {
          const actionUrls = await buildActionUrls(envelope, secret, actionBaseUrl, actionTtlSeconds);
          messageId = await sendGmail(token, renderEmail(envelope, appUrl, { actionUrls }), fetcher);
        } catch (error) {
          const failure = error instanceof EmailError ? error : new EmailError('EMAIL_DELIVERY_ERROR', true);
          await store.finish(job, { error: failure.message, retryable: failure.retryable });
          console.error('Workforce email delivery failed', { id: job.id, code: failure.message });
          return 'failed';
        }
        // An acknowledgement failure must not be mistaken for a Gmail failure.
        await store.finish(job, { messageId });
        return 'sent';
      }));
      if (completed.some(result => result.status === 'rejected')) throw new EmailError('EMAIL_QUEUE_UPDATE_FAILED');
      const outcomes = completed.map(result => result.status === 'fulfilled' ? result.value : 'failed');
      return respond({ enabled: true, claimed: jobs.length, sent: outcomes.filter(result => result === 'sent').length, failed: outcomes.filter(result => result === 'failed').length, skipped: outcomes.filter(result => result === 'skipped').length });
    } catch (error) {
      const code = error instanceof EmailError ? error.message : 'EMAIL_WORKER_ERROR';
      console.error('Workforce email worker failed', { code });
      return respond({ error: code }, 503);
    }
  };
}
