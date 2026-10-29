import { HR_SENDER, verifyActionToken } from './email.ts';
import type { EmailActionToken } from './email.ts';

interface RequestRow {
  id: string;
  user_id: string | number;
  leave_type?: string | null;
  type?: string | null;
  start_date: string | null;
  end_date: string | null;
  request_date?: string | null;
  total_days: number | string | null;
  reason: string | null;
  status: string | null;
  approval_status: string | null;
  current_approval_level: number | null;
}

interface SingleResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface FilterBuilder<T> {
  eq(column: string, value: unknown): FilterBuilder<T>;
  maybeSingle(): PromiseLike<SingleResult<T>>;
}

interface QueryBuilder {
  select<T>(columns: string): FilterBuilder<T>;
}

/** Surface of the Supabase client used by the confirmation page. */
export interface ActionDatabase {
  from(table: string): QueryBuilder;
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: RpcFailure | null }>;
}

interface ActionOptions {
  secret: string;
  appUrl: string;
  database: ActionDatabase;
}

interface RpcFailure {
  message?: string;
  code?: string;
}

function errorMessage(code: string): string {
  if (code.includes('REQUEST_STATE_CHANGED') || code.includes('REQUEST_ALREADY_REVIEWED')) {
    return 'Pengajuan ini sudah diproses atau tahapnya sudah berubah. Buka aplikasi untuk melihat status terbaru.';
  }
  if (code.includes('NOT_DESIGNATED_APPROVER') || code.includes('CANNOT_REVIEW_OWN_REQUEST')) {
    return 'Anda bukan approver aktif untuk tahap ini, jadi keputusan tidak dapat dilakukan dari tautan ini.';
  }
  if (code.includes('INSUFFICIENT_LEAVE_BALANCE') || code.includes('LEAVE_BALANCE_PERIOD_NOT_FOUND')) {
    return 'Saldo cuti karyawan tidak mencukupi atau periode saldo belum diatur. Hubungi HR.';
  }
  if (code.includes('APPROVER_NOT_ACTIVE')) return 'Akun approver tidak aktif.';
  if (code.includes('INVALID_DECISION')) return 'Pilihan keputusan tidak dikenali.';
  return 'Keputusan gagal disimpan. Buka aplikasi untuk memproses pengajuan ini.';
}

/**
 * The page itself lives on the HR app domain: Supabase serves function HTML as
 * text/plain, so this endpoint only exchanges JSON with that page.
 */
export function createEmailAction({ secret, appUrl, database }: ActionOptions) {
  const origin = new URL(appUrl).origin;
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };

  const reply = (body: unknown, status = 200): Response => Response.json(body, {
    status,
    headers: { ...cors, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' },
  });

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const token = new URL(request.url).searchParams.get('t') || '';
    const payload: EmailActionToken | null = await verifyActionToken(token, secret).catch(() => null);
    if (!payload || (payload.table !== 'leave_requests' && payload.table !== 'attendance_requests')) {
      return reply({ error: 'INVALID_TOKEN', message: 'Tautan ini tidak valid atau sudah kedaluwarsa.' }, 400);
    }

    const selectCols = payload.table === 'attendance_requests'
      ? 'id,user_id,type,start_date,end_date,request_date,total_days,reason,status,approval_status,current_approval_level'
      : 'id,user_id,leave_type,start_date,end_date,total_days,reason,status,approval_status,current_approval_level';

    const { data: row } = await database.from(payload.table)
      .select<RequestRow>(selectCols)
      .eq('id', payload.request).maybeSingle();
    if (!row) {
      return reply({ error: 'REQUEST_NOT_FOUND', message: 'Pengajuan sudah dihapus atau tidak tersedia.' }, 404);
    }
    const { data: liveState } = await database.rpc('workforce_email_state', { p_row: row });
    if (typeof liveState !== 'string' || liveState !== payload.state) {
      return reply({ error: 'ALREADY_PROCESSED', message: 'Pengajuan ini sudah diproses atau tahapnya sudah berubah, sehingga tautan email tidak berlaku lagi.' }, 409);
    }

    if (request.method === 'POST') {
      let choice = '';
      try {
        const body = await request.json() as { action?: unknown };
        choice = String(body?.action || '');
      } catch {
        return reply({ error: 'INVALID_ACTION', message: 'Pilihan keputusan tidak dikenali.' }, 400);
      }
      if (!choice || choice !== payload.action) {
        return reply({ error: 'INVALID_ACTION', message: 'Pilihan keputusan tidak cocok dengan tautan ini.' }, 400);
      }
      const decision = choice === 'approve' ? 'approved' : 'rejected';
      const rpcName = payload.table === 'attendance_requests' ? 'decide_attendance_via_email' : 'decide_leave_via_email';
      const { error } = await database.rpc(rpcName, {
        p_request_id: payload.request,
        p_approver_id: payload.approver,
        p_expected_state: payload.state,
        p_decision: decision,
      });
      if (error) {
        console.error(`${rpcName} failed`, { request: payload.request, code: error.code, message: error.message, details: (error as { details?: string }).details });
        return reply({ error: 'DECISION_FAILED', code: error.code || '', detail: (error.message || '').slice(0, 300), message: errorMessage(error.message || '') }, 409);
      }
      return reply({ decision });
    }

    if (request.method !== 'GET') {
      return reply({ error: 'METHOD_NOT_ALLOWED', message: 'Gunakan halaman konfirmasi untuk mengambil keputusan.' }, 405);
    }

    const { data: requester } = await database.from('user_accounts').select<{ full_name: string | null }>('full_name').eq('id', row.user_id).maybeSingle();
    const { data: approver } = await database.from('user_accounts').select<{ full_name: string | null }>('full_name').eq('id', payload.approver).maybeSingle();

    return reply({
      request: {
        table: payload.table,
        requester_name: String(requester?.full_name || 'Karyawan'),
        approver_name: String(approver?.full_name || 'Approver'),
        leave_type: payload.table === 'attendance_requests' ? 'Presensi di Luar Radius' : String(row.leave_type || ''),
        start_date: row.start_date || row.request_date || null,
        end_date: row.end_date || row.request_date || null,
        total_days: row.total_days || 1,
        reason: row.reason,
        level: Number(payload.state.slice(-1)),
        action: payload.action,
        sender: HR_SENDER,
      },
    });
  };
}
