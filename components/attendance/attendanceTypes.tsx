import React from 'react';
import {
  Stethoscope, Gift, Receipt
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AttendanceSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  work_start?: string;
  work_end?: string;
  grace_period_minutes: number;
  break_duration_minutes?: number;
  is_active: boolean;
  is_flexible?: boolean;
  flex_start?: string;
  flex_end?: string;
  required_work_hours?: number;
}

export interface OfficeLocation {
  id: string | number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at?: string;
  assignment_mode?: 'all' | 'restricted';
  assigned_user_ids?: string[];
}

export interface LocationMeta {
  cleanAddress: string;
  assignmentMode: 'all' | 'restricted';
  assignedUserIds: string[];
}

export function parseLocationMeta(loc: Partial<OfficeLocation> | null | undefined): LocationMeta {
  if (!loc) return { cleanAddress: '', assignmentMode: 'all', assignedUserIds: [] };

  const rawAddr = loc.address || '';
  const match = rawAddr.match(/\[RESTRICTED_USERS:([^\]]*)\]/);
  const embeddedIds = match ? match[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  const cleanAddress = rawAddr.replace(/\[RESTRICTED_USERS:[^\]]*\]/, '').trim();

  // Native column takes priority if present, otherwise fallback to embedded marker
  const assignedUserIds = (Array.isArray(loc.assigned_user_ids) && loc.assigned_user_ids.length > 0)
    ? loc.assigned_user_ids.map(String)
    : embeddedIds;

  const assignmentMode = loc.assignment_mode || (assignedUserIds.length > 0 ? 'restricted' : 'all');

  return {
    cleanAddress,
    assignmentMode,
    assignedUserIds
  };
}

export function encodeLocationAddress(cleanAddress: string, mode: 'all' | 'restricted', userIds: string[]): string {
  const base = (cleanAddress || '').replace(/\[RESTRICTED_USERS:[^\]]*\]/, '').trim();
  if (mode === 'restricted' && userIds && userIds.length > 0) {
    return `${base}\n[RESTRICTED_USERS:${userIds.join(',')}]`;
  }
  return base;
}

export function isUserAllowedAtLocation(
  user: { id?: string | number; email?: string } | null | undefined,
  loc: OfficeLocation
): boolean {
  if (!loc || !loc.is_active) return false;
  const meta = parseLocationMeta(loc);
  if (meta.assignmentMode !== 'restricted' || meta.assignedUserIds.length === 0) {
    return true; // Terbuka untuk semua karyawan
  }
  if (!user) return false;
  const uid = user.id !== undefined && user.id !== null ? String(user.id).trim() : '';
  const uemail = (user.email || '').trim().toLowerCase();

  return meta.assignedUserIds.some(assignedId => {
    const aid = String(assignedId).trim();
    if (aid === uid) return true;
    if (uemail && aid.toLowerCase() === uemail) return true;
    return false;
  });
}


