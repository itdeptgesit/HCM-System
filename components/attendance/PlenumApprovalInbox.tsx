import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Timer,
  Wallet,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  FileText,
  Receipt,
  Stethoscope,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Building2,
  User,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  HelpCircle,
  TrendingUp,
  Briefcase,
  Bell,
  RotateCcw,
} from '@/components/ui/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Custom inline SVG icons for exact pixel matching with Plenum design
function CartIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export interface EvidenceItem {
  id: string;
  code?: string;
  title: string;
  roleBadge?: string;
  subtext?: string;
  type?: string;
  url?: string;
  date?: string;
}

export interface ApprovalInboxItem {
  id: string | number;
  rawId: string | number;
  type: 'procurement' | 'leave' | 'overtime' | 'reimbursement' | 'attendance_correction';
  code: string;
  title: string;
  subtitle?: string;
  categoryLabel: string;
  requesterId?: string;
  requesterName: string;
  requesterRole?: string;
  requesterAvatar?: string;
  department: string;
  company: string;
  createdAt: string;
  status: string;
  displayStatus: string;
  isPending: boolean;
  isOnMe: boolean;
  metricBadge: string;
  metricDelta?: string;
  lineBudgetLabel?: string;
  dueLabel?: string;
  dueTone?: 'yellow' | 'red' | 'gray' | 'blue';
  reason?: string;
  commentAuthor?: string;
  commentRole?: string;
  commentTime?: string;
  commentText?: string;
  whatHappensNext?: string;
  evidenceDocs?: EvidenceItem[];
  budgetLine?: {
    code: string;
    description: string;
    budgetThreshold: number;
    newThreshold: number;
    committed: number;
    thisPurchase: number;
    forecast: number;
    unitPrefix?: string;
  };
  quotaStats?: {
    total: number;
    used: number;
    requested: number;
    remaining: number;
    unit: string;
    lineCode?: string;
    lineTitle?: string;
    committedLabel?: string;
    requestedLabel?: string;
    forecastLabel?: string;
  };
  steps: {
    label: string;
    approver: string;
    avatar?: string;
    icon?: 'cart' | 'user' | 'clock' | 'file';
    status: 'completed' | 'current' | 'pending' | 'rejected';
  }[];
  rawItem?: any;
}

interface PlenumApprovalInboxProps {
  items?: ApprovalInboxItem[];
  currentUser?: any;
  onApprove?: (item: ApprovalInboxItem) => Promise<void>;
  onReject?: (item: ApprovalInboxItem) => Promise<void>;
  onViewDoc?: (url: string) => void;
  loading?: boolean;
}

