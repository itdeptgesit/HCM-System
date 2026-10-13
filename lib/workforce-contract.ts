export interface ApprovalAccount {
  id?: string | number;
  role?: string;
  groups?: string[];
  supervisor_id?: string | number | null;
  manager_id?: string | number | null;
  vp_id?: string | number | null;
  attendance_supervisor_id?: string | number | null;
  attendance_hr_id?: string | number | null;
  attendance_manager_id?: string | number | null;
  attendance_vp_id?: string | number | null;
}

export interface ApprovalRequest {
  user_id?: string | number;
  status?: string | null;
  approval_status?: string | null;
  current_approval_level?: number | null;
}

export function isHRAccount(account?: ApprovalAccount | null): boolean {
  const role = String(account?.role || '').trim().toLowerCase();
  return ['admin', 'super admin', 'super_admin', 'hr', 'hr manager', 'hr staff', 'office_management'].includes(role)
    || (account?.groups || []).some(group => ['hr', 'hrd', 'it_management', 'csl_admin'].includes(group.toLowerCase().trim()));
}

export function isAdminAccount(account?: ApprovalAccount | null): boolean {
  return ['admin', 'super admin', 'super_admin'].includes(String(account?.role || '').trim().toLowerCase());
}

export function approvalChain(account?: ApprovalAccount | null) {
  const detailed = !!(account?.attendance_hr_id || account?.attendance_manager_id || account?.attendance_vp_id);
  return (detailed ? [
    { level: 1, id: account?.attendance_supervisor_id || account?.supervisor_id },
    { level: 2, id: account?.attendance_hr_id },
    { level: 3, id: account?.attendance_manager_id || account?.manager_id },
    { level: 4, id: account?.attendance_vp_id || account?.vp_id },
  ] : [
    { level: 1, id: account?.attendance_supervisor_id || account?.supervisor_id },
    { level: 2, id: account?.manager_id },
    { level: 3, id: account?.vp_id },
  ]).filter(slot => slot.id != null && String(slot.id) !== '');
}

export function resolveApprovalStatus(request: ApprovalRequest): string {
  const status = String(request.status || '').toLowerCase();
  if (['approved', 'rejected', 'cancelled', 'paid'].includes(status)) return status;
  const legacy: Record<string, string> = {
    pending_line_1: 'pending', pending_line_2: 'pending_level_2',
    pending_senior: 'pending_level_3', pending_office: 'pending_level_4',
  };
  if (legacy[status]) return legacy[status];
  const approval = String(request.approval_status || '').toLowerCase();
  return approval || status || 'pending';
}

export function requestApprovalLevel(request: ApprovalRequest): number {
  const status = resolveApprovalStatus(request);
  if (status === 'pending') return 1;
  return Number(status.match(/^pending_level_(\d)$/)?.[1] || request.current_approval_level || 0);
}

export function canReviewRequest(actor: ApprovalAccount | null | undefined, request: ApprovalRequest, requester?: ApprovalAccount): boolean {
  if (!actor?.id || String(actor.id) === String(request.user_id)) return false;
  if (!resolveApprovalStatus(request).startsWith('pending')) return false;
  if (isAdminAccount(actor)) return true;
  const slot = approvalChain(requester).find(item => item.level === requestApprovalLevel(request));
  return !!slot && String(slot.id) === String(actor.id);
}

export function requestDisplayStatus(request: ApprovalRequest): string {
  const status = resolveApprovalStatus(request);
  return ({ pending_level_2: 'pending_line_2', pending_level_3: 'pending_senior', pending_level_4: 'pending_office' } as Record<string, string>)[status] || status;
}

export function jakartaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isActiveEmployee(account: { status?: string; employment_status?: string }): boolean {
  return !['inactive', 'resigned', 'terminated', 'suspended', 'nonaktif'].includes(String(account.employment_status || account.status || '').toLowerCase());
}