export interface UserAccount {
  id: string;
  full_name: string;
  email?: string;
  username?: string;
  employee_code?: string;
  department?: string;
  company?: string;
  branch?: string;
  job_title?: string;
  job_level?: string;
  employment_type?: string;
  groups?: string[];
  avatar_url?: string;
  status?: string;
  employment_status?: string;
  join_date?: string;
  separation_date?: string;
  role?: string;
  supervisor_id?: string | null;
  manager_id?: string | null;
  vp_id?: string | null;
  attendance_supervisor_id?: string | null;
  attendance_hr_id?: string | null;
  attendance_manager_id?: string | null;
  attendance_vp_id?: string | null;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_in_location_id: string | null;
  clock_out_location_id: string | null;
  status: 'present' | 'late' | 'absent' | 'leave' | 'sick' | 'permission' | 'holiday' | 'half_day';
  clock_in_office_name?: string;
  clock_out_office_name?: string;
  total_work_minutes: number | null;
  total_overtime_minutes: number | null;
  notes: string | null;
  photo_url?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  user_name?: string;
  department?: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'annual' | 'compensatory' | 'marriage' | 'bereavement' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  attachments: string[];
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'cancelled';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'pending_level_4' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  department?: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

export interface OvertimeRequest {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  reason: string;
  project_or_task: string | null;
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'cancelled';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'pending_level_4' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  user_name?: string;
  department?: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

export interface AttendanceSettings {
  id: string;
  default_schedule_id: string | null;
  work_days: number[];
  auto_approve_overtime: boolean;
  max_clock_in_distance_meters: number;
}

export interface ReimbursementRequest {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  date: string | null;
  description: string;
  status: 'pending' | 'pending_line_1' | 'pending_line_2' | 'pending_senior' | 'pending_office' | 'approved' | 'rejected' | 'paid';
  approval_status?: 'pending' | 'pending_level_2' | 'pending_level_3' | 'pending_level_4' | 'approved' | 'rejected';
  current_approval_level?: number;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  line1_approved_by?: string | null;
  line1_approved_at?: string | null;
  line2_approved_by?: string | null;
  line2_approved_at?: string | null;
  senior_approved_by?: string | null;
  senior_approved_at?: string | null;
  office_approved_by?: string | null;
  office_approved_at?: string | null;
}

export type ViewTab = 'dashboard' | 'pengajuan' | 'locations' | 'reimbursement';
export type DashboardSubTab = 'overview' | 'riwayat';

// ─── Constants ───────────────────────────────────────────────────────────────

export const LEAVE_TYPES = [
  { id: 'annual', label: 'Cuti Tahunan', icon: '🏖️', badge: 'bg-blue-600/10 text-blue-600 border-blue-600/20', selected: 'border-blue-600 bg-blue-600/10 text-blue-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'sick', label: 'Sakit', icon: '🤒', badge: 'bg-red-600/10 text-red-600 border-red-600/20', selected: 'border-red-600 bg-red-600/10 text-red-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'personal', label: 'Izin Pribadi', icon: '📋', badge: 'bg-amber-600/10 text-amber-600 border-amber-600/20', selected: 'border-amber-600 bg-amber-600/10 text-amber-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'maternity', label: 'Cuti Melahirkan', icon: '👶', badge: 'bg-pink-600/10 text-pink-600 border-pink-600/20', selected: 'border-pink-600 bg-pink-600/10 text-pink-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'paternity', label: 'Cuti Ayah', icon: '👨‍🍼', badge: 'bg-violet-600/10 text-violet-600 border-violet-600/20', selected: 'border-violet-600 bg-violet-600/10 text-violet-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'unpaid', label: 'Cuti Tanpa Gaji', icon: '💰', badge: 'bg-slate-600/10 text-slate-600 border-slate-600/20', selected: 'border-slate-600 bg-slate-600/10 text-slate-600 font-bold', textDefault: 'text-slate-600 font-medium' },
  { id: 'other', label: 'Lainnya', icon: '📝', badge: 'bg-emerald-600/10 text-emerald-600 border-emerald-600/20', selected: 'border-emerald-600 bg-emerald-600/10 text-emerald-600 font-bold', textDefault: 'text-slate-600 font-medium' },
];

export const STATUS_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
  present: { label: 'Hadir', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  late: { label: 'Terlambat', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  absent: { label: 'Tidak Hadir', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  leave: { label: 'Cuti/Izin', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  sick: { label: 'Sakit', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  permission: { label: 'Izin', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  holiday: { label: 'Hari Libur', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' },
  half_day: { label: 'Setengah Hari', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20', dot: 'bg-cyan-500' },
  pending: { label: 'Menunggu Supervisor', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  pending_line_1: { label: 'Menunggu Supervisor', badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  pending_line_2: { label: 'Menunggu HR', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  pending_senior: { label: 'Menunggu Manager', badge: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  pending_office: { label: 'Menunggu VP', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
  approved: { label: 'Disetujui', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  rejected: { label: 'Ditolak', badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  cancelled: { label: 'Dibatalkan', badge: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 border-zinc-500/20', dot: 'bg-zinc-500' },
  paid: { label: 'Dibayar', badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
};

export const GPS_DOT: Record<string, string> = {
  inside: 'bg-emerald-500 shadow-[0_0_6px_#10b981]',
  outside: 'bg-red-500 shadow-[0_0_6px_#ef4444]',
  restricted: 'bg-amber-500 shadow-[0_0_6px_#f59e0b]',
  checking: 'bg-slate-400 shadow-[0_0_6px_#94a3b8]',
  unknown: 'bg-slate-400 shadow-[0_0_6px_#94a3b8]',
};

export const GPS_BG: Record<string, string> = {
  inside: 'bg-emerald-500/10 border border-emerald-500/20',
  outside: 'bg-red-500/10 border border-red-500/20',
  restricted: 'bg-amber-500/10 border border-amber-500/20',
  checking: 'bg-slate-400/10 border border-slate-400/20',
  unknown: 'bg-slate-400/10 border border-slate-400/20',
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const isPendingApprovalStatus = (st: string) =>
  ['pending', 'pending_line_1', 'pending_line_2', 'pending_senior', 'pending_office'].includes(st);

export const buildApprovalSteps = (req: any): { label: string; by: string | null | undefined; at: string | null | undefined }[] => {
  const steps: { label: string; by: string | null | undefined; at: string | null | undefined }[] = [];
  if (req.line1_approved_by) steps.push({ label: 'Supervisor', by: req.line1_approved_by, at: req.line1_approved_at });
  if (req.line2_approved_by) steps.push({ label: 'HR', by: req.line2_approved_by, at: req.line2_approved_at });
  if (req.senior_approved_by) steps.push({ label: 'Manager', by: req.senior_approved_by, at: req.senior_approved_at });
  if (req.office_approved_by) steps.push({ label: 'VP', by: req.office_approved_by, at: req.office_approved_at });
  if (steps.length === 0 && req.approved_by) steps.push({ label: req.status === 'rejected' ? 'Ditolak' : 'Approver', by: req.approved_by, at: req.approved_at });
  return steps;
};

export const REIMBURSEMENT_TYPES = [
  { id: 'medical_glasses_frame', label: 'Frame Kacamata', icon: <Stethoscope size={16} />, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20', selectedBorder: 'border-rose-500', selectedBg: 'bg-rose-500/10' },
  { id: 'medical_glasses_lens', label: 'Lensa Kacamata', icon: <Stethoscope size={16} />, color: 'text-indigo-600 bg-indigo-500/10 border-indigo-500/20', selectedBorder: 'border-indigo-500', selectedBg: 'bg-indigo-500/10' },
  { id: 'medical_glasses', label: 'Kacamata / Lensa (Umum)', icon: <Stethoscope size={16} />, color: 'text-rose-600 bg-rose-500/10 border-rose-500/20', selectedBorder: 'border-rose-500', selectedBg: 'bg-rose-500/10' },
  { id: 'medical_doctor', label: 'Konsultasi Dokter', icon: <Gift size={16} />, color: 'text-blue-600 bg-blue-500/10 border-blue-500/20', selectedBorder: 'border-blue-500', selectedBg: 'bg-blue-500/10' },
  { id: 'medical_medicine', label: 'Obat / Resep', icon: <Receipt size={16} />, color: 'text-violet-600 bg-violet-500/10 border-violet-500/20', selectedBorder: 'border-violet-500', selectedBg: 'bg-violet-500/10' },
  { id: 'medical_dental', label: 'Perawatan Gigi', icon: <Receipt size={16} />, color: 'text-amber-600 bg-amber-500/10 border-amber-500/20', selectedBorder: 'border-amber-500', selectedBg: 'bg-amber-500/10' },
  { id: 'medical_other', label: 'Medis Lainnya', icon: <Receipt size={16} />, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20', selectedBorder: 'border-emerald-500', selectedBg: 'bg-emerald-500/10' },
];

export const getReimbType = (cat: string) =>
  REIMBURSEMENT_TYPES.find(t => t.id === cat) ||
  REIMBURSEMENT_TYPES.find(t => t.id === cat.replace(/^medical_/, '')) || {
    id: cat,
    label: cat.replace(/^medical_/, '').replace(/\b\w/g, c => c.toUpperCase()),
    icon: <Receipt size={16} />,
    color: 'text-slate-600 bg-slate-500/10 border-slate-500/20',
    selectedBorder: 'border-slate-500',
    selectedBg: 'bg-slate-500/10',
  };

export const formatTime = (iso: string | null): string => {
  if (!iso) return '-';
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
  return new Date(iso).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatMinutes = (mins: number | null): string => {
  if (!mins) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
};

export const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getGeoLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

export const renderStatusBadge = (status: string, size: 'sm' | 'md' = 'sm') => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold tracking-wide whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        config.badge
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </Badge>
  );
};
