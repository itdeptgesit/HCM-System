import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return respond({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gdriveWebhookUrl = Deno.env.get('GDRIVE_UPLOAD_WEBHOOK_URL') || '';

    // 1. Verifikasi Sesi Caller via Supabase Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return respond({ error: 'Authentication required' }, 401);
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user?.email) {
      return respond({ error: 'Invalid or expired session' }, 401);
    }

    // 2. Ambil Profil Terverifikasi dari user_accounts (Bypass RLS dengan Service Role)
    const adminClient = createClient(supabaseUrl, supabaseServiceRole, {
      auth: { persistSession: false },
    });

    const { data: callerAccount, error: accountError } = await adminClient
      .from('user_accounts')
      .select('id, email, full_name, role, groups, status')
      .ilike('email', user.email)
      .maybeSingle();

    if (accountError || !callerAccount) {
      return respond({ error: 'Account profile not found in HCM' }, 403);
    }

    // Periksa status karyawan aktif
    const callerStatus = String(callerAccount.status || '').toLowerCase();
    if (callerStatus !== 'active' && callerStatus !== 'on leave') {
      return respond({ error: 'Your account is inactive. Document access denied.' }, 403);
    }

    const callerRole = String(callerAccount.role || '').toLowerCase();
    const callerGroups = callerAccount.groups || [];
    const isHR = ['super admin', 'admin', 'hr manager', 'hr staff', 'super_admin'].includes(callerRole) ||
                 callerGroups.some((g: string) => ['hr', 'hrd', 'admin'].includes(g.toLowerCase()));

    const body = await request.json();
    const action = String(body.action || 'upload');

    // 3. ACTION: UPLOAD DOKUMEN
    if (action === 'upload') {
      const category = String(body.category || 'sk_karyawan');
      const targetEmployeeId = body.employeeId ? Number(body.employeeId) : null;
      const fileName = String(body.fileName || 'document.pdf');
      const mimeType = String(body.mimeType || 'application/pdf');
      const base64Data = String(body.base64 || '');
      const visibility = String(body.visibility || (['news_attachment', 'news_image', 'sk_perusahaan'].includes(category) ? 'all_active' : 'private'));
      const notes = body.notes ? String(body.notes) : null;

      if (!base64Data) {
        return respond({ error: 'No file data received' }, 400);
      }

      // Validasi kewenangan
      if (['sk_perusahaan', 'internal_hr', 'news_attachment', 'news_image'].includes(category) && !isHR) {
        return respond({ error: 'Only HR administrators can upload company/news documents' }, 403);
      }

      // Jika dokumen pribadi, pastikan hanya HR atau pemilik dokumen itu sendiri
      let targetEmail = '';
      if (['ktp', 'ijazah', 'sk_karyawan', 'bpjs', 'foto_profil'].includes(category)) {
        if (!isHR && callerAccount.id !== targetEmployeeId) {
          return respond({ error: 'You are only authorized to upload your own personal documents' }, 403);
        }

        // Ambil email terverifikasi milik target employee
        if (targetEmployeeId) {
          const { data: targetEmp } = await adminClient
            .from('user_accounts')
            .select('email, full_name, employee_code')
            .eq('id', targetEmployeeId)
            .maybeSingle();

          if (targetEmp?.email) {
            targetEmail = targetEmp.email.toLowerCase();
          }
        } else {
          targetEmail = callerAccount.email.toLowerCase();
        }
      }

      // Upload ke Google Drive via Webhook
      let driveResult = { fileId: `gdrive-${Date.now()}`, fileUrl: '', downloadUrl: '', folderId: '' };
      if (gdriveWebhookUrl) {
        const driveRes = await fetch(gdriveWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'upload',
            fileName,
            mimeType,
            base64: base64Data,
            category,
            visibility,
            targetEmail,
            employeeId: targetEmployeeId,
          }),
        });

        if (driveRes.ok) {
          const driveJson = await driveRes.json();
          if (driveJson.success) {
            driveResult = {
              fileId: driveJson.fileId,
              fileUrl: driveJson.fileUrl || driveJson.webViewLink,
              downloadUrl: driveJson.downloadUrl || '',
              folderId: driveJson.folderId || '',
            };
          }
        }
      }

      // Simpan metadata ke Supabase hcm_documents
      const docPayload = {
        employee_id: targetEmployeeId,
        uploader_id: callerAccount.id,
        gdrive_file_id: driveResult.fileId,
        gdrive_web_view_link: driveResult.fileUrl || 'https://drive.google.com',
        gdrive_download_link: driveResult.downloadUrl || null,
        folder_id: driveResult.folderId || null,
        file_name: fileName,
        mime_type: mimeType,
        file_size: Number(body.fileSize || 0),
        category,
        visibility,
        status: 'published',
        target_email: targetEmail || null,
        permissions_metadata: targetEmail ? [{ email: targetEmail, role: 'reader' }] : [],
        notes,
      };

      const { data: docRecord, error: docError } = await adminClient
        .from('hcm_documents')
        .insert([docPayload])
        .select('*')
        .single();

      if (docError) {
        throw docError;
      }

      // Catat log aktivitas
      await adminClient.from('user_activity_logs').insert([
        {
          user_name: callerAccount.full_name,
          user_role: callerAccount.role,
          action: 'Upload Dokumen',
          module: 'HCM Drive Backend',
          details: `Upload ${fileName} (${category}, visibilitas: ${visibility}) ke Google Drive`,
          created_at: new Date().toISOString(),
        },
      ]);

      return respond({ success: true, document: docRecord });
    }

    return respond({ error: 'Unknown action' }, 400);
  } catch (error) {
    return respond({ error: error instanceof Error ? error.message : 'Internal Server Error' }, 500);
  }
});
