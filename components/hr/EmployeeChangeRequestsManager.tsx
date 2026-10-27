'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCcw,
  User,
  ArrowRight,
  FileText,
  AlertCircle,
  Check,
  X,
  Building2,
  Calendar,
  Eye,
  ExternalLink,
  Filter
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { UserAvatar } from '../UserAvatar';
import {
  EmployeeDataChangeRequest,
  fetchEmployeeChangeRequests,
  approveEmployeeChangeRequest,
  rejectEmployeeChangeRequest,
  EMPLOYEE_FIELD_LABELS,
  isHRManagerOrAdmin
} from '../../lib/employeeChangeRequestService';

interface EmployeeChangeRequestsManagerProps {
  currentUser: any;
  onRefreshNeeded?: () => void;
}

export const EmployeeChangeRequestsManager: React.FC<EmployeeChangeRequestsManagerProps> = ({
  currentUser,
  onRefreshNeeded
}) => {
  const [requests, setRequests] = useState<EmployeeDataChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals for Decision
  const [selectedRequest, setSelectedRequest] = useState<EmployeeDataChangeRequest | null>(null);
  const [decisionType, setDecisionType] = useState<'approve' | 'reject' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Detail Modal
  const [viewingRequest, setViewingRequest] = useState<EmployeeDataChangeRequest | null>(null);

  const canApprove = isHRManagerOrAdmin(currentUser);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmployeeChangeRequests();
      setRequests(data);
    } catch (err: any) {
      toast.error('Gagal memuat daftar permohonan: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      // Status filter
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;

      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = req.employeeName.toLowerCase().includes(q);
        const matchesCode = (req.employeeCode || '').toLowerCase().includes(q);
        const matchesRequester = req.requestedByName.toLowerCase().includes(q);
        const matchesDept = (req.department || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesRequester && !matchesDept) return false;
      }

      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  const pendingCount = useMemo(() => {
    return requests.filter(r => r.status === 'Pending').length;
  }, [requests]);

  const handleOpenDecision = (req: EmployeeDataChangeRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setDecisionType(type);
    setDecisionNotes(type === 'approve' ? 'Disetujui oleh HR Manager' : '');
  };

  const handleExecuteDecision = async () => {
    if (!selectedRequest || !decisionType) return;

    if (decisionType === 'reject' && !decisionNotes.trim()) {
      toast.error('Harap masukkan alasan penolakan');
      return;
    }

    setIsProcessing(true);
    try {
      if (decisionType === 'approve') {
        const res = await approveEmployeeChangeRequest(selectedRequest, currentUser, decisionNotes);
        if (!res.success) throw new Error(res.error);
        toast.success(`Perubahan data untuk ${selectedRequest.employeeName} berhasil disetujui & diterapkan ke sistem!`);
      } else {
        const res = await rejectEmployeeChangeRequest(selectedRequest, currentUser, decisionNotes);
        if (!res.success) throw new Error(res.error);
        toast.success(`Perubahan data untuk ${selectedRequest.employeeName} telah ditolak.`);
      }

      setSelectedRequest(null);
      setDecisionType(null);
      setDecisionNotes('');
      await loadRequests();
      onRefreshNeeded?.();
    } catch (err: any) {
      toast.error('Gagal memproses permohonan: ' + (err.message || 'Error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFieldValue = (key: string, val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-muted-foreground/60 italic font-normal">— kosong —</span>;
    }
    if (typeof val === 'boolean') {
      return val ? 'Ya' : 'Tidak';
    }
    // File / URL preview
    if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
      return (
        <a
          href={val}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={12} /> Buka Dokumen/Foto
        </a>
      );
    }
    return String(val);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Info */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              Persetujuan Perubahan Data Karyawan
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {pendingCount} Menunggu Review
                </span>
              )}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kebijakan HR: Setiap perubahan data profil atau master karyawan yang diajukan oleh Karyawan atau HR Staff wajib melalui approval HR Manager sebelum diterapkan.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadRequests}
          disabled={isLoading}
          className="text-xs font-semibold self-start sm:self-auto shrink-0"
        >
          <RefreshCcw size={13} className={`mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('Pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'Pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Menunggu Review ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Semua Riwayat ({requests.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'Approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Disetujui ({requests.filter(r => r.status === 'Approved').length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('Rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'Rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            Ditolak ({requests.filter(r => r.status === 'Rejected').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari karyawan / pemohon..."
            className="pl-9 h-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Main Request Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="text-xs font-bold py-3">Karyawan</TableHead>
                <TableHead className="text-xs font-bold py-3">Diajukan Oleh</TableHead>
                <TableHead className="text-xs font-bold py-3">Perubahan Field</TableHead>
                <TableHead className="text-xs font-bold py-3">Waktu Pengajuan</TableHead>
                <TableHead className="text-xs font-bold py-3">Status</TableHead>
                <TableHead className="text-xs font-bold py-3 text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                      Memuat daftar permohonan...
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 size={32} className="text-emerald-500/60" />
                      <p className="text-xs font-semibold text-foreground">
                        {statusFilter === 'Pending' ? 'Tidak ada permohonan yang menunggu persetujuan' : 'Tidak ada permohonan ditemukan'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Semua perubahan data karyawan up-to-date dan telah tersinkronisasi.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map(req => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';
                  const isRejected = req.status === 'Rejected';

                  return (
                    <TableRow
                      key={req.id}
                      onClick={() => setViewingRequest(req)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar name={req.employeeName} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{req.employeeName}</div>
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              {req.employeeCode && <span>{req.employeeCode}</span>}
                              {req.department && <span>· {req.department}</span>}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="text-xs font-semibold text-foreground">{req.requestedByName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {req.source === 'self_service' ? 'Karyawan (Mandiri)' : req.requestedByRole || 'HR Staff'}
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {req.changedFields.slice(0, 3).map(f => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="text-[10px] py-0 px-1.5 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                            >
                              {EMPLOYEE_FIELD_LABELS[f] || f}
                            </Badge>
                          ))}
                          {req.changedFields.length > 3 && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                              +{req.changedFields.length - 3} lainnya
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>

                      <TableCell className="py-3">
                        {isPending && (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold gap-1">
                            <Clock size={11} className="animate-spin" /> Menunggu HR Manager
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold gap-1">
                            <CheckCircle2 size={11} /> Disetujui
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold gap-1">
                            <XCircle size={11} /> Ditolak
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingRequest(req);
                            }}
                            className="h-7 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <Eye size={13} className="mr-1" /> Tinjau
                          </Button>

                          {isPending && canApprove && (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDecision(req, 'approve');
                                }}
                                className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                                title="Setujui Perubahan"
                              >
                                <Check size={12} className="mr-1" /> Setujui
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDecision(req, 'reject');
                                }}
                                className="h-7 px-2.5 text-xs font-semibold shadow-xs cursor-pointer"
                                title="Tolak Perubahan"
                              >
                                <X size={12} className="mr-1" /> Tolak
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* DETAIL MODAL: VIEW BEFORE VS AFTER */}
      <Dialog open={!!viewingRequest} onOpenChange={(open) => !open && setViewingRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewingRequest && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <FileText size={18} className="text-primary" />
                    Detail Perubahan Data Karyawan
                  </DialogTitle>
                  {viewingRequest.status === 'Pending' ? (
                    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 text-xs font-semibold">
                      Menunggu Approval
                    </Badge>
                  ) : viewingRequest.status === 'Approved' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-xs font-semibold">
                      Disetujui
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30 text-xs font-semibold">
                      Ditolak
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs">
                  Bandingkan nilai data sebelum dan nilai baru yang diajukan.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Employee & Requester Card */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Karyawan</span>
                    <p className="font-bold text-foreground mt-0.5">{viewingRequest.employeeName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {viewingRequest.employeeCode || '—'} · {viewingRequest.department || '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px] font-medium">Diajukan Oleh</span>
                    <p className="font-semibold text-foreground mt-0.5">{viewingRequest.requestedByName}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {viewingRequest.source === 'self_service' ? 'Karyawan Mandiri' : viewingRequest.requestedByRole || 'HR Staff'} ·{' '}
                      {new Date(viewingRequest.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Diff Table */}
                <div className="rounded-xl border border-border/80 overflow-hidden">
                  <div className="bg-muted/60 px-4 py-2 border-b border-border/60 text-xs font-bold text-foreground flex items-center justify-between">
                    <span>Perbandingan Nilai Data ({viewingRequest.changedFields.length} field berubah)</span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="text-xs font-bold w-[180px]">Field / Kolom</TableHead>
                        <TableHead className="text-xs font-bold">Data Lama (Before)</TableHead>
                        <TableHead className="text-xs font-bold">Data Baru (Proposed After)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingRequest.changedFields.map(field => {
                        const label = EMPLOYEE_FIELD_LABELS[field] || field;
                        const oldVal = viewingRequest.originalData[field];
                        const newVal = viewingRequest.proposedChanges[field];

                        return (
                          <TableRow key={field} className="hover:bg-muted/20">
                            <TableCell className="font-semibold text-xs text-foreground align-top py-2.5">
                              {label}
                            </TableCell>
                            <TableCell className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20 align-top py-2.5">
                              <span className="line-through decoration-rose-500/50">
                                {formatFieldValue(field, oldVal)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50/50 dark:bg-emerald-950/30 align-top py-2.5">
                              {formatFieldValue(field, newVal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Review Notes (if already decided) */}
                {viewingRequest.reviewNotes && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 text-xs">
                    <span className="text-muted-foreground font-semibold block text-[11px]">
                      Catatan Peninjauan ({viewingRequest.reviewedByName || 'HR Manager'})
                    </span>
                    <p className="mt-1 text-foreground font-medium">{viewingRequest.reviewNotes}</p>
                    {viewingRequest.reviewedAt && (
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        Diputuskan pada: {new Date(viewingRequest.reviewedAt).toLocaleString('id-ID')}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 pt-3 border-t border-border flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingRequest(null)}
                  className="text-xs"
                >
                  Tutup
                </Button>

                {viewingRequest.status === 'Pending' && canApprove && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const target = viewingRequest;
                        setViewingRequest(null);
                        handleOpenDecision(target, 'reject');
                      }}
                      className="text-xs font-semibold"
                    >
                      <X size={13} className="mr-1" /> Tolak
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const target = viewingRequest;
                        setViewingRequest(null);
                        handleOpenDecision(target, 'approve');
                      }}
                      className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check size={13} className="mr-1" /> Setujui Perubahan
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DECISION MODAL: APPROVE / REJECT WITH NOTES */}
      <Dialog open={!!selectedRequest && !!decisionType} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          {selectedRequest && decisionType && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  {decisionType === 'approve' ? (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      Setujui Perubahan Data Karyawan
                    </>
                  ) : (
                    <>
                      <XCircle size={18} className="text-rose-600" />
                      Tolak Perubahan Data Karyawan
                    </>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {decisionType === 'approve'
                    ? `Perubahan ${selectedRequest.changedFields.length} field untuk ${selectedRequest.employeeName} akan langsung diterapkan ke master data karyawan.`
                    : `Data master untuk ${selectedRequest.employeeName} tidak akan berubah. Berikan alasan penolakan.`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-semibold text-foreground space-y-1 block">
                  <span>{decisionType === 'approve' ? 'Catatan Persetujuan (Opsional)' : 'Alasan Penolakan (Wajib Diisi)'}</span>
                  <textarea
                    rows={3}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder={
                      decisionType === 'approve'
                        ? 'Contoh: Data KTP & Rekening telah diverifikasi sesuai berkas fisik.'
                        : 'Contoh: Nomor rekening tidak cocok dengan nama pada buku tabungan.'
                    }
                    className="w-full text-xs p-2.5 rounded-lg border border-input bg-background text-foreground outline-none focus:border-primary resize-none"
                  />
                </label>
              </div>

              <DialogFooter className="mt-3 pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                  disabled={isProcessing}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExecuteDecision}
                  disabled={isProcessing}
                  className={`text-xs font-semibold ${
                    decisionType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {isProcessing ? 'Memproses...' : decisionType === 'approve' ? 'Ya, Setujui Sekarang' : 'Tolak Pengajuan'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
