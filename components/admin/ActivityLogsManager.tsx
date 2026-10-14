import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Calendar,
  FileSpreadsheet,
  Clock,
  Layers,
  Eye,
  Info,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchActivityLogs, AuditLogItem } from '../../lib/auditLogger';
import { UserAccount } from '../../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserAvatar } from '../UserAvatar';
import { useToast } from '../ToastProvider';

interface ActivityLogsManagerProps {
  currentUser?: UserAccount | null;
}

export const ActivityLogsManager: React.FC<ActivityLogsManagerProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchActivityLogs(300);
      setLogs(data);
    } catch (err: any) {
      console.error('Failed to load activity logs:', err);
      showToast('Gagal memuat log aktivitas sistem.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Unique modules list for filter dropdown
  const uniqueModules = useMemo(() => {
    const s = new Set<string>();
    logs.forEach(l => { if (l.module) s.add(l.module); });
    return Array.from(s).sort();
  }, [logs]);

  // Unique actions list for filter dropdown
  const uniqueActions = useMemo(() => {
    const s = new Set<string>();
    logs.forEach(l => { if (l.action) s.add(l.action); });
    return Array.from(s).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchUser = log.user_name.toLowerCase().includes(q) || (log.user_email || '').toLowerCase().includes(q);
        const matchAction = log.action.toLowerCase().includes(q);
        const matchModule = log.module.toLowerCase().includes(q);
        const matchDetails = log.details.toLowerCase().includes(q);
        if (!matchUser && !matchAction && !matchModule && !matchDetails) return false;
      }

      // Module Filter
      if (moduleFilter !== 'all' && log.module.toLowerCase() !== moduleFilter.toLowerCase()) {
        return false;
      }

      // Action Filter
      if (actionFilter !== 'all' && log.action.toLowerCase() !== actionFilter.toLowerCase()) {
        return false;
      }

      // Date Filter
      if (dateFilter !== 'all') {
        const logDate = new Date(log.created_at).getTime();
        const now = new Date().getTime();
        const diffDays = (now - logDate) / (1000 * 3600 * 24);

        if (dateFilter === 'today' && diffDays > 1) return false;
        if (dateFilter === '7days' && diffDays > 7) return false;
        if (dateFilter === '30days' && diffDays > 30) return false;
      }

      return true;
    });
  }, [logs, searchQuery, moduleFilter, actionFilter, dateFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const todayCount = logs.filter(l => {
      const d = new Date(l.created_at);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    const uniqueUsersCount = new Set(logs.map(l => l.user_name)).size;
    const criticalActionsCount = logs.filter(l => {
      const act = l.action.toLowerCase();
      return act.includes('delete') || act.includes('hapus') || act.includes('approve') || act.includes('setujui') || act.includes('reject') || act.includes('tolak');
    }).length;

    return { total, todayCount, uniqueUsersCount, criticalActionsCount };
  }, [logs]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data log yang sesuai untuk diekspor.', 'info');
      return;
    }

    const rows = filteredLogs.map((log, idx) => ({
      'No': idx + 1,
      'Waktu & Tanggal (WIB)': new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      'Nama Pengguna': log.user_name,
      'Email': log.user_email || '—',
      'Peran (Role)': log.user_role,
      'Modul Sistem': log.module,
      'Tipe Aksi': log.action,
      'Rincian Aktivitas': log.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit_Trail');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `GESIT_Audit_Trail_${dateStr}.xlsx`);
    showToast('File Excel log audit berhasil diunduh!', 'success');
  };

  // Color helper for action badge
  const getActionBadgeClass = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('create') || a.includes('tambah') || a.includes('approve') || a.includes('setujui')) {
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
    }
    if (a.includes('delete') || a.includes('hapus') || a.includes('reject') || a.includes('tolak')) {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
    }
    if (a.includes('update') || a.includes('edit') || a.includes('ubah') || a.includes('sync')) {
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    }
    if (a.includes('login') || a.includes('masuk')) {
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    }
    if (a.includes('import') || a.includes('export') || a.includes('unduh')) {
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20';
    }
    return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Keamanan, Kepatuhan & Audit
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
            <History className="h-6 w-6 text-primary" />
            Log Aktivitas & Audit Trail
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Pantau dan telusuri seluruh riwayat tindakan pengguna, perubahan data, persetujuan, dan keamanan sistem.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="text-xs h-9 px-3 gap-1.5 font-medium shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Ekspor Excel (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="text-xs h-9 px-3 gap-1.5 font-medium shadow-2xs"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card shadow-2xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Log Aktivitas</span>
              <Activity size={16} className="text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">
              {stats.total.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Seluruh rekam jejak yang tersimpan di sistem</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-2xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Aktivitas Hari Ini</span>
              <Calendar size={16} className="text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">
              {stats.todayCount.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Tindakan tercatat pada hari kalender saat ini</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-2xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>User Beraktivitas</span>
              <UserCheck size={16} className="text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">
              {stats.uniqueUsersCount} Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Jumlah personel yang terekam melakukan interaksi</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-2xs rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Aksi Krusial</span>
              <AlertTriangle size={16} className="text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-foreground tracking-tight">
              {stats.criticalActionsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">Keputusan persetujuan, penolakan, dan penghapusan</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/60 bg-card shadow-2xs rounded-2xl overflow-hidden">
        {/* Filters Row */}
        <CardHeader className="pb-4 border-b border-border/40 bg-muted/10">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
              <Input
                placeholder="Cari nama pengguna, aksi, modul, atau rincian aktivitas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-xs bg-background h-9 rounded-xl border-border/70"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Module Filter */}
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Modul</option>
                {uniqueModules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Aksi</option>
                {uniqueActions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {/* Date Presets */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="h-9 rounded-xl border border-border/70 bg-background px-3 text-xs font-medium text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
              </select>
            </div>
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-[170px] text-xs font-bold text-foreground/80 py-3.5 pl-6">Waktu & Tanggal</TableHead>
                  <TableHead className="w-[240px] text-xs font-bold text-foreground/80 py-3.5">Pengguna (Actor)</TableHead>
                  <TableHead className="w-[140px] text-xs font-bold text-foreground/80 py-3.5">Modul</TableHead>
                  <TableHead className="w-[130px] text-xs font-bold text-foreground/80 py-3.5">Aksi</TableHead>
                  <TableHead className="text-xs font-bold text-foreground/80 py-3.5">Rincian Aktivitas</TableHead>
                  <TableHead className="w-[80px] text-right text-xs font-bold text-foreground/80 py-3.5 pr-6">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary opacity-60" />
                        <span>Memuat rekaman log audit...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-xs text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <History size={36} className="opacity-25" />
                        <span className="font-semibold text-foreground text-sm">Belum Ada Aktivitas</span>
                        <span className="text-[11px] max-w-sm">
                          Tidak ditemukan catatan aktivitas yang sesuai dengan parameter pencarian dan filter saat ini.
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const dateObj = new Date(log.created_at);
                    const formattedDate = dateObj.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                    const formattedTime = dateObj.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <TableRow
                        key={log.id}
                        className="hover:bg-muted/30 transition-colors border-border/40"
                      >
                        {/* Waktu */}
                        <TableCell className="pl-6 py-3.5 align-top">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground tabular-nums flex items-center gap-1">
                              <Clock size={11} className="text-muted-foreground shrink-0" />
                              {formattedTime} WIB
                            </span>
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {formattedDate}
                            </span>
                          </div>
                        </TableCell>

                        {/* Pengguna */}
                        <TableCell className="py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar name={log.user_name} size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">
                                {log.user_name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-medium border-border/70 text-muted-foreground"
                                >
                                  {log.user_role}
                                </Badge>
                                {log.user_email && (
                                  <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                                    {log.user_email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Modul */}
                        <TableCell className="py-3.5 align-top">
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-semibold bg-muted/70 text-foreground border border-border/40"
                          >
                            <Layers size={10} className="mr-1 text-muted-foreground" />
                            {log.module}
                          </Badge>
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="py-3.5 align-top">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-bold px-2 py-0.5 ${getActionBadgeClass(log.action)}`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>

                        {/* Rincian Aktivitas */}
                        <TableCell className="py-3.5 align-top">
                          <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                            {log.details}
                          </p>
                        </TableCell>

                        {/* Detail Modal Trigger */}
                        <TableCell className="py-3.5 pr-6 align-top text-right">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedLog(log)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Lihat detail teknis"
                          >
                            <Eye size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Dialog Detail Log */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Shield className="h-5 w-5 text-primary" />
              Detail Audit Log #{selectedLog?.id}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rincian teknis peristiwa keamanan dan jejak transaksi sistem.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-xl border border-border/60">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Waktu Kejadian</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedLog.created_at).toLocaleString('id-ID')}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Tipe Aksi</span>
                  <Badge variant="outline" className={`mt-0.5 text-[10px] ${getActionBadgeClass(selectedLog.action)}`}>
                    {selectedLog.action}
                  </Badge>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Pengguna</span>
                  <span className="font-semibold text-foreground">{selectedLog.user_name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Peran / Role</span>
                  <span className="font-semibold text-foreground">{selectedLog.user_role}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Keterangan Lengkap Aktivitas:
                </span>
                <div className="p-3 bg-muted/20 border border-border/60 rounded-xl text-foreground font-mono text-[11px] whitespace-pre-wrap">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Metadata Tambahan:
                  </span>
                  <pre className="p-3 bg-slate-950 text-emerald-400 border border-border/40 rounded-xl overflow-x-auto text-[10px] font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActivityLogsManager;
