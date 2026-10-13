import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Calendar, Clock, Timer, Wallet, FileText, CheckCircle2, XCircle,
  Filter, Search, RefreshCw, Eye, Check, X, Building2, User, ChevronRight,
  Stethoscope, Gift, Receipt, AlertCircle, AlertTriangle, RotateCcw, Briefcase,
  BookOpen, ShieldCheck, Info, Sparkles, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { fetchAllRows, loadWorkforceAccounts, normalizeRequest, reviewWorkforceRequest } from '../../lib/workforceData';
import { approvalChain, canReviewRequest, isHRAccount, requestApprovalLevel } from '../../lib/workforce-contract';
import {
  GLASSES_POLICY_TIERS, getGlassesPolicyTier, validateGlassesClaim,
  calculateEmployeeAnnualLeave
} from '../../lib/hrPolicyService';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '../StatCard';
import { UserAvatar } from '../UserAvatar';
import {
  LeaveRequest, OvertimeRequest, ReimbursementRequest, UserAccount,
  LEAVE_TYPES, STATUS_CONFIG, REIMBURSEMENT_TYPES, isPendingApprovalStatus,
  buildApprovalSteps, getReimbType, renderStatusBadge, formatMinutes
} from './attendanceTypes';

export interface AttendanceRequestProps {
  currentUser?: any;
  allUsers?: UserAccount[];
}

