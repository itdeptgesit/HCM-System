export const HR_SENDER = 'hr-admin@gesit.co.id';

export interface EmailEnvelope {
  id: string;
  request_table: 'leave_requests' | 'attendance_correction_requests' | 'attendance_requests';
  request_id: string;
  state: string;
  level: number | null;
  recipient_email: string;
  recipient_name: string;
  requester_name: string;
  start_date: string | null;
  end_date: string | null;
  leave_type?: string | null;
  reason?: string | null;
  days?: number | string | null;
  balance_days?: number | string | null;
  recipient_id?: string | null;
}

export interface EmailActionToken {
  event: string;
  table: string;
  request: string;
  state: string;
  approver: string;
  action: 'approve' | 'reject';
  exp: number;
}

export interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export class EmailError extends Error {
  readonly retryable: boolean;
  constructor(code: string, retryable = false) {
    super(code);
    this.retryable = retryable;
  }
}

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signActionToken(token: EmailActionToken, secret: string): Promise<string> {
  if (secret.length < 32) throw new EmailError('ACTION_SECRET_TOO_SHORT');
  const body = base64Url(new TextEncoder().encode(JSON.stringify(token)));
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(body)));
  return `${body}.${base64Url(signature)}`;
}

export async function verifyActionToken(value: string, secret: string): Promise<EmailActionToken | null> {
  if (secret.length < 32 || typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const signature = fromBase64Url(parts[1]);
  if (!signature) return null;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(secret), signature, new TextEncoder().encode(parts[0]));
  if (!valid) return null;
  const decoded = fromBase64Url(parts[0]);
  if (!decoded) return null;
  let payload: Partial<EmailActionToken>;
  try {
    payload = JSON.parse(new TextDecoder().decode(decoded));
  } catch {
    return null;
  }
  if (typeof payload?.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
  const fields: Array<keyof EmailActionToken> = ['event', 'table', 'request', 'state', 'approver'];
  if (!fields.every(field => typeof payload[field] === 'string' && (payload[field] as string).length > 0)) return null;
  if (!/^[a-f0-9-]{36}$/i.test(payload.event as string)) return null;
  if (!/^pending_level_[1-4]$/.test(payload.state as string)) return null;
  if (payload.action !== 'approve' && payload.action !== 'reject') return null;
  return payload as EmailActionToken;
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const LEAVE_TYPE_LABELS: Record<string, string> = {
  annual: 'Cuti Tahunan',
  sick: 'Cuti Sakit',
  personal: 'Cuti Pribadi',
  maternity: 'Cuti Melahirkan',
  unpaid: 'Cuti Tidak Berbayar',
  marriage_self: 'Cuti Menikah',
  marriage_child: 'Cuti Menikah Anak',
  circumcision_baptism: 'Cuti Khitanan / Baptisan Anak',
  family_bereavement: 'Cuti Keluarga Meninggal',
  wife_maternity: 'Cuti Istri Melahirkan / Keguguran',
};

const REQUEST_KINDS = {
  leave_requests: { title: 'Pengajuan Cuti', noun: 'cuti', dateLabel: 'Tanggal cuti' },
  attendance_correction_requests: { title: 'Pengajuan Koreksi Absen', noun: 'koreksi absen', dateLabel: 'Tanggal absen' },
  attendance_requests: { title: 'Pengajuan Absen di Luar Lokasi', noun: 'absen di luar lokasi', dateLabel: 'Tanggal pengajuan' },
} as const;

function parseDate(value?: string | null): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))));
  return Number.isNaN(date.getTime()) ? null : date;
}