export function PlenumApprovalInbox({
  items = [],
  currentUser,
  onApprove,
  onReject,
  onViewDoc,
  loading = false,
}: PlenumApprovalInboxProps) {
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [tabFilter, setTabFilter] = useState<'on_me' | 'team' | 'done'>('on_me');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | number | null>(null);

  // Group items by On Me, Team, and Done (Menggunakan DATA REAL TANPA MERUBAH DATA)
  const onMeItems = useMemo(
    () => items.filter((i) => i.isOnMe && i.isPending),
    [items]
  );
  const teamItems = useMemo(
    () => items.filter((i) => !i.isOnMe && i.isPending),
    [items]
  );
  const doneItems = useMemo(() => items.filter((i) => !i.isPending), [items]);

  // Tab items based on selected tab
  const tabItems = useMemo(() => {
    if (tabFilter === 'on_me') return onMeItems;
    if (tabFilter === 'team') return teamItems;
    return doneItems;
  }, [tabFilter, onMeItems, teamItems, doneItems]);

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return tabItems;
    const q = searchQuery.toLowerCase();
    return tabItems.filter(
      (i) =>
        i.code.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        (i.subtitle && i.subtitle.toLowerCase().includes(q)) ||
        i.requesterName.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q)
    );
  }, [tabItems, searchQuery]);

  // Currently active selected item in right pane
  const activeItem = useMemo(() => {
    if (selectedId) {
      const found = items.find((i) => String(i.id) === String(selectedId));
      if (found) return found;
    }
    return filteredItems[0] || items[0] || null;
  }, [selectedId, filteredItems, items]);

  const handleActionApprove = async (item: ApprovalInboxItem) => {
    if (!onApprove) return;
    setProcessingId(item.id);
    try {
      await onApprove(item);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActionReject = async (item: ApprovalInboxItem) => {
    if (!onReject) return;
    setProcessingId(item.id);
    try {
      await onReject(item);
    } finally {
      setProcessingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return <Calendar className="size-3.5" />;
      case 'overtime':
        return <Timer className="size-3.5" />;
      case 'reimbursement':
        return <Wallet className="size-3.5" />;
      default:
        return <Clock className="size-3.5" />;
    }
  };

  return (
    <div className="w-full h-full flex-1 bg-white rounded-[24px] sm:rounded-[28px] shadow-[0_24px_70px_rgba(0,0,0,0.35)] border border-white/20 overflow-hidden flex flex-col lg:flex-row min-h-[640px]">
      {/* ──────────────────────────────────────────────────────────────
          LEFT COLUMN: MASTER LIST (~380px)
          ────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[380px] xl:w-[400px] border-r border-slate-100 flex flex-col bg-[#FAFBFD] shrink-0">
            {/* Tabs & Search */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              {/* Segmented Pill Switcher */}
              <div className="bg-[#EEF2F6] p-1 rounded-full grid grid-cols-3 gap-1 text-xs font-semibold text-slate-600">
                <button
                  type="button"
                  onClick={() => setTabFilter('on_me')}
                  className={cn(
                    'py-1.5 px-2 rounded-full transition-all text-center cursor-pointer truncate',
                    tabFilter === 'on_me'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  On me · {onMeItems.length}
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('team')}
                  className={cn(
                    'py-1.5 px-2 rounded-full transition-all text-center cursor-pointer truncate',
                    tabFilter === 'team'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  My team · {teamItems.length}
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('done')}
                  className={cn(
                    'py-1.5 px-2 rounded-full transition-all text-center cursor-pointer truncate',
                    tabFilter === 'done'
                      ? 'bg-white text-slate-900 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  Done today · {doneItems.length}
                </button>
              </div>

              {/* Capsule Search Input with ⌘K */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search approvals, records, people"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-10 text-xs bg-white border border-slate-200 rounded-full text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D63ED]/20 focus:border-[#1D63ED] transition-all shadow-2xs"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <kbd className="text-[10px] px-1.5 py-0.5 font-mono text-slate-400 bg-slate-100 rounded border border-slate-200">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {/* ON YOU Section */}
              {tabFilter === 'on_me' && (
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ON YOU
                  </div>
                  {onMeItems.length > 0 ? (
                    onMeItems.map((item) => {
                      const isSelected = activeItem && String(activeItem.id) === String(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            'p-3.5 rounded-2xl transition-all cursor-pointer border',
                            isSelected
                              ? 'bg-white border-[#1D63ED] shadow-[0_4px_16px_rgba(29,99,237,0.12)] ring-1 ring-[#1D63ED]/30'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-6 rounded-md bg-[#EDF4FF] text-[#1D63ED] flex items-center justify-center shrink-0">
                                {getTypeIcon(item.type)}
                              </div>
                              <span className="text-[12.5px] font-bold text-slate-900 truncate">
                                {item.code} · {item.title}
                              </span>
                            </div>
                            <span className="text-[12.5px] font-bold text-slate-900 shrink-0 font-mono">
                              {item.metricBadge}
                            </span>
                          </div>

                          {item.subtitle && (
                            <div className="mt-1 text-[11px] text-slate-500 line-clamp-1 pl-8">
                              {item.subtitle}
                            </div>
                          )}

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 pl-8">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar className="size-4.5 border border-slate-200 shrink-0">
                                {item.requesterAvatar && <AvatarImage src={item.requesterAvatar} />}
                                <AvatarFallback className="bg-slate-200 text-slate-700 text-[8px] font-bold">
                                  {item.requesterName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-medium text-slate-600 truncate">
                                {item.requesterName}
                              </span>
                              <span className="text-[10px] text-slate-300">•</span>
                              <span className="text-[10px] text-slate-400">{item.createdAt}</span>
                            </div>

                            <span
                              className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                                item.isPending
                                  ? 'bg-[#FEF7E8] text-[#B45309] border border-[#FDE68A]'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              )}
                            >
                              {item.displayStatus || 'Due today'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Tidak ada permohonan yang menunggu persetujuan Anda.
                    </div>
                  )}
                </div>
              )}

              {/* ON YOUR TEAM Section */}
              {tabFilter === 'team' && (
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ON YOUR TEAM
                  </div>
                  {teamItems.length > 0 ? (
                    teamItems.map((item) => {
                      const isSelected = activeItem && String(activeItem.id) === String(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            'p-3.5 rounded-2xl transition-all cursor-pointer border',
                            isSelected
                              ? 'bg-white border-[#1D63ED] shadow-[0_4px_16px_rgba(29,99,237,0.12)] ring-1 ring-[#1D63ED]/30'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-6 rounded-md bg-[#EDF4FF] text-[#1D63ED] flex items-center justify-center shrink-0">
                                {getTypeIcon(item.type)}
                              </div>
                              <span className="text-[12.5px] font-bold text-slate-900 truncate">
                                {item.code} · {item.title}
                              </span>
                            </div>
                            <span className="text-[12.5px] font-bold text-slate-900 shrink-0 font-mono">
                              {item.metricBadge}
                            </span>
                          </div>

                          {item.subtitle && (
                            <div className="mt-1 text-[11px] text-slate-500 line-clamp-1 pl-8">
                              {item.subtitle}
                            </div>
                          )}

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 pl-8">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar className="size-4.5 border border-slate-200 shrink-0">
                                {item.requesterAvatar && <AvatarImage src={item.requesterAvatar} />}
                                <AvatarFallback className="bg-slate-200 text-slate-700 text-[8px] font-bold">
                                  {item.requesterName.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[11px] font-medium text-slate-600 truncate">
                                Waiting on {item.requesterName}
                              </span>
                            </div>

                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                              Open
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Tidak ada permohonan aktif di antrean tim saat ini.
                    </div>
                  )}
                </div>
              )}

              {/* DONE TODAY Section */}
              {tabFilter === 'done' && (
                <div className="space-y-2">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SELESAI DIPROSES
                  </div>
                  {doneItems.length > 0 ? (
                    doneItems.map((item) => {
                      const isSelected = activeItem && String(activeItem.id) === String(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={cn(
                            'p-3.5 rounded-2xl bg-white border cursor-pointer hover:border-slate-300',
                            isSelected ? 'border-[#1D63ED] ring-1 ring-[#1D63ED]/20' : 'border-slate-200/80'
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.code} · {item.title}
                            </span>
                            <span className={cn(
                              'text-xs font-bold',
                              item.status === 'rejected' ? 'text-rose-600' : 'text-emerald-600'
                            )}>
                              {item.displayStatus}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {item.requesterName} • {item.department}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Belum ada permohonan yang selesai diproses hari ini.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────
              RIGHT COLUMN: DETAIL REVIEW WORKSPACE (FLEX-1)
              ────────────────────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden text-slate-900">
            {activeItem ? (
              <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden justify-between">
                
                {/* Scrollable Detail Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 min-h-0">
                  
                  {/* ── HEADER: TIKET, SUBTITLE & NILAI ── */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                          {activeItem.code} · {activeItem.title}
                        </h2>
                        <span
                          className={cn(
                            'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                            activeItem.status === 'rejected'
                              ? 'bg-[#FEECEC] text-[#DC2626] border border-[#FCA5A5]'
                              : activeItem.isPending
                              ? 'bg-[#FEF7E8] text-[#B45309] border border-[#FDE68A]'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          )}
                        >
                          {activeItem.displayStatus}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1.5">
                        {activeItem.department} · {activeItem.company} · Pemohon:{' '}
                        <strong className="text-slate-800 font-semibold">{activeItem.requesterName}</strong> · Tanggal pengajuan:{' '}
                        <span className="text-slate-600 font-medium">{activeItem.createdAt}</span>
                      </div>
                    </div>

                    {/* Big Value Metric */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                        {activeItem.metricBadge}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {activeItem.categoryLabel}
                      </div>
                    </div>
                  </div>

                  {/* ── WORKFLOW / STEPPER TIMELINE (SESUAI ALUR HIERARKI REAL) ── */}
                  <div className="flex items-center justify-between gap-3 py-1 overflow-x-auto">
                    {activeItem.steps && activeItem.steps.length > 0 ? (
                      activeItem.steps.map((st, idx) => (
                        <React.Fragment key={idx}>
                          <div className="flex items-center gap-2.5 shrink-0">
                            {st.status === 'completed' ? (
                              <div className="size-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-300 flex items-center justify-center shrink-0">
                                <Check className="size-3.5 stroke-[2.5]" />
                              </div>
                            ) : st.status === 'current' ? (
                              <div className="size-7 rounded-full ring-2 ring-[#1D63ED] ring-offset-1 overflow-hidden shrink-0 bg-[#1D63ED] text-white flex items-center justify-center text-xs font-bold">
                                {idx + 1}
                              </div>
                            ) : (
                              <div className="size-7 rounded-full bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 text-xs font-semibold">
                                {idx + 1}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {st.label}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {st.approver}
                              </div>
                            </div>
                          </div>

                          {idx < activeItem.steps.length - 1 && (
                            <div className="flex-1 h-px bg-slate-200 min-w-[24px]" />
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400">Menunggu verifikasi sistem</div>
                    )}
                  </div>

                  {/* ── STACKED PROGRESS CARD (HAK KUOTA / ALOKASI REAL KARYAWAN) ── */}
                  {activeItem.quotaStats && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {activeItem.quotaStats.lineCode || 'ANALISIS KUOTA & ALOKASI'}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {activeItem.quotaStats.lineTitle || 'Dampak pengajuan ini terhadap batas alokasi resmi karyawan'}
                        </p>
                      </div>

                      {/* Progress Bar Container with Markers */}
                      <div className="relative pt-6 pb-2">
                        <div className="absolute top-0 right-0 text-[11px] font-bold text-slate-800 flex flex-col items-end">
                          <span>Total Batas: {activeItem.quotaStats.total} {activeItem.quotaStats.unit}</span>
                        </div>

                        {/* Stacked Multi-Segment Bar */}
                        <div className="h-3.5 w-full bg-slate-100 rounded-full flex relative overflow-visible">
                          {/* Segment 1: Used (Royal Blue) */}
                          <div
                            className="bg-[#1D63ED] h-full rounded-l-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5, (activeItem.quotaStats.used / (activeItem.quotaStats.total || 1)) * 100))}%`,
                            }}
                            title={`Terpakai: ${activeItem.quotaStats.used} ${activeItem.quotaStats.unit}`}
                          />
                          {/* Segment 2: Requested (Amber) */}
                          <div
                            className="bg-[#E5B338] h-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(5, (activeItem.quotaStats.requested / (activeItem.quotaStats.total || 1)) * 100))}%`,
                            }}
                            title={`Pengajuan Ini: ${activeItem.quotaStats.requested} ${activeItem.quotaStats.unit}`}
                          />
                          {/* Segment 3: Remaining (Light Blue) */}
                          <div
                            className="bg-[#94BAF2] h-full rounded-r-full transition-all flex-1"
                            title={`Sisa Kuota: ${activeItem.quotaStats.remaining} ${activeItem.quotaStats.unit}`}
                          />
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap items-center gap-5 pt-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[#1D63ED]" />
                          <span>Terpakai: <strong>{activeItem.quotaStats.used} {activeItem.quotaStats.unit}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[#E5B338]" />
                          <span>Pengajuan Ini: <strong>{activeItem.quotaStats.requested} {activeItem.quotaStats.unit}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-[#94BAF2]" />
                          <span>Sisa Kuota: <strong>{activeItem.quotaStats.remaining} {activeItem.quotaStats.unit}</strong></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── EVIDENCE SECTION (LAMPIRAN ASLI TANPA DUMMY) ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        EVIDENCE (LAMPIRAN RESMI)
                      </span>
                      <span className="text-[10px] font-medium text-slate-400">
                        Read only
                      </span>
                    </div>

                    {/* Evidence Rows Container */}
                    {activeItem.evidenceDocs && activeItem.evidenceDocs.length > 0 ? (
                      <div className="rounded-2xl border border-slate-100 bg-white divide-y divide-slate-100 shadow-2xs">
                        {activeItem.evidenceDocs.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8 rounded-lg bg-[#EDF4FF] text-[#1D63ED] flex items-center justify-center shrink-0">
                                <FileText className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 truncate">
                                    {ev.title}
                                  </span>
                                  {ev.type && (
                                    <span className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                                      {ev.type}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {ev.date || 'Tersimpan di Cloud'}
                                </div>
                              </div>
                            </div>

                            {ev.url ? (
                              <button
                                type="button"
                                onClick={() => (onViewDoc ? onViewDoc(ev.url!) : window.open(ev.url, '_blank'))}
                                className="text-xs font-bold text-[#1D63ED] hover:text-[#1554cf] px-3 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
                              >
                                Open
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 px-2 py-1">Tersedia</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400 text-center">
                        Tidak ada berkas bukti lampiran khusus yang diunggah untuk permohonan ini.
                      </div>
                    )}

                    {/* Note / Comment Card (Catatan Alasan Asli Pemohon) */}
                    <div className="rounded-2xl bg-[#FAFBFD] border border-slate-200/80 p-4 flex items-start gap-3 mt-3">
                      <Avatar className="size-8 border border-slate-200 shrink-0 mt-0.5">
                        {activeItem.requesterAvatar && <AvatarImage src={activeItem.requesterAvatar} />}
                        <AvatarFallback className="bg-slate-200 text-slate-700 text-xs font-bold">
                          {activeItem.requesterName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900">
                          {activeItem.requesterName}{' '}
                          <span className="font-normal text-slate-400">
                            • Catatan Alasan Pemohon
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1 font-normal">
                          "{activeItem.reason || 'Tidak ada catatan alasan tambahan yang disertakan.'}"
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── STICKY ACTION FOOTER BAR ── */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
                  {/* Left: What happens next */}
                  <div className="text-xs text-slate-500 max-w-md">
                    <span className="font-bold text-[#1D63ED] mr-1">
                      What happens next:
                    </span>
                    <span>
                      {activeItem.isPending
                        ? 'Menyetujui permohonan ini akan meneruskan ke jenjang verifikasi berikutnya atau mengesahkan pencatatan resmi di sistem HR.'
                        : `Permohonan telah berstatus ${activeItem.displayStatus}.`}
                    </span>
                  </div>

                  {/* Right Buttons: Reject, Approve with change, Approve */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {activeItem.isPending ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={processingId === activeItem.id || loading}
                          onClick={() => handleActionReject(activeItem)}
                          className="bg-[#FEECEC] text-[#DC2626] hover:bg-[#FCD8D8] text-xs font-bold cursor-pointer h-9 px-4 rounded-xl border-none shadow-2xs"
                        >
                          <span>Reject</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={processingId === activeItem.id || loading}
                          onClick={() => toast.info('Fitur koreksi persetujuan terbuka.')}
                          className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer h-9 px-4 rounded-xl shadow-2xs"
                        >
                          <span>Approve with change</span>
                        </Button>

                        <Button
                          size="sm"
                          disabled={processingId === activeItem.id || loading}
                          onClick={() => handleActionApprove(activeItem)}
                          className="bg-[#1D63ED] hover:bg-[#1554cf] text-white text-xs font-bold cursor-pointer h-9 px-5 rounded-xl shadow-md gap-1"
                        >
                          <span>Approve {activeItem.metricBadge}</span>
                        </Button>
                      </>
                    ) : (
                      <div className="text-xs font-semibold text-slate-400 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        Status: {activeItem.displayStatus}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <FileText className="size-12 stroke-1 text-slate-300 mb-3" />
                <p className="font-semibold text-slate-700">Tidak ada pengajuan yang dipilih</p>
                <p className="text-xs text-slate-400 mt-1">Pilih salah satu tiket di sebelah kiri untuk melihat detail</p>
              </div>
            )}
          </div>
        </div>
  );
}