export const AttendanceRequest: React.FC<AttendanceRequestProps> = ({ currentUser, allUsers: propUsers }) => {
  const userId = String(currentUser?.id || '');

  const [allUsers, setAllUsers] = useState<UserAccount[]>(propUsers || []);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [reimbursements, setReimbursements] = useState<ReimbursementRequest[]>([]);
  const [attendanceCorrections, setAttendanceCorrections] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const processing = useRef(false);
  const [requestTab, setRequestTab] = useState<'leave' | 'overtime' | 'reimbursement' | 'attendance_correction'>(() => {
    const type = new URLSearchParams(window.location.search).get('type');
    return type === 'overtime' || type === 'reimbursement' || type === 'attendance_correction' ? type : 'leave';
  });
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected'>('all');
  const [reimbFilter, setReimbFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'paid'>('all');
  const [reimbCategory, setReimbCategory] = useState<string>('all');
  const [requestDept, setRequestDept] = useState('all');
  const [requestCompany, setRequestCompany] = useState('all');
  const [viewRequest, setViewRequest] = useState<{ kind: 'cuti' | 'lembur' | 'reimbursement'; req: any } | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyModalTab, setPolicyModalTab] = useState<'kacamata' | 'cuti'>('kacamata');
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

  const loadAllData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [users, leaves, overtime, reimb, corrections, outside] = await Promise.all([
        loadWorkforceAccounts(),
        fetchAllRows((from, to) => supabase.from('leave_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('overtime_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('reimbursements').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('attendance_correction_requests').select('*').order('id').range(from, to)),
        fetchAllRows((from, to) => supabase.from('attendance_requests').select('*').order('id').range(from, to)),
      ]);
      const recentFirst = (a: any, b: any) => String(b.created_at || b.requested_at || '').localeCompare(String(a.created_at || a.requested_at || ''));
      setAllUsers(users);
      setLeaveRequests(leaves.map(normalizeRequest).sort(recentFirst) as LeaveRequest[]);
      setOvertimeRequests(overtime.map(normalizeRequest).sort(recentFirst) as OvertimeRequest[]);
      setReimbursements(reimb.map(normalizeRequest).sort(recentFirst) as ReimbursementRequest[]);
      setAttendanceCorrections([
        ...corrections.map(row => ({ ...row, request_kind: 'correction' })),
        ...outside.map(row => ({ ...row, request_kind: 'outside', attendance_date: row.request_date, clock_in_time: row.requested_at })),
      ].sort(recentFirst));
    } catch (err: any) {
      console.error('Error fetching request data:', err);
      setLoadError(err.message || 'Gagal memuat pengajuan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [refreshKey]);

  // ── Multi-Level Approval Handlers ─────────────────────────────────────

  // Sinkronisasi status ke model app-absen (PWA):
  //   app-absen membaca approval_status + current_approval_level,
  //   bukan kolom `status` ber-nilai pending_line_2/pending_senior/dll.
  // Mapping status app-gesit → approval_status app-absen:
  //   pending_line_2 → pending_level_2 (level 2)
  //   pending_senior  → pending_level_3 (level 3)
  //   pending_office  → pending_level_4 (VP)
  //   approved        → approved
  //   rejected        → rejected
  const getSyncApproval = (resultStatus: string, fallbackLevel: number = 1): Record<string, any> => {
    switch (resultStatus) {
      case 'pending_line_2':
        return { approval_status: 'pending_level_2', current_approval_level: 2 };
      case 'pending_senior':
        return { approval_status: 'pending_level_3', current_approval_level: 3 };
      case 'pending_office':
        return { approval_status: 'pending_level_4', current_approval_level: 4 };
      case 'approved':
        return { approval_status: 'approved', current_approval_level: 3 };
      case 'rejected':
        return { approval_status: 'rejected', current_approval_level: fallbackLevel };
      default:
        return { approval_status: 'pending', current_approval_level: fallbackLevel };
    }
  };

  // Decisions, approval history and annual leave balance commit in one server transaction.
  const applyApprovalUpdate = async (
    table: 'leave_requests' | 'overtime_requests' | 'reimbursements',
    id: number | string,
    updateData: Record<string, any>
  ): Promise<{ error: Error | null }> => {
    if (processing.current) return { error: new Error('Keputusan lain sedang diproses.') };
    processing.current = true;
    try {
      await reviewWorkforceRequest(table === 'leave_requests' ? 'leave' : table === 'overtime_requests' ? 'overtime' : 'reimbursement', id,
        updateData.status === 'rejected' ? 'rejected' : updateData.status === 'paid' ? 'paid' : 'approved', updateData.rejection_reason);
      return { error: null };
    } catch (error: any) {
      return { error };
    } finally {
      processing.current = false;
    }
  };

  const handleApproveLeave = async (req: LeaveRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      const { error } = await applyApprovalUpdate('leave_requests', req.id, updateData);
      if (error) throw error;
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan cuti ${label}.`);
      loadAllData();
    } catch (err: any) {
      toast.error(`Gagal menyetujui cuti: ${err.message}`);
    }
  };

  const handleApproveOvertime = async (req: OvertimeRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      const { error } = await applyApprovalUpdate('overtime_requests', req.id, updateData);
      if (error) throw error;
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan lembur ${label}.`);
      loadAllData();
    } catch (err: any) {
      toast.error(`Gagal menyetujui lembur: ${err.message}`);
    }
  };

  const handleApproveReimbursement = async (req: ReimbursementRequest) => {
    if (isRequester(req.user_id)) {
      toast.error('Anda tidak dapat menyetujui pengajuan sendiri.');
      return;
    }
    if (!canApproveRequest(req.user_id, req.status)) {
      toast.error('Anda bukan approver yang ditunjuk untuk pengajuan ini.');
      return;
    }
    const nextStatus = getNextStatus(req.status, allUsers.find(u => String(u.id) === String(req.user_id)));
    if (!nextStatus) return;

    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    const approverTime = new Date().toISOString();
    const updateData: Record<string, any> = { status: nextStatus, approved_by: approverName, approved_at: approverTime };

    if (nextStatus === 'pending_line_2') {
      updateData.line1_approved_by = approverName;
      updateData.line1_approved_at = approverTime;
    } else if (nextStatus === 'pending_senior') {
      updateData.line2_approved_by = approverName;
      updateData.line2_approved_at = approverTime;
    } else if (nextStatus === 'pending_office') {
      updateData.senior_approved_by = approverName;
      updateData.senior_approved_at = approverTime;
    } else if (nextStatus === 'approved') {
      updateData.office_approved_by = approverName;
      updateData.office_approved_at = approverTime;
    }

    Object.assign(updateData, getSyncApproval(nextStatus));

    try {
      const { error } = await applyApprovalUpdate('reimbursements', req.id, updateData);
      if (error) throw error;
      const label = nextStatus === 'approved' ? 'disetujui final' : nextStatus === 'pending_line_2' ? 'diteruskan ke HR' : nextStatus === 'pending_senior' ? 'diteruskan ke Manager' : 'diteruskan ke VP';
      toast.success(`Pengajuan reimbursement ${label}.`);
      loadAllData();
    } catch (err: any) {
      toast.error(`Gagal menyetujui reimbursement: ${err.message}`);
    }
  };

  const handleRejectRequest = async (table: 'leave_requests' | 'overtime_requests' | 'reimbursements', id: number | string) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    try {
      const { error } = await applyApprovalUpdate(table, id, {
        status: 'rejected',
        rejection_reason: `Ditolak oleh ${approverName}`,
        approved_by: approverName,
        approved_at: new Date().toISOString(),
        approval_status: 'rejected',
        current_approval_level: 1,
      });
      if (error) throw error;
      toast.success('Pengajuan ditolak.');
      loadAllData();
    } catch (err: any) {
      toast.error(`Gagal menolak pengajuan: ${err.message}`);
    }
  };

  const handleMarkPaid = async (id: number | string) => {
    const approverName = currentUser?.fullName || currentUser?.username || 'Admin';
    try {
      const { error } = await applyApprovalUpdate('reimbursements', id, {
        status: 'paid',
        approved_by: approverName,
        approved_at: new Date().toISOString(),
        approval_status: 'approved',
        current_approval_level: 3,
      });
      if (error) throw error;
      toast.success('Reimbursement ditandai sudah dibayar.');
      loadAllData();
    } catch (err: any) {
      toast.error(`Gagal update status: ${err.message}`);
    }
  };

  const isManager = isHRAccount(currentUser);

  // ── Approval Hierarchy Helpers ────────────────────────────────────────
  // GESIT Attendance Flexible Approval (kolom utama attendance_*, fallback kolom lama):
  //   attendance_supervisor_id / supervisor_id → Level 1 (Direct Supervisor)
  //   attendance_hr_id         / manager_id    → Level 2 (HR)
  //   attendance_manager_id    / vp_id         → Level 3 (Manager/Deputy)
  //   attendance_vp_id         / vp_id         → Level 4 (VP)

  const isApprover = useMemo(() => {
    if (isManager) return true;
    const myId = String(currentUser?.id || '');
    if (!myId) return false;
    return allUsers.some(u =>
      String(u.attendance_supervisor_id || '') === myId ||
      String(u.attendance_hr_id || '') === myId ||
      String(u.attendance_manager_id || '') === myId ||
      String(u.attendance_vp_id || '') === myId ||
      String(u.supervisor_id || '') === myId ||
      String(u.manager_id || '') === myId ||
      String(u.vp_id || '') === myId
    );
  }, [isManager, currentUser, allUsers]);

  // Flexible approval: level yang slot approvernya kosong dilewati otomatis.
  // Level: L1 Supervisor → L2 HR → L3 Manager → L4 VP (kolom attendance_*).
  const getNextStatus = (currentStatus: string, requester?: UserAccount): string | null => {
    if (!isPendingApprovalStatus(currentStatus)) return null;
    const level = requestApprovalLevel({ status: currentStatus });
    const next = approvalChain(requester).find(slot => slot.level > level);
    return next ? ({ 2: 'pending_line_2', 3: 'pending_senior', 4: 'pending_office' } as Record<number, string>)[next.level] : 'approved';
  };

  const isRequester = useCallback((reqUserId: string): boolean => {
    return String(currentUser?.id) === String(reqUserId);
  }, [currentUser]);

  // Check if current user is the designated approver for a request at its current status
  // Flexible: uses attendance_supervisor_id → attendance_hr_id → attendance_manager_id → attendance_vp_id
  // chain, dengan fallback ke supervisor_id → manager_id → vp_id.
  // Jika slot approver untuk level tersebut KOSONG, hanya Admin/Super Admin yang boleh
  // menyelesaikannya (jalur penyelamat untuk request yang sudah terlanjur nyangkut).
  const canApproveRequest = useCallback((reqUserId: string, status: string): boolean => {
    const requester = allUsers.find(u => String(u.id) === String(reqUserId));
    return canReviewRequest(currentUser, { user_id: reqUserId, status }, requester);
  }, [currentUser, allUsers]);

  // Check if current user can reject at any pending level
  const canRejectRequest = useCallback((reqUserId: string, status: string): boolean => {
    return canApproveRequest(reqUserId, status);
  }, [canApproveRequest]);

  // Get approver display name from hierarchy
  const getApproverName = useCallback((reqUserId: string, status: string): string => {
    const requester = allUsers.find(u => String(u.id) === String(reqUserId));
    if (!requester) return '—';
    const nameOf = (id?: string | null) => {
      const u = allUsers.find(x => String(x.id) === String(id));
      return u?.full_name || u?.username || '—';
    };
    const slot = approvalChain(requester).find(item => item.level === requestApprovalLevel({ status }));
    return nameOf(slot?.id == null ? undefined : String(slot.id));
  }, [allUsers]);

  const requestDeptOptions = useMemo(() =>
    Array.from(new Set(allUsers.map(u => u.department).filter(Boolean) as string[])).sort(),
    [allUsers]);

  const requestCompanyOptions = useMemo(() =>
    Array.from(new Set(allUsers.map(u => u.company).filter(Boolean) as string[])).sort(),
    [allUsers]);

  const matchesRequestScope = useCallback((reqUserId: string) => {
    const u = userMap.get(String(reqUserId));
    if (requestDept !== 'all' && u?.department !== requestDept) return false;
    if (requestCompany !== 'all' && u?.company !== requestCompany) return false;
    return true;
  }, [requestDept, requestCompany, userMap]);

  const scopedLeave = useMemo(() => leaveRequests.filter(l => matchesRequestScope(l.user_id)), [leaveRequests, matchesRequestScope]);
  const scopedOvertime = useMemo(() => overtimeRequests.filter(o => matchesRequestScope(o.user_id)), [overtimeRequests, matchesRequestScope]);
  const scopedReimb = useMemo(() => reimbursements.filter(r => matchesRequestScope(r.user_id)), [reimbursements, matchesRequestScope]);

  const getRequestEmployeeName = useCallback((reqUserId: string) => {
    const u = userMap.get(String(reqUserId));
    return u?.full_name || u?.username || reqUserId;
  }, [userMap]);

  const renderLeave = () => {
    const s = scopedLeave;
    const filtered = requestFilter === 'all' ? s
      : requestFilter === 'pending' ? s.filter(l => isPendingApprovalStatus(l.status))
      : s.filter(l => l.status === requestFilter);
    const pendingCount = s.filter(l => isPendingApprovalStatus(l.status)).length;

    const renderApprovalHistory = (req: LeaveRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-primary" />
              Daftar Pengajuan Cuti &amp; Izin
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              {filtered.length} pengajuan cuti &bull; Menunggu persetujuan: {pendingCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'Semua', count: s.length },
              { id: 'pending', label: 'Menunggu', count: pendingCount },
              { id: 'approved', label: 'Disetujui', count: s.filter(l => l.status === 'approved').length },
              { id: 'rejected', label: 'Ditolak', count: s.filter(l => l.status === 'rejected').length },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setRequestFilter(f.id as any)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  requestFilter === f.id
                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                    : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <FileText size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan cuti</p>
              <p className="text-xs text-muted-foreground">Tidak ada permohonan yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Jenis Cuti</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Diajukan</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => {
                    const typeInfo = LEAVE_TYPES.find(t => t.id === req.leave_type);
                    const days = Math.ceil((new Date(req.end_date).getTime() - new Date(req.start_date).getTime()) / 86400000) + 1;
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm', typeInfo?.badge || 'bg-muted')}>
                              {typeInfo?.icon || '📝'}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{typeInfo?.label || req.leave_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {new Date(req.start_date).toLocaleDateString('id-ID')}
                          <span className="mx-1 text-muted-foreground">—</span>
                          {new Date(req.end_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-border/60 bg-muted/40 text-foreground text-xs font-semibold">
                            {days} hari
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.reason}>
                          {req.reason}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                          {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveLeave(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Cuti"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('leave_requests', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Cuti"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'approved' ? (
                              <span className="text-xs text-emerald-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Overtime Requests View ─────────────────────────────────────────────

  const renderOvertime = () => {
    const s = scopedOvertime;
    const filtered = requestFilter === 'all' ? s
      : requestFilter === 'pending' ? s.filter(o => isPendingApprovalStatus(o.status))
      : s.filter(o => o.status === requestFilter);
    const pendingCount = s.filter(o => isPendingApprovalStatus(o.status)).length;

    const renderApprovalHistory = (req: OvertimeRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Timer size={16} className="text-primary" />
              Daftar Pengajuan Lembur
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              {filtered.length} pengajuan lembur &bull; Menunggu persetujuan: {pendingCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {([
              { id: 'all', label: 'Semua', count: s.length },
              { id: 'pending', label: 'Menunggu', count: pendingCount },
              { id: 'approved', label: 'Disetujui', count: s.filter(o => o.status === 'approved').length },
              { id: 'rejected', label: 'Ditolak', count: s.filter(o => o.status === 'rejected').length },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setRequestFilter(f.id as any)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  requestFilter === f.id
                    ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                    : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                )}
              >
                {f.label}
                <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Timer size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan lembur</p>
              <p className="text-xs text-muted-foreground">Tidak ada permohonan yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jam</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Pekerjaan</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((req) => {
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="text-xs font-semibold text-foreground whitespace-nowrap">
                            {new Date(req.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {req.start_time} — {req.end_time}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            {formatMinutes(req.duration_minutes)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.project_or_task ? (
                            <span className="inline-flex items-center gap-1 rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              <Briefcase size={11} /> {req.project_or_task}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.reason}>
                          {req.reason}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveOvertime(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Lembur"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('overtime_requests', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Lembur"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'approved' ? (
                              <span className="text-xs text-emerald-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── Reimbursement Render ──────────────────────────────────────────────

  const renderReimbursement = () => {
    const s = scopedReimb;
    const filtered = s.filter(r => {
      if (reimbCategory !== 'all' && r.category !== reimbCategory) return false;
      if (reimbFilter === 'all') return true;
      if (reimbFilter === 'pending') return isPendingApprovalStatus(r.status);
      return r.status === reimbFilter;
    });
    const catCount = (c: string) => (c === 'all' ? s.length : s.filter(r => r.category === c).length);
    const pendingCount = s.filter(r => isPendingApprovalStatus(r.status)).length;

    const renderApprovalHistory = (req: ReimbursementRequest) => {
      const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
      if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
      if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
      if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
      if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
      if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
      if (steps.length === 0) return null;
      return (
        <div className="mt-1 space-y-0.5">
          {steps.map((st, i) => (
            <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
              <span className="font-semibold text-foreground/80">{st.label}:</span> {st.by}
            </div>
          ))}
        </div>
      );
    };

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <CardHeader className="flex flex-col gap-3 pb-4 border-b border-border/40 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet size={16} className="text-primary" />
                Daftar Pengajuan Reimbursement
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {filtered.length} pengajuan klaim &bull; Menunggu persetujuan: {pendingCount}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'all', label: 'Semua', count: s.length },
                { id: 'pending', label: 'Menunggu', count: pendingCount },
                { id: 'approved', label: 'Disetujui', count: s.filter(r => r.status === 'approved').length },
                { id: 'rejected', label: 'Ditolak', count: s.filter(r => r.status === 'rejected').length },
                { id: 'paid', label: 'Dibayar', count: s.filter(r => r.status === 'paid').length },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setReimbFilter(f.id as any)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    reimbFilter === f.id
                      ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                      : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            {[{ id: 'all', label: 'Semua Kategori', icon: null }, ...REIMBURSEMENT_TYPES].map(c => (
              <button
                key={c.id}
                onClick={() => setReimbCategory(c.id)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                  reimbCategory === c.id
                    ? 'bg-primary/10 text-primary border border-primary/20 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {c.label}
                <span className="text-[10px] opacity-70">({catCount(c.id)})</span>
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <Wallet size={36} className="opacity-30" />
              <p className="text-sm font-semibold text-foreground">Belum ada pengajuan reimbursement</p>
              <p className="text-xs text-muted-foreground">Tidak ada klaim yang sesuai filter saat ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {isApprover && <TableHead className="w-[240px]">Karyawan</TableHead>}
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="min-w-[200px]">Deskripsi</TableHead>
                    <TableHead>Jumlah (Rp)</TableHead>
                    <TableHead>Status</TableHead>
                    {isApprover && <TableHead className="text-right pr-4">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(req => {
                    const typeInfo = getReimbType(req.category);
                    const showApprove = isApprover && canApproveRequest(req.user_id, req.status);
                    const showReject = isApprover && canRejectRequest(req.user_id, req.status);
                    const empName = getRequestEmployeeName(req.user_id);
                    const empAvatar = userMap.get(String(req.user_id))?.avatar_url;
                    const empDept = userMap.get(String(req.user_id))?.department || '—';

                    return (
                      <TableRow
                        key={req.id}
                        onClick={() => setViewRequest({ kind: (req as any).amount != null ? 'reimbursement' : (req as any).leave_type != null ? 'cuti' : 'lembur', req })}
                        className="cursor-pointer hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {isApprover && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar name={empName} url={empAvatar} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-foreground truncate">{empName}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{empDept}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60', typeInfo?.color)}>
                              {typeInfo?.icon}
                            </span>
                            <span className="text-xs font-semibold text-foreground">{typeInfo?.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-foreground/80 whitespace-nowrap">
                          {req.date ? new Date(req.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-muted-foreground/40">—</span>}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={req.description}>
                          {req.description}
                        </TableCell>
                        <TableCell className="text-xs font-bold tabular-nums text-foreground whitespace-nowrap">
                          Rp {Number(req.amount).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(req.status)}
                          {req.status === 'rejected' && req.rejection_reason && (
                            <div className="text-[10px] text-rose-500 mt-0.5 max-w-[160px] truncate">{req.rejection_reason}</div>
                          )}
                          {renderApprovalHistory(req)}
                        </TableCell>
                        {isApprover && (
                          <TableCell className="text-right pr-4">
                            {showApprove || showReject ? (
                              <div className="flex items-center justify-end gap-1.5">
                                {showApprove && (
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleApproveReimbursement(req); }}
                                    className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                    title="Setujui Reimbursement"
                                  >
                                    <Check size={12} className="mr-1" /> Setujui
                                  </Button>
                                )}
                                {showReject && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRejectRequest('reimbursements', req.id); }}
                                    className="h-7 px-2.5 text-xs font-semibold"
                                    title="Tolak Reimbursement"
                                  >
                                    <X size={12} className="mr-1" /> Tolak
                                  </Button>
                                )}
                              </div>
                            ) : req.status === 'approved' && isApprover ? (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleMarkPaid(req.id); }}
                                className="h-7 px-2.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                title="Tandai Sudah Dibayar"
                              >
                                <Check size={12} className="mr-1" /> Bayar
                              </Button>
                            ) : req.status === 'rejected' ? (
                              <span className="text-xs text-rose-500 font-semibold">Ditolak</span>
                            ) : req.status === 'paid' ? (
                              <span className="text-xs text-blue-500 font-semibold">Selesai</span>
                            ) : isRequester(req.user_id) ? (
                              <span className="text-xs text-amber-500 font-medium">Menunggu {getApproverName(req.user_id, req.status)}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                {req.approved_by ? `oleh ${req.approved_by}` : '—'}
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const handleAttendanceCorrectionDecision = async (request: any, status: 'approved' | 'rejected') => {
    if (processing.current) return;
    processing.current = true;
    try {
      const { error } = await supabase.rpc(request.request_kind === 'outside' ? 'review_outside_radius_attendance' : 'review_attendance_correction_request', {
        p_request_id: request.id, p_status: status, p_reviewer_note: null,
      });
      if (error) throw error;
      await loadAllData();
      toast.success(status === 'approved' ? 'Request absen disetujui dan data attendance dibuat.' : 'Request absen ditolak.');
    } catch (error: any) {
      toast.error(`Keputusan tidak tersimpan: ${error.message}`);
    } finally {
      processing.current = false;
    }
  };

  const renderAttendanceCorrections = () => {
    const scopedCorrections = attendanceCorrections.filter(row => matchesRequestScope(row.user_id));
    const pending = scopedCorrections.filter(row => row.status === 'pending');

    return (
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Request Absen
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Pengajuan lupa absen atau koreksi presensi karyawan
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
            {pending.length} Menunggu
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {scopedCorrections.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <Clock size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Belum ada request absen</p>
                <p className="text-xs text-muted-foreground">Tidak ada permohonan koreksi absensi saat ini</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[240px]">Karyawan</TableHead>
                    <TableHead>Tanggal Absen</TableHead>
                    <TableHead>Jam Masuk</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                    <TableHead className="min-w-[200px]">Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedCorrections.map(row => {
                    const employee = allUsers.find(u => String(u.id) === String(row.user_id));
                    return (
                      <TableRow key={row.id} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              name={employee?.full_name || employee?.username || String(row.user_id)}
                              url={employee?.avatar_url}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate">{employee?.full_name || employee?.username || row.user_id}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{employee?.department || '—'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                          {row.attendance_date}
                          {row.request_kind === 'outside' && <div className="mt-1 text-[10px] text-muted-foreground">Di luar radius kantor</div>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {row.clock_in_time ? new Date(row.clock_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {row.clock_out_time ? new Date(row.clock_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate" title={row.reason}>
                          {row.reason}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(row.status)}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          {row.status === 'pending' && isManager && !isRequester(row.user_id) ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleAttendanceCorrectionDecision(row, 'approved')}
                                className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                              >
                                <Check size={12} className="mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAttendanceCorrectionDecision(row, 'rejected')}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                <X size={12} className="mr-1" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold uppercase text-muted-foreground">{row.status}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Request (combined: Leave, OT, Reimb) ───────────────────────────

  const renderRequest = () => {
    const scopedCorrections = attendanceCorrections.filter(row => matchesRequestScope(row.user_id));
    const tabs = [
      { id: 'attendance_correction' as const, label: 'Request Absen', icon: <Clock size={14} />, count: attendanceCorrections.filter(r => r.status === 'pending' && matchesRequestScope(r.user_id)).length },
      { id: 'leave' as const, label: 'Cuti / Izin', icon: <Calendar size={14} />, count: scopedLeave.filter(l => isPendingApprovalStatus(l.status)).length },
      { id: 'overtime' as const, label: 'Lembur', icon: <Timer size={14} />, count: scopedOvertime.filter(o => isPendingApprovalStatus(o.status)).length },
      { id: 'reimbursement' as const, label: 'Reimbursement', icon: <Wallet size={14} />, count: scopedReimb.filter(r => isPendingApprovalStatus(r.status)).length },
    ];

    const scopeLabel =
      (requestCompany !== 'all' ? requestCompany : 'Semua Perusahaan') +
      ' · ' +
      (requestDept !== 'all' ? requestDept : 'Semua Departemen');

    const totalScope = scopedCorrections.length + scopedLeave.length + scopedOvertime.length + scopedReimb.length;

    const summary = (() => {
      if (requestTab === 'attendance_correction') {
        return [
          { label: 'Total Request', value: scopedCorrections.length, sub: 'koreksi / di luar radius' },
          { label: 'Menunggu', value: scopedCorrections.filter(x => x.status === 'pending').length, sub: 'perlu approval' },
          { label: 'Disetujui', value: scopedCorrections.filter(x => x.status === 'approved').length, sub: 'request approved' },
          { label: 'Ditolak', value: scopedCorrections.filter(x => x.status === 'rejected').length, sub: 'request rejected' },
        ];
      }
      if (requestTab === 'leave') {
        const s = scopedLeave;
        return [
          { label: 'Total Pengajuan', value: s.length, sub: 'cuti / izin' },
          { label: 'Menunggu', value: s.filter(x => isPendingApprovalStatus(x.status)).length, sub: 'perlu persetujuan' },
          { label: 'Disetujui', value: s.filter(x => x.status === 'approved').length, sub: 'cuti disetujui' },
          { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
        ];
      }
      if (requestTab === 'overtime') {
        const s = scopedOvertime;
        return [
          { label: 'Total Pengajuan', value: s.length, sub: 'lembur' },
          { label: 'Menunggu', value: s.filter(x => isPendingApprovalStatus(x.status)).length, sub: 'perlu persetujuan' },
          { label: 'Disetujui', value: s.filter(x => x.status === 'approved').length, sub: 'lembur disetujui' },
          { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
        ];
      }
      const s = scopedReimb;
      const pending = s.filter(x => isPendingApprovalStatus(x.status));
      const approved = s.filter(x => x.status === 'approved' || x.status === 'paid');
      const fmt = (rs: ReimbursementRequest[]) => 'Rp ' + rs.reduce((a, b) => a + Number(b.amount), 0).toLocaleString('id-ID');
      return [
        { label: 'Total Pengajuan', value: s.length, sub: 'reimbursement' },
        { label: 'Menunggu', value: pending.length, sub: fmt(pending) },
        { label: 'Disetujui', value: approved.length, sub: fmt(approved) },
        { label: 'Ditolak', value: s.filter(x => x.status === 'rejected').length, sub: 'pengajuan ditolak' },
      ];
    })();

    return (
      <div className="w-full space-y-6 animate-in fade-in duration-500">
        {/* Page Header */}
        <PageHeader
          title="Pengajuan & Approval"
          description="Kelola antrean persetujuan request absen, cuti & izin, lembur, dan reimbursement karyawan."
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button
              id="btn-policy-rules"
              variant="outline"
              size="sm"
              onClick={() => setShowPolicyModal(true)}
              className="gap-1.5 border-primary/40 bg-primary/10 text-primary dark:text-blue-400 hover:bg-primary/20 shadow-2xs text-xs font-semibold cursor-pointer"
            >
              <BookOpen size={14} />
              <span>Ketentuan SK Klaim & Cuti</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAllData()}
              disabled={loading}
              className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
            >
              <RefreshCw size={14} className={cn(loading && 'animate-spin text-primary dark:text-blue-400')} />
              <span>Muat Ulang</span>
            </Button>
          </div>
        </PageHeader>

        {loadError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Data belum berhasil dimuat: {loadError}</div>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Memuat pengajuan...</p>}
        {/* Tab Navigation */}
        <Tabs
          value={requestTab}
          onValueChange={(val) => {
            setRequestTab(val as any);
            setRequestFilter('all');
          }}
          className="w-fit mb-6"
        >
          <TabsList>
            {tabs.map(t => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.icon} <span className="ml-1.5">{t.label}</span>
                {t.count > 0 && (
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {t.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* StatCards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={summary[0].label}
            value={summary[0].value}
            subValue={summary[0].sub}
            icon={requestTab === 'attendance_correction' ? Clock : requestTab === 'leave' ? Calendar : requestTab === 'overtime' ? Timer : Wallet}
            color="slate"
          />
          <StatCard
            label={summary[1].label}
            value={summary[1].value}
            subValue={summary[1].sub}
            icon={AlertTriangle}
            color="amber"
            status={Number(summary[1].value) > 0 ? "at-risk" : undefined}
          />
          <StatCard
            label={summary[2].label}
            value={summary[2].value}
            subValue={summary[2].sub}
            icon={CheckCircle2}
            color="emerald"
            status="on-track"
          />
          <StatCard
            label={summary[3].label}
            value={summary[3].value}
            subValue={summary[3].sub}
            icon={XCircle}
            color="rose"
          />
        </div>

        {/* Scope / Filter Toolbar Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                Filter Perusahaan &amp; Departemen
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {scopeLabel} &bull; {totalScope} total pengajuan
              </p>
            </div>
            {(requestCompany !== 'all' || requestDept !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setRequestCompany('all'); setRequestDept('all'); }}
                className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <RotateCcw size={13} className="mr-1" /> Reset Filter
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perusahaan</Label>
                <select
                  value={requestCompany}
                  onChange={e => setRequestCompany(e.target.value)}
                  className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Perusahaan</option>
                  {requestCompanyOptions.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Departemen</Label>
                <select
                  value={requestDept}
                  onChange={e => setRequestDept(e.target.value)}
                  className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Semua Departemen</option>
                  {requestDeptOptions.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {requestTab === 'attendance_correction' && renderAttendanceCorrections()}
        {requestTab === 'leave' && renderLeave()}
        {requestTab === 'overtime' && renderOvertime()}
        {requestTab === 'reimbursement' && renderReimbursement()}
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderRequest()}
      {viewRequest && (
        <Dialog open onOpenChange={(open) => { if (!open) setViewRequest(null); }}>
          <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden font-sans border border-border bg-card text-card-foreground shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-4 shrink-0">
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {viewRequest.kind === 'cuti' ? 'Detail Cuti' : viewRequest.kind === 'lembur' ? 'Detail Lembur' : 'Detail Reimbursement'}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {getRequestEmployeeName(viewRequest.req.user_id)} · {userMap.get(String(viewRequest.req.user_id))?.department || ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {renderStatusBadge(viewRequest.req.status)}
                <button
                  onClick={() => setViewRequest(null)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* Common: submitted at */}
              <div className="text-[11px] text-muted-foreground">
                Diajukan {new Date(viewRequest.req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>

              {/* Fields per kind */}
              {viewRequest.kind === 'cuti' && (() => {
                const r = viewRequest.req;
                const typeInfo = LEAVE_TYPES.find(t => t.id === r.leave_type);
                const days = Math.ceil((new Date(r.end_date).getTime() - new Date(r.start_date).getTime()) / 86400000) + 1;
                const requester = userMap.get(String(r.user_id));
                const leavePolicy = requester ? calculateEmployeeAnnualLeave(requester) : null;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <p className="font-semibold text-muted-foreground">Jenis Cuti</p>
                        <p className="text-foreground font-medium">{typeInfo?.icon} {typeInfo?.label || r.leave_type}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Durasi</p>
                        <p className="text-foreground font-medium">{days} hari</p>
                      </div>
                    </div>
                    <div className="text-[12px]">
                      <p className="font-semibold text-muted-foreground">Periode</p>
                      <p className="text-foreground font-medium">
                        {new Date(r.start_date).toLocaleDateString('id-ID')} — {new Date(r.end_date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    {r.reason && (
                      <div className="text-[12px]">
                        <p className="font-semibold text-muted-foreground">Alasan</p>
                        <p className="text-foreground/90">{r.reason}</p>
                      </div>
                    )}

                    {/* Policy Compliance Card for Leave */}
                    {leavePolicy && (
                      <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[12px] flex items-center gap-1.5 text-foreground">
                            <Calendar size={14} className="text-primary" />
                            Ketentuan Cuti {leavePolicy.contractType}
                          </span>
                          <Badge variant="outline" className={cn(
                            'text-[10px] font-semibold',
                            leavePolicy.contractType === 'PKWTT'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          )}>
                            {leavePolicy.contractType}
                          </Badge>
                        </div>

                        <div className="rounded-lg bg-background p-2.5 border border-border/50 space-y-1 text-muted-foreground">
                          {leavePolicy.contractType === 'PKWTT' ? (
                            <>
                              <p className="text-foreground font-medium">• Hak Cuti: 12 hari/tahun setelah melewati 1 tahun masa kerja.</p>
                              <p>• Perolehan Cuti Pertama: Prorata (12 - bulan join).</p>
                              <p>• Refill Saldo: 12 hari di-refill setiap awal tahun (1 Januari).</p>
                              <p>• Carry Forward: Sisa cuti dapat digunakan s.d. 30 Juni (setelah 30 Juni expired otomatis).</p>
                              <p>• Cuti Bersama: Memotong cuti tahunan.</p>
                            </>
                          ) : (
                            <>
                              <p className="text-foreground font-medium">• Hak Cuti: Prorata menyesuaikan lama kontrak (1 hari/bulan kontrak).</p>
                              <p>• Perolehan Cuti: Full aktif dari awal masuk.</p>
                              <p>• Refill Saldo: Di-refill sesuai periode kontrak baru.</p>
                              <p>• Tidak ada carry forward antar kontrak.</p>
                              <p>• Cuti Bersama: Memotong cuti tahunan.</p>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewRequest.kind === 'lembur' && (() => {
                const r = viewRequest.req;
                return (
                  <div className="space-y-2.5 text-[12px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-muted-foreground">Tanggal</p>
                        <p className="text-foreground font-medium">{new Date(r.date).toLocaleDateString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Durasi</p>
                        <p className="text-foreground font-medium">{formatMinutes(r.duration_minutes)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Jam</p>
                      <p className="text-foreground font-medium">{r.start_time} — {r.end_time}</p>
                    </div>
                    {r.project_or_task && (
                      <div>
                        <p className="font-semibold text-muted-foreground">Project / Task</p>
                        <p className="text-foreground font-medium">{r.project_or_task}</p>
                      </div>
                    )}
                    {r.reason && (
                      <div>
                        <p className="font-semibold text-muted-foreground">Alasan</p>
                        <p className="text-foreground/90">{r.reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {viewRequest.kind === 'reimbursement' && (() => {
                const r = viewRequest.req;
                const typeInfo = getReimbType(r.category);
                const requester = userMap.get(String(r.user_id));
                const isGlasses = (r.category || '').includes('glasses') || (r.description || '').toLowerCase().includes('kacamata') || (r.description || '').toLowerCase().includes('lensa');
                const isFrame = (r.category || '').includes('frame') || (r.description || '').toLowerCase().includes('frame');
                const isLens = (r.category || '').includes('lens') || (r.description || '').toLowerCase().includes('lensa');
                const claimType = isFrame ? 'frame' : isLens ? 'lens' : 'both';
                const validation = (isGlasses && requester) ? validateGlassesClaim(requester, claimType) : null;
                const requestedAmount = Number(r.amount) || 0;
                const isOverLimit = validation && validation.maxFrameAmount !== 'actual' && (
                  (isFrame && requestedAmount > (validation.maxFrameAmount as number)) ||
                  (isLens && requestedAmount > (validation.maxLensAmount as number))
                );

                return (
                  <div className="space-y-3 text-[12px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="font-semibold text-muted-foreground">Kategori</p>
                        <p className="text-foreground font-medium">{typeInfo.icon} {typeInfo.label}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Nominal Pengajuan</p>
                        <p className="text-foreground font-bold">Rp {requestedAmount.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Tanggal</p>
                      <p className="text-foreground font-medium">{new Date(r.date).toLocaleDateString('id-ID')}</p>
                    </div>
                    {r.description && (
                      <div>
                        <p className="font-semibold text-muted-foreground">Deskripsi</p>
                        <p className="text-foreground/90">{r.description}</p>
                      </div>
                    )}

                    {/* Policy Compliance Card for Glasses SK */}
                    {isGlasses && validation && (
                      <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[12px] flex items-center gap-1.5 text-foreground">
                            <ShieldCheck size={14} className="text-primary" />
                            Ketentuan SK Bantuan Kacamata
                          </span>
                          <Badge variant="outline" className="text-[10px] font-semibold border-border">
                            {validation.tier.golongan}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="rounded-lg bg-background p-2 border border-border/50">
                            <span className="text-muted-foreground block text-[10px]">Plafon Frame (3 Thn Sekali)</span>
                            <span className="font-bold text-foreground">
                              {validation.maxFrameAmount === 'actual' ? 'Actual Receipt' : `Maks. Rp ${validation.maxFrameAmount.toLocaleString('id-ID')}`}
                            </span>
                          </div>
                          <div className="rounded-lg bg-background p-2 border border-border/50">
                            <span className="text-muted-foreground block text-[10px]">Plafon Lensa (1 Thn Sekali)</span>
                            <span className="font-bold text-foreground">
                              {validation.maxLensAmount === 'actual' ? 'Actual Receipt' : `Maks. Rp ${validation.maxLensAmount.toLocaleString('id-ID')}`}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] space-y-1.5 pt-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {validation.tenureYears >= 1 ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                                ✓ Masa Kerja: {validation.tenureYears} Tahun ({validation.tenureMonths} Bulan) &bull; Memenuhi Syarat (&ge; 1 Thn)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold">
                                ⚠ Masa Kerja Belum 1 Tahun ({validation.tenureMonths} Bulan)
                              </Badge>
                            )}
                            {isOverLimit && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold">
                                ⚠ Melebihi Plafon SK
                              </Badge>
                            )}
                          </div>
                          {validation.reasons.map((msg, i) => (
                            <p key={i} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                              • {msg}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {r.rejection_reason && (
                      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5">
                        <p className="font-semibold text-red-500 text-[11px]">Alasan Penolakan</p>
                        <p className="text-red-400 text-[12px]">{r.rejection_reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              <Separator />

              {/* Approval Log */}
              <div>
                <p className="text-[13px] font-bold text-foreground mb-3">Riwayat Persetujuan</p>
                {(() => {
                  const r = viewRequest.req;
                  const hierarchy = [
                    { level: 1, label: 'Supervisor (SPV)', approved_by: r.line1_approved_by, approved_at: r.line1_approved_at },
                    { level: 2, label: 'HR', approved_by: r.line2_approved_by, approved_at: r.line2_approved_at },
                    { level: 3, label: 'Manager', approved_by: r.senior_approved_by, approved_at: r.senior_approved_at },
                    { level: 4, label: 'VP', approved_by: r.office_approved_by, approved_at: r.office_approved_at },
                  ];
                  const isRejected = r.status === 'rejected';
                  const isApproved = r.status === 'approved';
                  const isFinalApproved = isApproved;
                  const hasLevelData = hierarchy.some(h => !!h.approved_by);

                  // Fallback: bila kolom per-level kosong (migrasi history belum jalan)
                  // tapi status final sudah diketahui, tampilkan hasil akhir saja.
                  if (!hasLevelData && (isApproved || isRejected)) {
                    return (
                      <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${isRejected ? 'border-red-500/20 bg-red-500/10' : 'border-emerald-500/20 bg-emerald-500/10'}`}>
                        {isRejected
                          ? <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                          : <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />}
                        <div>
                          <p className={`text-[13px] font-bold ${isRejected ? 'text-red-500' : 'text-emerald-500'}`}>
                            {isRejected ? 'Pengajuan Ditolak' : 'Pengajuan Disetujui'}
                          </p>
                          {r.approved_by && (
                            <p className="text-[12px] text-muted-foreground mt-0.5">
                              oleh {r.approved_by}
                              {r.approved_at && (
                                <span className="text-muted-foreground/80"> · {new Date(r.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </p>
                          )}
                          {isRejected && r.rejection_reason && (
                            <p className="text-[12px] text-red-500 mt-1.5">{r.rejection_reason}</p>
                          )}
                          {isApproved && (
                            <p className="text-[11px] text-muted-foreground mt-1.5">
                              Data per-level belum tersimpan (kolom history approval belum ada saat persetujuan). Untuk pengajuan baru, riwayat per-level akan terekam otomatis.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="relative space-y-0">
                      {hierarchy.map((h, i) => {
                        const isLevelApproved = !!h.approved_by;
                        const isCurrent = !isLevelApproved && !isRejected && !isFinalApproved && hierarchy.slice(0, i).every(x => !!x.approved_by);
                        const isSkipped = !isLevelApproved && !isRejected && isFinalApproved;
                        return (
                          <div key={i} className="relative flex items-start gap-3">
                            {/* Vertical connector line */}
                            {i < hierarchy.length - 1 && (
                              <div className="absolute left-[9px] top-[22px] w-[2px] h-[calc(100%-10px)] bg-border" />
                            )}
                            {/* Circle */}
                            <div className={`relative z-10 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full border-2 ${
                              isLevelApproved ? 'border-emerald-500 bg-emerald-500/10' :
                              isCurrent ? 'border-amber-400 bg-amber-400/10' :
                              isSkipped ? 'border-border bg-muted' :
                              'border-border bg-muted'
                            }`}>
                              {isLevelApproved ? (
                                <CheckCircle2 size={12} className="text-emerald-500" />
                              ) : isCurrent ? (
                                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                              )}
                            </div>
                            {/* Content */}
                            <div className="pb-4 pt-0.5">
                              <p className={`text-[13px] font-semibold ${isLevelApproved ? 'text-foreground' : isCurrent ? 'text-amber-500' : isSkipped ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
                                {h.label}
                              </p>
                              {isLevelApproved ? (
                                <p className="text-[12px] text-muted-foreground">
                                  {h.approved_by}
                                  {h.approved_at && (
                                    <span className="text-muted-foreground/80"> · {new Date(h.approved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  )}
                                </p>
                              ) : isCurrent ? (
                                <p className="text-[12px] text-amber-500">Menunggu persetujuan</p>
                              ) : isRejected ? (
                                <p className="text-[12px] text-muted-foreground">Ditolak</p>
                              ) : isSkipped ? (
                                <p className="text-[12px] text-muted-foreground/60">Disetujui di tahap sebelumnya</p>
                              ) : (
                                <p className="text-[12px] text-muted-foreground/60">Belum mencapai tahap ini</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Policy Reference Modal (SK Kacamata & Ketentuan Cuti) */}
      {showPolicyModal && (
        <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
          <DialogContent showCloseButton={false} aria-describedby="policy-desc" className="sm:max-w-3xl p-0 overflow-hidden font-sans border border-border bg-card text-card-foreground shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <BookOpen size={18} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Ketentuan Resmi SDM: SK Klaim &amp; Kebijakan Cuti
                  </DialogTitle>
                  <DialogDescription id="policy-desc" className="text-xs text-muted-foreground">
                    Panduan baku hak karyawan, plafon bantuan kacamata/lensa, dan tata kelola cuti tahunan.
                  </DialogDescription>
                </div>
              </div>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="border-b border-border px-6 pt-3 bg-muted/10 shrink-0">
              <Tabs
                value={policyModalTab}
                onValueChange={(val) => setPolicyModalTab(val as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                  <TabsTrigger value="kacamata" className="text-xs font-semibold gap-1.5">
                    <Stethoscope size={14} />
                    <span>SK Bantuan Kacamata &amp; Lensa</span>
                  </TabsTrigger>
                  <TabsTrigger value="cuti" className="text-xs font-semibold gap-1.5">
                    <Calendar size={14} />
                    <span>Ketentuan Cuti (PKWTT vs PKWT)</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
              {policyModalTab === 'kacamata' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Summary Callout */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-sm">
                      <Sparkles size={16} />
                      <span>Ketentuan Pokok Klaim Kacamata &amp; Lensa</span>
                    </div>
                    <ul className="text-xs space-y-1.5 text-foreground/90 pl-1">
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">&bull;</span>
                        <span><strong>Masa Kerja Minimal:</strong> Kacamata &amp; lensa baru bisa diklaim jika karyawan telah bekerja <strong>minimal 1 tahun</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">&bull;</span>
                        <span><strong>Frame Kacamata:</strong> Dapat dicover <strong>3 tahun sekali</strong> (Limit sesuai golongan SK di bawah).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary font-bold">&bull;</span>
                        <span><strong>Lensa Kacamata:</strong> Dapat dicover <strong>1 tahun sekali</strong> (Besarnya bantuan adalah <strong>50%</strong> daripada bantuan kacamata sesuai golongan).</span>
                      </li>
                    </ul>
                  </div>

                  {/* Table Plafon Golongan */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Tabel Besaran Bantuan Kacamata Sesuai Golongan
                      </h4>
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        SK Direksi / HR Policy
                      </Badge>
                    </div>

                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="text-xs font-bold w-[35%]">Golongan / Jabatan</TableHead>
                            <TableHead className="text-xs font-bold text-right">Plafon Frame (Cover 3 Thn Sekali)</TableHead>
                            <TableHead className="text-xs font-bold text-right">Plafon Lensa (Cover 1 Thn Sekali - 50%)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {GLASSES_POLICY_TIERS.map((tier, idx) => (
                            <TableRow key={idx} className="hover:bg-muted/30">
                              <TableCell className="py-2.5">
                                <span className="text-xs font-semibold text-foreground block">{tier.golongan}</span>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {tier.titles.slice(0, 3).join(', ')}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold tabular-nums text-foreground">
                                {tier.maxFrame === 'actual' ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                                    based on actual receipt
                                  </Badge>
                                ) : (
                                  `Rp ${tier.maxFrame.toLocaleString('id-ID')}`
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-right font-bold tabular-nums text-primary">
                                {tier.maxLens === 'actual' ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                                    based on actual receipt
                                  </Badge>
                                ) : (
                                  `Rp ${(tier.maxLens as number).toLocaleString('id-ID')}`
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic">
                      * Besaran bantuan tersebut akan ditinjau secara berkala mengikuti Kebijakan Perusahaan.
                    </p>
                  </div>
                </div>
              )}

              {policyModalTab === 'cuti' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="text-xs font-bold w-[22%]">Ketentuan</TableHead>
                          <TableHead className="text-xs font-bold text-emerald-600 dark:text-emerald-400 w-[39%]">
                            PKWTT (Karyawan Tetap)
                          </TableHead>
                          <TableHead className="text-xs font-bold text-amber-600 dark:text-amber-400 w-[39%]">
                            PKWT (Karyawan Kontrak)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Perolehan Cuti</TableCell>
                          <TableCell className="text-foreground/90">
                            Prorata setelah 1 tahun bekerja dengan formula <strong>(12 - bulan join)</strong>
                          </TableCell>
                          <TableCell className="text-foreground/90">
                            <strong>Full dari awal masuk</strong>
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Hak Cuti Tahunan</TableCell>
                          <TableCell className="text-foreground/90">
                            <strong>12 hari per-tahun</strong> setelah melewati 1 tahun masa kerja
                          </TableCell>
                          <TableCell className="text-foreground/90">
                            Prorata menyesuaikan lama kontrak.<br />
                            <span className="text-[11px] text-muted-foreground">Contoh: kontrak 6 bulan hak cuti hanya 6 hari (1 hari / bulan).</span>
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Refill Saldo</TableCell>
                          <TableCell className="text-foreground/90">
                            Saldo 12 hari di-refill setiap awal tahun <strong>(1 Januari)</strong>
                          </TableCell>
                          <TableCell className="text-foreground/90">
                            Di-refill sesuai periode perpanjangan kontrak
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Cuti Bersama</TableCell>
                          <TableCell className="text-foreground/90">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Memotong Cuti Tahunan</span>
                          </TableCell>
                          <TableCell className="text-foreground/90">
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">Memotong Cuti Tahunan</span>
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Carry Forward</TableCell>
                          <TableCell className="text-foreground/90">
                            Sisa cuti tahun berjalan dapat di-carry forward ke tahun berikutnya dengan <strong>batas max sampai 30 Juni</strong>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            — (Tidak ada carry forward antar kontrak)
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Expired</TableCell>
                          <TableCell className="text-foreground/90">
                            Sisa cuti tahun sebelumnya yang masih ada setelah <strong>30 Juni</strong> akan <strong>expired otomatis oleh sistem</strong>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Berakhir bersamaan dengan habisnya masa kontrak
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Extend Kontrak</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-foreground/90">
                            Sisa cuti dari kontrak sebelumnya tidak dibawa ke kontrak baru. Hak cuti akan disesuaikan kembali berdasarkan masa kontrak yang baru.
                          </TableCell>
                        </TableRow>

                        <TableRow className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-foreground py-2.5">Perubahan Status (PKWT ke PKWTT)</TableCell>
                          <TableCell className="text-muted-foreground">—</TableCell>
                          <TableCell className="text-foreground/90 space-y-1">
                            <p>
                              <strong>1. Melanjutkan masa kerja:</strong> sisa cuti dapat tetap digunakan dan selanjutnya mengikuti ketentuan cuti PKWTT (refill saldo di awal tahun 1 Januari).
                            </p>
                            <p>
                              <strong>2. TIDAK melanjutkan masa kerja:</strong> saldo cuti akan dihapus dan masa kerja PKWTT dihitung mulai dari awal. Hak cuti PKWTT akan diberikan setelah 1 tahun bekerja dan dihitung secara prorata (12 - bulan join).
                            </p>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-border bg-muted/30 px-6 py-3 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-muted-foreground">
                Kebijakan Terintegrasi Sistem HCM &bull; PT Gesit
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPolicyModal(false)}
                className="h-8 text-xs font-semibold"
              >
                Tutup
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AttendanceRequest;