function displayDate(value?: string | null): string {
  const date = parseDate(value);
  if (!date) return '';
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function displayDays(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';
  return `${String(Number(numeric.toFixed(2))).replace('.', ',')} hari`;
}

function detailRow(label: string, value: string): string {
  const safe = escapeHtml(value).replace(/\r?\n/g, '<br>');
  return '<tr>'
    + '<td style="padding:0 16px 16px 0;width:170px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;font-weight:700;color:#111827;">' + escapeHtml(label) + '</td>'
    + '<td style="padding:0 0 16px;vertical-align:top;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;color:#374151;">' + safe + '</td>'
    + '</tr>';
}

function actionButton(href: string, label: string, primary: boolean): string {
  const style = primary
    ? 'background-color:#3b5bdb;border:1px solid #3b5bdb;color:#ffffff;'
    : 'background-color:#ffffff;border:1px solid #d1d5db;color:#374151;';
  return '<a href="' + escapeHtml(href) + '" style="display:inline-block;padding:12px 30px;border-radius:8px;'
    + 'font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:20px;text-decoration:none;'
    + style + '">' + escapeHtml(label) + '</a>';
}

export function renderEmail(
  envelope: EmailEnvelope,
  appUrl: string,
  options: { actionUrls?: { approve?: string; reject?: string } } = {},
): string {
  if (!/^[a-f0-9-]{36}$/i.test(envelope.id)) throw new EmailError('INVALID_EVENT_ID');
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(envelope.recipient_email)) {
    throw new EmailError('INVALID_RECIPIENT_EMAIL');
  }
  const base = new URL(appUrl);
  if (base.protocol !== 'https:' || base.username || base.password) throw new EmailError('INVALID_HR_APP_URL');
  const kind = REQUEST_KINDS[envelope.request_table];
  if (!kind) throw new EmailError('INVALID_REQUEST_TABLE');
  const pending = /^pending_level_[1-4]$/.test(envelope.state);
  if (!pending && !['approved', 'rejected'].includes(envelope.state)) throw new EmailError('INVALID_EMAIL_STATE');

  const result = pending ? 'menunggu persetujuan' : envelope.state === 'approved' ? 'disetujui' : 'ditolak';
  const resultLabel = envelope.state === 'approved' ? 'Disetujui' : 'Ditolak';
  const recipientName = envelope.recipient_name || 'Bapak/Ibu';
  const requesterName = envelope.requester_name || 'Rekan kerja';
  const subject = pending
    ? `[GESIT People] ${kind.title} menunggu persetujuan Anda (${requesterName})`
    : `[GESIT People] ${kind.title} ${resultLabel.toLowerCase()} (${requesterName})`;

  const linkPath = pending ? '/approvals' : envelope.request_table === 'leave_requests' ? '/requests' : '/attendance/requests';
  const url = new URL(linkPath, base).href;
  const logoUrl = new URL('/image/logo.png', base).href;

  const start = displayDate(envelope.start_date);
  const end = displayDate(envelope.end_date);
  const dates = start && end && start !== end ? `${start} – ${end}` : start;
  const days = displayDays(envelope.days);
  const balance = displayDays(envelope.balance_days);
  const leaveType = envelope.leave_type ? LEAVE_TYPE_LABELS[envelope.leave_type] || envelope.leave_type : '';
  const reason = (envelope.reason || '').trim();

  const details: Array<[string, string]> = [];
  if (envelope.request_table === 'leave_requests' && leaveType) details.push(['Jenis cuti', leaveType]);
  if (dates) details.push([kind.dateLabel, dates]);
  if (envelope.request_table === 'leave_requests' && days) details.push(['Durasi', days]);
  if (reason) details.push(['Alasan', reason]);
  if (envelope.request_table === 'leave_requests' && balance) details.push(['Sisa saldo cuti', balance]);

  const lead = pending
    ? `${requesterName} mengajukan ${kind.noun} dan menunggu persetujuan Anda${envelope.level ? ` pada tahap ${envelope.level}` : ''}.`
    : `Pengajuan ${kind.noun} dari ${requesterName} telah ${result}.`;
  const cardTitle = pending ? kind.title : `${kind.title.replace('Pengajuan ', '')} ${resultLabel}`;

  const text = [
    `Halo ${recipientName},`,
    '',
    lead,
    '',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    pending
      ? options.actionUrls
        ? [
            'Sekali klik untuk memutuskan langsung dari email:',
            `Setujui: ${options.actionUrls.approve || url}`,
            `Tolak: ${options.actionUrls.reject || url}`,
          ]
        : ['Setujui atau tolak melalui GESIT People (login diperlukan):', url]
      : ['Lihat pengajuan di GESIT People (login diperlukan):', url],
    '',
    `Nomor pengajuan: ${envelope.request_id}`,
    '',
    pending
      ? options.actionUrls
        ? 'Sekali klik, keputusan langsung tercatat dan tidak dapat dibatalkan dari email. Tautan hanya berlaku untuk tahap ini dan tidak dapat dipakai ulang.'
        : 'Tombol di email hanya membuka halaman persetujuan. Keputusan tercatat setelah Anda login dan mengonfirmasi di aplikasi.'
      : 'Email ini dikirim otomatis oleh HR. Keputusan tidak dapat diubah melalui email.',
    '',
    'Salam,',
    'Tim GESIT People',
  ].join('\n');

  const rowsHtml = details.map(([label, value]) => detailRow(label, value)).join('');
  const approveHref = options.actionUrls?.approve || url;
  const rejectHref = options.actionUrls?.reject || url;
  const actionsHtml = pending
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;"><tr>'
      + '<td style="padding:0 12px 0 0;">' + actionButton(approveHref, 'Setujui', true) + '</td>'
      + '<td>' + actionButton(rejectHref, 'Tolak', false) + '</td>'
      + '</tr></table>'
      + '<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">'
      + (options.actionUrls
        ? 'Sekali klik, keputusan langsung tercatat dan tidak dapat dibatalkan dari email. Tautan hanya berlaku untuk tahap ini dan tidak dapat dipakai ulang. Jangan teruskan email ini.'
        : 'Tombol di atas membuka halaman persetujuan di GESIT People. Keputusan hanya tercatat setelah Anda login dan mengonfirmasi di aplikasi.')
      + '</p>'
    : '';

  const html = '<!doctype html><html lang="id"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + escapeHtml(subject) + '</title></head>'
    + '<body style="margin:0;padding:0;background-color:#f3f4f6;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f4f6;padding:32px 16px;"><tr><td align="center">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">'
    + '<tr><td style="padding:0 0 24px 4px;">'
    + '<img src="' + escapeHtml(logoUrl) + '" width="66" height="78" alt="GESIT" style="display:block;border:0;outline:none;text-decoration:none;">'
    + '</td></tr>'
    + '<tr><td style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:36px 40px;">'
    + '<h1 style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:28px;font-weight:700;color:#111827;">' + escapeHtml(cardTitle) + '</h1>'
    + '<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#111827;">Halo ' + escapeHtml(recipientName) + ',</p>'
    + '<p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:24px;color:#374151;">' + escapeHtml(lead) + '</p>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rowsHtml + '</table>'
    + actionsHtml
    + '<p style="margin:28px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:22px;">'
    + '<a href="' + escapeHtml(url) + '" style="color:#3b5bdb;text-decoration:underline;">Lihat pengajuan di GESIT People</a></p>'
    + '<p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#6b7280;">Nomor pengajuan: ' + escapeHtml(envelope.request_id) + '</p>'
    + '</td></tr>'
    + '<tr><td style="padding:22px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;color:#6b7280;">'
    + '<p style="margin:0 0 4px;">Salam,</p>'
    + '<p style="margin:0 0 16px;font-weight:700;color:#374151;">Tim GESIT People</p>'
    + '<p style="margin:0;">Email otomatis dari ' + escapeHtml(HR_SENDER) + '. Mohon jangan membalas email ini; pertanyaan dapat disampaikan ke ' + escapeHtml(HR_SENDER) + '.</p>'
    + '</td></tr>'
    + '</table></td></tr></table></body></html>';

  const boundary = `gesit-${envelope.id}`;
  const encodedPart = (content: string) => base64(content).match(/.{1,76}/g)!.join('\r\n');
  const message = [
    `From: GESIT HR <${HR_SENDER}>`,
    `To: ${envelope.recipient_email}`,
    `Reply-To: ${HR_SENDER}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <workforce-${envelope.id}@gesit.co.id>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', encodedPart(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '', encodedPart(html),
    `--${boundary}--`, '',
  ].join('\r\n');
  return base64(message).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function googleRequest(fetcher: typeof fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetcher(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new EmailError('GOOGLE_NETWORK_ERROR', true);
  }
}

export async function authorizeGmail(credentials: GmailCredentials, fetcher: typeof fetch = fetch): Promise<string> {
  const tokenResponse = await googleRequest(fetcher, 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: credentials.clientId, client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken, grant_type: 'refresh_token',
    }),
  });
  if (!tokenResponse.ok) throw new EmailError(`GMAIL_OAUTH_HTTP_${tokenResponse.status}`);
  const token = await tokenResponse.json();
  if (!token.access_token) throw new EmailError('GMAIL_ACCESS_TOKEN_MISSING');
  // A Drive service account or an IT account must never silently send as HR.
  const identityResponse = await googleRequest(fetcher, 'https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!identityResponse.ok) throw new EmailError(`GMAIL_IDENTITY_HTTP_${identityResponse.status}`);
  const identity = await identityResponse.json();
  if (identity.email?.toLowerCase() !== HR_SENDER || identity.email_verified !== true) {
    throw new EmailError('GMAIL_ACCOUNT_IS_NOT_HR');
  }
  return token.access_token;
}

export async function sendGmail(accessToken: string, raw: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await googleRequest(fetcher, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    const rateLimited = detail.error?.errors?.some((error: { reason: string }) => ['rateLimitExceeded', 'userRateLimitExceeded'].includes(error.reason));
    throw new EmailError(`GMAIL_SEND_HTTP_${response.status}`, response.status === 429 || response.status >= 500 || !!rateLimited);
  }
  const message = await response.json();
  if (!message.id) throw new EmailError('GMAIL_MESSAGE_ID_MISSING', true);
  return message.id;
}
