import { createClient } from 'npm:@supabase/supabase-js@2';
import { createEmailWorker } from './worker.ts';
import type { EmailEnvelope } from './email.ts';
import type { EmailStore } from './worker.ts';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20_000) }) },
});

const store: EmailStore = {
  async enabled() {
    const { data, error } = await client.from('workforce_email_settings').select('enabled').eq('id', true).single();
    if (error) throw error;
    return data.enabled;
  },
  async claim() {
    const { data, error } = await client.rpc('claim_workforce_emails', { p_limit: 5 });
    if (error) throw error;
    return data || [];
  },
  async prepare(job) {
    const { data, error } = await client.rpc('prepare_workforce_email', { p_id: job.id, p_lease_token: job.lease_token });
    if (error) throw error;
    return data as EmailEnvelope | null;
  },
  async finish(job, result) {
    const { data, error } = await client.rpc('finish_workforce_email', {
      p_id: job.id, p_lease_token: job.lease_token,
      p_provider_message_id: result.messageId || null, p_error: result.error || null, p_retryable: result.retryable || false,
    });
    if (error) throw error;
    if (data !== true) throw new Error('EMAIL_LEASE_LOST');
  },
};

Deno.serve(createEmailWorker({
  secret: Deno.env.get('HR_EMAIL_WORKER_SECRET') || '',
  appUrl: Deno.env.get('HR_APP_URL') || '',
  credentials: {
    clientId: Deno.env.get('GMAIL_OAUTH_CLIENT_ID') || '',
    clientSecret: Deno.env.get('GMAIL_OAUTH_CLIENT_SECRET') || '',
    refreshToken: Deno.env.get('GMAIL_OAUTH_REFRESH_TOKEN') || '',
  },
  store,
}));
