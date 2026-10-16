'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar, Award, Plus, Search, Filter, RefreshCw, FileSpreadsheet,
  CheckCircle2, Clock, AlertTriangle, ArrowUpDown, ShieldCheck, ChevronRight
} from '@/components/ui/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportToExcel } from '../../lib/excelExport';
import { LeaveQuotaSummary } from '../../lib/leaveQuotaService';
import { formatDateDDMMYYYY } from '../../lib/utils';

interface LeaveQuotaOverviewTabProps {
  quotas: LeaveQuotaSummary[];
  loading: boolean;
  onRefresh: () => void;
  onOpenAdjust: (quota: LeaveQuotaSummary) => void;
  isAdminOrHR: boolean;
  currentYear: number;
}

export const LeaveQuotaOverviewTab: React.FC<LeaveQuotaOverviewTabProps> = ({
  quotas,
  loading,
  onRefresh,
  onOpenAdjust,
  isAdminOrHR,
  currentYear
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');

  const departments = useMemo(() => {
    const set = new Set<string>();
    quotas.forEach(q => {
      if (q.department && q.department !== '-') set.add(q.department);
    });
    return Array.from(set).sort();
  }, [quotas]);

  const filteredQuotas = useMemo(() => {
    return quotas.filter(q => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        q.fullName.toLowerCase().includes(term) ||
        q.employeeCode.toLowerCase().includes(term) ||
        q.department.toLowerCase().includes(term);

      const matchType = filterType === 'all' || q.contractType === filterType;
      const matchDept = filterDept === 'all' || q.department === filterDept;

      return matchSearch && matchType && matchDept;
    });
  }, [quotas, searchTerm, filterType, filterDept]);

  // Metrics
  const metrics = useMemo(() => {
    let totalEligible = 0;
    let totalBalance = 0;
    let totalTaken = 0;
    let totalAdjustments = 0;

    quotas.forEach(q => {
      if (q.isEligible) totalEligible++;
      totalBalance += q.remainingBalance;
      totalTaken += q.leaveTakenDays;
      totalAdjustments += q.totalAdjustmentDays;
    });

    return {
      totalEmployees: quotas.length,
      totalEligible,
      totalBalance,
      totalTaken,
      totalAdjustments,
      avgBalance: quotas.length > 0 ? (totalBalance / quotas.length).toFixed(1) : '0'
    };
  }, [quotas]);

  const handleExportExcel = () => {
    const data = filteredQuotas.map(q => ({
      'NIP': q.employeeCode,
      'Nama Karyawan': q.fullName,
      'Departemen': q.department,
      'Status Kepegawaian': q.contractType,
      'Tanggal Masuk': q.joinDate ? formatDateDDMMYYYY(q.joinDate) : '-',
      'Masa Kerja': `${q.tenureYears} Tahun (${q.tenureMonths} Bulan)`,
      'Hak Cuti Dasar': q.baseQuota,
      'Carry Forward': q.carryForwardExpired ? '0 (Expired 30 Jun)' : q.carryForwardQuota,
      'Potongan Cuti Bersama': q.collectiveLeaveDeduction,
      'Cuti Terpakai': q.leaveTakenDays,
      'Penyesuaian HR': q.totalAdjustmentDays > 0 ? `+${q.totalAdjustmentDays}` : q.totalAdjustmentDays,
      'Sisa Saldo Cuti Aktif': q.remainingBalance,
      'Catatan': q.eligibilityNote
    }));

    exportToExcel(data, `GESIT-REKAP-KUOTA-CUTI-${currentYear}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border/70 shadow-xs bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Total Karyawan Terdata
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground">{metrics.totalEmployees}</span>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              {metrics.totalEligible} Berhak Cuti
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            PKWTT &bull; PKWT &bull; Probation
          </span>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Total Sisa Saldo Kuota
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.totalBalance} <span className="text-xs font-normal text-muted-foreground">Hari</span>
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              Rata-rata: {metrics.avgBalance} hr
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Tahun Anggaran {currentYear}
          </span>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Cuti Tahunan Terpakai
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-500">
              {metrics.totalTaken} <span className="text-xs font-normal text-muted-foreground">Hari</span>
            </span>
            <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/10 border-rose-500/20">
              Approved
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Pengajuan yang telah disetujui
          </span>
        </Card>

        <Card className="p-4 border-border/70 shadow-xs bg-card">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Penyesuaian Tim HR
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-primary">
              {metrics.totalAdjustments > 0 ? `+${metrics.totalAdjustments}` : metrics.totalAdjustments} <span className="text-xs font-normal text-muted-foreground">Hari</span>
            </span>
            <Badge variant="outline" className="text-[10px] text-primary border-primary/20 bg-primary/10 font-semibold">
              Kompensasi & Reward
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground mt-1 block">
            Akumulasi koreksi / bonus cuti
          </span>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden">
        {/* Toolbar Header */}
        <CardHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Award size={16} className="text-primary" />
              Rekapitulasi Kuota Cuti Karyawan Tahun {currentYear}
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Menampilkan {filteredQuotas.length} dari {quotas.length} karyawan &bull; Berdasarkan aturan resmi PKWTT &amp; PKWT
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-xs font-semibold gap-1.5 h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
            >
              <FileSpreadsheet size={13} />
              <span>Ekspor Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs font-semibold gap-1.5 h-8 cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-primary' : ''} />
              <span>Segarkan</span>
            </Button>
          </div>
        </CardHeader>

        {/* Filter Controls */}
        <div className="p-4 border-b border-border/50 bg-background/50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama, NIP, atau departemen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">Semua Status Kepegawaian</option>
              <option value="PKWTT">PKWTT (Karyawan Tetap)</option>
              <option value="PKWT">PKWT (Karyawan Kontrak)</option>
              <option value="Probation">Probation (Evaluasi)</option>
              <option value="Magang">Magang (Intern)</option>
            </select>
          </div>

          <div>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="all">Semua Departemen ({departments.length})</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold w-[250px]">Karyawan</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status</TableHead>
                  <TableHead className="text-xs font-bold text-center">Masa Kerja</TableHead>
                  <TableHead className="text-xs font-bold text-center">Hak Dasar</TableHead>
                  <TableHead className="text-xs font-bold text-center">Carry Forward</TableHead>
                  <TableHead className="text-xs font-bold text-center">Cuti Bersama</TableHead>
                  <TableHead className="text-xs font-bold text-center">Terpakai</TableHead>
                  <TableHead className="text-xs font-bold text-center">Penyesuaian HR</TableHead>
                  <TableHead className="text-xs font-bold text-center">Sisa Saldo</TableHead>
                  {isAdminOrHR && <TableHead className="text-xs font-bold text-right pr-5">Aksi HR</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredQuotas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdminOrHR ? 10 : 9} className="py-12 text-center text-muted-foreground">
                      Tidak ada karyawan yang sesuai filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQuotas.map((q) => (
                    <TableRow key={q.userId} className="hover:bg-muted/30">
                      <TableCell className="py-3">
                        <span className="font-bold text-foreground block">{q.fullName}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-mono text-primary font-semibold">{q.employeeCode}</span>
                          <span>&bull;</span>
                          <span className="truncate max-w-[140px]">{q.department}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge className={`text-[10px] font-semibold ${
                          q.contractType === 'PKWTT'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : q.contractType === 'PKWT'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : q.contractType === 'Probation'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
                            : 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
                        }`}>
                          {q.contractType}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center font-medium">
                        {q.tenureYears > 0 ? (
                          <span>{q.tenureYears} Thn ({q.tenureMonths} Bln)</span>
                        ) : (
                          <span>{q.tenureMonths} Bln</span>
                        )}
                        {q.joinDate && (
                          <span className="text-[10px] text-muted-foreground block">
                            Join: {formatDateDDMMYYYY(q.joinDate)}
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-semibold tabular-nums text-foreground">
                        {q.baseQuota} hari
                      </TableCell>

                      <TableCell className="text-center font-medium tabular-nums">
                        {q.carryForwardExpired ? (
                          <span className="text-[11px] text-muted-foreground line-through" title="Expired otomatis per 30 Juni">
                            0 hr (Exp)
                          </span>
                        ) : q.carryForwardQuota > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{q.carryForwardQuota} hr
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center font-medium tabular-nums text-rose-500">
                        -{q.collectiveLeaveDeduction} hr
                      </TableCell>

                      <TableCell className="text-center font-medium tabular-nums text-rose-600 dark:text-rose-400">
                        {q.leaveTakenDays > 0 ? `${q.leaveTakenDays} hr` : '0 hr'}
                      </TableCell>

                      <TableCell className="text-center font-semibold tabular-nums">
                        {q.totalAdjustmentDays !== 0 ? (
                          <Badge variant="outline" className={
                            q.totalAdjustmentDays > 0
                              ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold'
                              : 'text-rose-600 border-rose-500/30 bg-rose-500/10 font-bold'
                          }>
                            {q.totalAdjustmentDays > 0 ? `+${q.totalAdjustmentDays}` : q.totalAdjustmentDays} hr
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-black tabular-nums ${
                          q.remainingBalance > 3
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : q.remainingBalance > 0
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-muted text-muted-foreground border border-border/70'
                        }`}>
                          {q.remainingBalance} Hari
                        </span>
                      </TableCell>

                      {isAdminOrHR && (
                        <TableCell className="text-right pr-5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenAdjust(q)}
                            className="h-7 text-[11px] font-semibold gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <span>Sesuaikan Cuti</span>
                            <ChevronRight size={12} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
