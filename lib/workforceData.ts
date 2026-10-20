import { supabase } from './supabaseClient';
import { isActiveEmployee, isEmployeeAccount, requestDisplayStatus } from './workforce-contract';

export async function loadCurrentHRUser() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const authUser = sessionData.session?.user;
  if (!authUser?.email) return null;
  const { data: account, error } = await supabase.from('user_accounts').select('*').ilike('email', authUser.email).maybeSingle();
  if (error) throw error;
  if (!account) throw new Error('Profil karyawan belum terdaftar di user_accounts. Hubungi administrator.');
  if (!isActiveEmployee(account) || ['inactive', 'suspended'].includes(String(account.status).toLowerCase())) throw new Error('Akun karyawan tidak aktif.');
  return {
    ...account, id: String(account.id), authId: authUser.id, fullName: account.full_name,
    employeeId: account.employee_code || '', jobTitle: account.job_title || '', avatarUrl: account.avatar_url || '',
    groups: account.groups || [],
  };
}

export async function fetchAllRows(query: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>): Promise<any[]> {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

export function loadWorkforceAccounts({ includeSystemAccounts = false } = {}) {
  return fetchAllRows((from, to) => supabase.from('user_accounts').select('*').order('id').range(from, to))
    .then(rows => rows.filter(row => includeSystemAccounts || isEmployeeAccount(row))
      .map(row => ({ ...row, id: String(row.id), status: row.employment_status || row.status })));
}

export function normalizeRequest<T extends { status?: string; approval_status?: string }>(row: T): T {
  return { ...row, status: requestDisplayStatus(row) };
}

export function normalizeAttendance(row: any) {
  const aliases: Record<string, string> = { 'on leave': 'leave', 'half day': 'half_day', sick: 'sick', permission: 'permission' };
  const raw = String(row.status || 'present').toLowerCase();
  const cin = row.clock_in || row.check_in_time || null;
  const cout = row.clock_out || row.check_out_time || null;

  let workMins = Number(row.total_work_minutes ?? row.work_duration_minutes ?? 0);
  // Auto-calculate if 0 or null but both cin and cout exist
  if ((!workMins || workMins <= 0) && cin && cout) {
    const diff = (new Date(cout).getTime() - new Date(cin).getTime()) / 60000;
    if (diff > 0) {
      workMins = Math.round(diff);
    }
  }
  // Sanity check: cap extreme runaway checkouts (>14 hours / 840 mins) to standard shift
  if (workMins > 840) {
    workMins = 540; // 9 hours
  }

  return {
    ...row, user_id: String(row.user_id), status: aliases[raw] || raw,
    clock_in: cin,
    clock_out: cout,
    total_work_minutes: workMins,
    total_overtime_minutes: Number(row.total_overtime_minutes ?? 0),
    clock_in_lat: row.clock_in_lat ?? row.check_in_lat ?? null,
    clock_in_lng: row.clock_in_lng ?? row.check_in_lng ?? null,
    clock_out_lat: row.clock_out_lat ?? row.check_out_lat ?? null,
    clock_out_lng: row.clock_out_lng ?? row.check_out_lng ?? null,
    photo_url: row.photo_url || row.check_in_photo_url || null,
  };
}

export async function reviewWorkforceRequest(
  type: 'leave' | 'overtime' | 'reimbursement',
  id: string | number,
  decision: 'approved' | 'rejected' | 'paid',
  note?: string,
  customPayload?: Record<string, any>
) {
  try {
    const { data, error } = await supabase.rpc('review_workforce_request', {
      p_request_type: type, p_request_id: id, p_decision: decision, p_notes: note || null,
    });
    if (!error) return data;
    console.warn('RPC review_workforce_request failed, falling back to direct update:', error);
  } catch (e) {
    console.warn('RPC review_workforce_request exception, falling back to direct update:', e);
  }

  const table = type === 'leave' ? 'leave_requests' : type === 'overtime' ? 'overtime_requests' : 'reimbursements';
  const updatePayload: Record<string, any> = {
    status: decision,
    approval_status: decision,
    updated_at: new Date().toISOString(),
    ...(customPayload || {}),
  };
  if (decision === 'rejected' && note) {
    updatePayload.rejection_reason = note;
  }
  const { data, error } = await supabase.from(table).update(updatePayload).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}
