import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const authorization = request.headers.get('Authorization');
    if (!authorization) return respond({ error: 'Authentication required' }, 401);
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user?.email) return respond({ error: 'Invalid session' }, 401);
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: actor, error: actorError } = await admin.from('user_accounts').select('role,groups,status').ilike('email', user.email).maybeSingle();
    if (actorError) throw actorError;
    const authorized = actor && ['active', 'on leave'].includes(String(actor.status).toLowerCase())
      && (['admin', 'super admin', 'super_admin', 'hr', 'hr manager', 'hr staff'].includes(String(actor.role).toLowerCase()) || actor.groups?.some((group: string) => ['hr', 'hrd'].includes(group)));
    if (!authorized) return respond({ error: 'HR or administrator access required' }, 403);
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email.includes('@') || password.length < 6) return respond({ error: 'Valid email and password of at least 6 characters are required' }, 400);
    let query = admin.from('user_accounts').select('id,email,auth_id');
    query = body.existingId ? query.eq('id', body.existingId) : query.ilike('email', email);
    const { data: profile, error: profileError } = await query.maybeSingle();
    if (profileError) throw profileError;
    let authId = profile?.auth_id;
    if (!authId) {
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        authId = data.users.find(account => account.email?.toLowerCase() === email)?.id;
        if (authId || data.users.length < 1000) break;
      }
    }
    const metadata = { full_name: String(body.fullName || email) };
    const result = authId
      ? await admin.auth.admin.updateUserById(authId, { email, password, user_metadata: metadata })
      : await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
    if (result.error) throw result.error;
    if (profile) {
      const { error } = await admin.from('user_accounts').update({ auth_id: result.data.user.id }).eq('id', profile.id);
      if (error) throw error;
    }
    return respond({ id: result.data.user.id });
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Unable to save Auth account' }, 400);
  }
});
