import { escapeHtml, HR_SENDER, verifyActionToken } from './email.ts';
import type { EmailActionToken } from './email.ts';

interface LeaveRow {
  id: string;
  user_id: string | number;
  leave_type: string | null;
  start_date: string | null;
  end_date: string | null;
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

/** Surface of the Supabase client used by the action page. */
export interface ActionDatabase {
  from(table: string): QueryBuilder;
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string } | null }>;
}

interface ActionOptions {
  secret: string;
  appUrl: string;
  database: ActionDatabase;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const LEAVE_TYPES: Record<string, string> = {
  annual: 'Cuti Tahunan', sick: 'Cuti Sakit', personal: 'Cuti Pribadi',
  maternity: 'Cuti Melahirkan', unpaid: 'Cuti Tidak Berbayar',
  marriage_self: 'Cuti Menikah', marriage_child: 'Cuti Menikah Anak',
  circumcision_baptism: 'Cuti Khitanan / Baptisan Anak',
  family_bereavement: 'Cuti Keluarga Meninggal',
  wife_maternity: 'Cuti Istri Melahirkan / Keguguran',
};

function longDate(value?: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))));
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function page(title: string, body: string, logoUrl: string, status = 200): Response {
  const html = '<!doctype html><html lang="id"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">'
    + `<title>${escapeHtml(title)}</title></head>`
    + '<body style="margin:0;background:#f3f4f6;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827;">'
    + '<div style="max-width:560px;margin:0 auto;">'
    + `<img src="${escapeHtml(logoUrl)}" width="56" height="66" alt="GESIT" style="display:block;margin:0 0 20px 4px;border:0;">`
    + '<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;">'
    + `<h1 style="margin:0 0 20px;font-size:20px;line-height:28px;">${escapeHtml(title)}</h1>`
    + body
    + '</div>'
    + `<p style="margin:18px 4px 0;font-size:12px;line-height:18px;color:#6b7280;">Email otomatis dari ${escapeHtml(HR_SENDER)}. Jangan teruskan tautan ini karena dapat digunakan untuk mengambil keputusan.</p>`
    + '</div></body></html>';
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function detailRow(label: string, value: string): string {
  return '<tr>'
    + `<td style="padding:0 12px 12px 0;width:150px;vertical-align:top;font-size:14px;line-height:22px;font-weight:700;">${escapeHtml(label)}</td>`
    + `<td style="padding:0 0 12px;vertical-align:top;font-size:14px;line-height:22px;color:#374151;">${escapeHtml(value)}</td>`
    + '</tr>';
}

function errorMessage(code: string): string {
  if (code.includes('REQUEST_STATE_CHANGED') || code.includes('REQUEST_ALREADY_REVIEWED')) {
    return 'Pengajuan ini sudah diproses atau tahapnya sudah berubah. Silakan buka aplikasi untuk melihat status terbaru.';
  }
  if (code.includes('NOT_DESIGNATED_APPROVER') || code.includes('CANNOT_REVIEW_OWN_REQUEST')) {
    return 'Anda bukan approver aktif untuk tahap ini, jadi keputusan tidak dapat dilakukan dari tautan ini.';
  }
  if (code.includes('INSUFFICIENT_LEAVE_BALANCE') || code.includes('LEAVE_BALANCE_PERIOD_NOT_FOUND')) {
    return 'Saldo cuti karyawan tidak mencukupi atau periode saldo belum diatur. Hubungi HR.';
  }
  if (code.includes('APPROVER_NOT_ACTIVE')) {
    return 'Akun approver tidak aktif.';
  }
  return 'Keputusan gagal disimpan. Silakan buka aplikasi untuk memproses pengajuan ini.';
}

export function createEmailAction({ secret, appUrl, database }: ActionOptions) {
  return async (request: Request): Promise<Response> => {
    const base = new URL(appUrl);
    const logoUrl = new URL('/image/logo.png', base).href;
    const token = new URL(request.url).searchParams.get('t') || '';
    const appLink = `${new URL('/requests', base).href}`;
    const payload: EmailActionToken | null = await verifyActionToken(token, secret).catch(() => null);
    if (!payload || payload.table !== 'leave_requests') {
      return page('Tautan tidak berlaku', '<p style="margin:0;font-size:15px;line-height:24px;color:#374151;">Tautan ini tidak valid atau sudah kedaluwarsa. Buka pengajuan langsung dari aplikasi GESIT People.</p>', logoUrl, 400);
    }

    const { data: row } = await database.from('leave_requests')
      .select<LeaveRow>('id,user_id,leave_type,start_date,end_date,total_days,reason,status,approval_status,current_approval_level')
      .eq('id', payload.request).maybeSingle();
    if (!row) {
      return page('Pengajuan tidak ditemukan', '<p style="margin:0;font-size:15px;line-height:24px;color:#374151;">Pengajuan sudah dihapus atau tidak tersedia.</p>', logoUrl, 404);
    }
    const { data: liveState } = await database.rpc('workforce_email_state', { p_row: row });
    if (typeof liveState !== 'string' || liveState !== payload.state) {
      return page('Sudah diproses',
        '<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#374151;">Pengajuan ini sudah diproses atau tahapnya sudah berubah, sehingga tautan email tidak berlaku lagi.</p>'
        + `<p style="margin:0;font-size:14px;"><a href="${escapeHtml(appLink)}" style="color:#3b5bdb;">Buka GESIT People</a></p>`,
        logoUrl, 409);
    }

    const { data: requester } = await database.from('user_accounts').select<{ full_name: string | null }>('full_name').eq('id', row.user_id).maybeSingle();
    const { data: approver } = await database.from('user_accounts').select<{ full_name: string | null }>('full_name').eq('id', payload.approver).maybeSingle();
    const approverName = String(approver?.full_name || 'Approver');

    if (request.method === 'POST') {
      const form = await request.formData();
      const choice = String(form.get('action') || '');
      if (choice !== 'approve' && choice !== 'reject') {
        return page('Permintaan tidak valid', '<p style="margin:0;font-size:15px;color:#374151;">Pilihan keputusan tidak dikenali.</p>', logoUrl, 400);
      }
      const decision = choice === 'approve' ? 'approved' : 'rejected';
      const { error } = await database.rpc('decide_leave_via_email', {
        p_request_id: payload.request,
        p_approver_id: payload.approver,
        p_expected_state: payload.state,
        p_decision: decision,
      });
      if (error) {
        return page('Keputusan tidak dapat disimpan',
          `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#374151;">${escapeHtml(errorMessage(error.message || ''))}</p>`
          + `<p style="margin:0;font-size:14px;"><a href="${escapeHtml(appLink)}" style="color:#3b5bdb;">Buka GESIT People</a></p>`,
          logoUrl, 409);
      }
      return page(decision === 'approved' ? 'Cuti disetujui' : 'Cuti ditolak',
        `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#374151;">Keputusan Anda untuk pengajuan <strong>${escapeHtml(String(requester?.full_name || 'karyawan'))}</strong> sudah tercatat. Approver berikutnya dan karyawan akan menerima email sesuai alur persetujuan.</p>`
        + `<p style="margin:0;font-size:14px;"><a href="${escapeHtml(appLink)}" style="color:#3b5bdb;">Buka GESIT People</a></p>`,
        logoUrl);
    }

    if (request.method !== 'GET') {
      return page('Metode tidak didukung', '<p style="margin:0;font-size:15px;color:#374151;">Gunakan tombol pada halaman ini.</p>', logoUrl, 405);
    }

    const start = longDate(row.start_date);
    const end = longDate(row.end_date);
    const dates = start && end && start !== end ? `${start} – ${end}` : start;
    const days = Number(row.total_days || 0) > 0
      ? `${Number(row.total_days)} hari`
      : '';
    const details = [
      detailRow('Karyawan', String(requester?.full_name || 'Karyawan')),
      detailRow('Jenis cuti', LEAVE_TYPES[String(row.leave_type || '')] || String(row.leave_type || 'Cuti')),
      detailRow('Tanggal', dates),
      ...(days ? [detailRow('Durasi', days)] : []),
      ...(row.reason ? [detailRow('Alasan', String(row.reason))] : []),
      detailRow('Tahap', `Level ${payload.state.slice(-1)}`),
    ].join('');

    const body = '<p style="margin:0 0 8px;font-size:15px;line-height:24px;color:#374151;">Halo ' + escapeHtml(approverName) + ',</p>'
      + '<p style="margin:0 0 20px;font-size:15px;line-height:24px;color:#374151;">Konfirmasi keputusan Anda untuk pengajuan cuti berikut. Keputusan langsung tercatat setelah tombol ditekan.</p>'
      + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${details}</table>`
      + '<form method="post">'
      + '<button type="submit" name="action" value="approve" style="display:inline-block;margin:0 10px 10px 0;padding:12px 28px;border:1px solid #3b5bdb;border-radius:8px;background:#3b5bdb;color:#ffffff;font-size:14px;font-weight:700;cursor:pointer;">Setujui</button>'
      + '<button type="submit" name="action" value="reject" style="display:inline-block;margin:0 0 10px 0;padding:12px 28px;border:1px solid #d1d5db;border-radius:8px;background:#ffffff;color:#374151;font-size:14px;font-weight:700;cursor:pointer;">Tolak</button>'
      + '</form>'
      + '<p style="margin:18px 0 0;font-size:12px;line-height:18px;color:#6b7280;">Tautan ini hanya untuk tahap ini dan otomatis tidak berlaku setelah pengajuan diproses atau kedaluwarsa.</p>'
      + `<p style="margin:10px 0 0;font-size:13px;"><a href="${escapeHtml(appLink)}" style="color:#3b5bdb;">Lihat di aplikasi GESIT People</a></p>`;

    return page('Konfirmasi pengajuan cuti', body, logoUrl);
  };
}
