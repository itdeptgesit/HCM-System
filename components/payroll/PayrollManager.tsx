import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  Edit3,
  X,
  Building2,
  RefreshCw,
  Landmark,
  ShieldCheck,
  Check
} from '@/components/ui/icons';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabaseClient';
import { loadWorkforceAccounts } from '../../lib/workforceData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserAvatar } from '../UserAvatar';

export interface PayrollItem {
  id: string;
  userId: string;
  employeeCode: string;
  name: string;
  jobTitle: string;
  department: string;
  company: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  basicSalary: number;
  positionAllowance: number;
  transportMealAllowance: number;
  overtimeHours: number;
  overtimePay: number;
  reimbursementPay: number;
  bpjsTkDeduction: number; // 3%
  bpjsHealthDeduction: number; // 1%
  taxDeduction: number; // PPh 21
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  status: 'Draft' | 'Reviewed' | 'Approved' | 'Paid';
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const PayrollManager: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [payrollStatus, setPayrollStatus] = useState<'Draft' | 'Reviewed' | 'Approved' | 'Paid'>('Approved');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');

  const [employees, setEmployees] = useState<any[]>([]);
  const [payrollList, setPayrollList] = useState<PayrollItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal View Payslip
  const [viewPayslip, setViewPayslip] = useState<PayrollItem | null>(null);
  // Modal Edit Component
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);

  // Fetch real employee records & compute payroll items
  const loadPayrollData = async () => {
    setIsLoading(true);
    try {
      const data = await loadWorkforceAccounts();
      setEmployees(data || []);

      // Cek apakah ada data payroll tersimpan di local storage untuk periode ini
      const cacheKey = `gesit_payroll_${selectedYear}_${selectedMonth}`;
      const saved = localStorage.getItem(cacheKey);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPayrollList(parsed.items || []);
          setPayrollStatus(parsed.status || 'Draft');
          setIsLoading(false);
          return;
        } catch (e) {}
      }

      // Generate perhitungan otomatis berdasarkan jabatan & level
      const generated: PayrollItem[] = (data || []).map((emp: any) => {
        // Base salary estimation according to job title or level
        let basic = 5200000;
        const titleLower = String(emp.job_title || emp.jobTitle || '').toLowerCase();
        const roleLower = String(emp.role || '').toLowerCase();

        if (titleLower.includes('manager') || roleLower.includes('manager')) {
          basic = 14500000;
        } else if (titleLower.includes('lead') || titleLower.includes('senior') || titleLower.includes('spv') || titleLower.includes('supervisor')) {
          basic = 9200000;
        } else if (titleLower.includes('specialist') || titleLower.includes('officer') || titleLower.includes('admin')) {
          basic = 6800000;
        } else if (titleLower.includes('staff')) {
          basic = 5400000;
        }

        const positionAllowance = Math.round(basic * 0.15);
        const transportMealAllowance = 880000;
        const overtimeHours = (emp.id.charCodeAt(0) % 8);
        const overtimePay = overtimeHours * 45000;
        const reimbursementPay = 0;

        const gross = basic + positionAllowance + transportMealAllowance + overtimePay + reimbursementPay;
        const bpjsTk = Math.round(basic * 0.03); // 3%
        const bpjsHealth = Math.round(basic * 0.01); // 1%
        const tax = Math.round(gross > 5500000 ? (gross - 5500000) * 0.05 : 0);
        const otherDeductions = 0;

        const net = gross - (bpjsTk + bpjsHealth + tax + otherDeductions);

        return {
          id: `PR-${selectedYear}${String(selectedMonth + 1).padStart(2, '0')}-${emp.id}`,
          userId: String(emp.id),
          employeeCode: emp.employee_code || emp.employeeCode || `EMP-${emp.id}`,
          name: emp.full_name || emp.fullName || 'Karyawan',
          jobTitle: emp.job_title || emp.jobTitle || 'Staff',
          department: emp.department || 'Operasional',
          company: emp.company || 'PT Gesit Alumas',
          bankName: emp.bank_name || emp.bankName || 'BCA',
          bankAccountNumber: emp.bank_account_number || emp.bankAccountNumber || '8720194821',
          bankAccountName: emp.bank_account_name || emp.bankAccountName || (emp.full_name || emp.fullName),
          basicSalary: basic,
          positionAllowance,
          transportMealAllowance,
          overtimeHours,
          overtimePay,
          reimbursementPay,
          bpjsTkDeduction: bpjsTk,
          bpjsHealthDeduction: bpjsHealth,
          taxDeduction: tax,
          otherDeductions,
          grossSalary: gross,
          netSalary: net,
          status: 'Approved'
        };
      });

      setPayrollList(generated);
      setPayrollStatus('Approved');
    } catch (err: any) {
      console.error('Error loading payroll data:', err);
      toast.error('Gagal memuat data karyawan: ' + (err.message || 'Error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth, selectedYear]);

  // Simpan status payroll
  const savePayrollState = (items: PayrollItem[], status: 'Draft' | 'Reviewed' | 'Approved' | 'Paid') => {
    const cacheKey = `gesit_payroll_${selectedYear}_${selectedMonth}`;
    localStorage.setItem(cacheKey, JSON.stringify({ items, status }));
  };

  // Filter Departemen & Perusahaan
  const departments = useMemo(() => {
    const set = new Set<string>();
    payrollList.forEach((p) => { if (p.department) set.add(p.department); });
    return Array.from(set);
  }, [payrollList]);

  const filteredPayroll = useMemo(() => {
    return payrollList.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDept = selectedDept === 'All' || item.department === selectedDept;
      const matchComp = selectedCompany === 'All' || item.company === selectedCompany;
      return matchSearch && matchDept && matchComp;
    });
  }, [payrollList, searchQuery, selectedDept, selectedCompany]);

  // KPI Calculations
  const totalNet = useMemo(() => filteredPayroll.reduce((acc, curr) => acc + curr.netSalary, 0), [filteredPayroll]);
  const totalGross = useMemo(() => filteredPayroll.reduce((acc, curr) => acc + curr.grossSalary, 0), [filteredPayroll]);
  const totalDeductions = useMemo(() => filteredPayroll.reduce((acc, curr) => acc + (curr.bpjsTkDeduction + curr.bpjsHealthDeduction + curr.taxDeduction), 0), [filteredPayroll]);
  const totalOvertime = useMemo(() => filteredPayroll.reduce((acc, curr) => acc + curr.overtimePay, 0), [filteredPayroll]);

  // Export to Excel Bank Transfer
  const exportPayrollToExcel = () => {
    if (filteredPayroll.length === 0) {
      toast.error('Tidak ada data payroll untuk diekspor.');
      return;
    }

    const rows = filteredPayroll.map((item, idx) => ({
      'No': idx + 1,
      'NIP': item.employeeCode,
      'Nama Karyawan': item.name,
      'Jabatan': item.jobTitle,
      'Departemen': item.department,
      'Bank': item.bankName,
      'Nomor Rekening': item.bankAccountNumber,
      'Nama Pemilik Rekening': item.bankAccountName,
      'Gaji Pokok (IDR)': item.basicSalary,
      'Tunj. Jabatan (IDR)': item.positionAllowance,
      'Tunj. Makan & Transport (IDR)': item.transportMealAllowance,
      'Uang Lembur (IDR)': item.overtimePay,
      'Potongan BPJS TK (IDR)': item.bpjsTkDeduction,
      'Potongan BPJS Kes (IDR)': item.bpjsHealthDeduction,
      'Potongan PPh 21 (IDR)': item.taxDeduction,
      'Gaji Bersih / Take Home Pay (IDR)': item.netSalary,
      'Status': item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${MONTHS[selectedMonth]}`);
    XLSX.writeFile(workbook, `GESIT_PAYROLL_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`);
    toast.success('File Excel Payroll berhasil diunduh!');
  };

  // Update item
  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const gross = editingItem.basicSalary + editingItem.positionAllowance + editingItem.transportMealAllowance + editingItem.overtimePay + editingItem.reimbursementPay;
    const net = gross - (editingItem.bpjsTkDeduction + editingItem.bpjsHealthDeduction + editingItem.taxDeduction + editingItem.otherDeductions);

    const updated = payrollList.map(item => item.id === editingItem.id ? { ...editingItem, grossSalary: gross, netSalary: net } : item);
    setPayrollList(updated);
    savePayrollState(updated, payrollStatus);
    setEditingItem(null);
    toast.success(`Data gaji untuk ${editingItem.name} berhasil diperbarui.`);
  };

  // Change period status
  const handleUpdateStatus = (newStatus: 'Draft' | 'Reviewed' | 'Approved' | 'Paid') => {
    setPayrollStatus(newStatus);
    const updated = payrollList.map(item => ({ ...item, status: newStatus }));
    setPayrollList(updated);
    savePayrollState(updated, newStatus);
    toast.success(`Status Payroll periode ini berhasil diubah menjadi: ${newStatus}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* =========================================================================
          PAGE HEADER & PERIOD CONTROLS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CreditCard className="h-6 w-6 text-primary" />
            Payroll & Penggajian Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kalkulasi gaji berkala, slip gaji resmi, dan laporan transfer bank.
          </p>
        </div>

        {/* Period Selector & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 shadow-2xs">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-8 rounded-lg bg-transparent px-2.5 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-8 rounded-lg bg-transparent px-2.5 text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value={currentYear}>{currentYear}</option>
              <option value={currentYear - 1}>{currentYear - 1}</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportPayrollToExcel}
            className="text-xs h-9 px-3 gap-1.5 border-border bg-card hover:bg-muted font-medium shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Ekspor Bank Excel
          </Button>

          {payrollStatus !== 'Paid' ? (
            <Button
              size="sm"
              onClick={() => handleUpdateStatus('Paid')}
              className="text-xs h-9 px-3.5 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
            >
              <CheckCircle2 size={14} />
              Setujui & Tandai Dibayar
            </Button>
          ) : (
            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs px-3 py-1 font-semibold">
              <Check size={13} className="mr-1" /> Telah Ditransfer
            </Badge>
          )}
        </div>
      </div>

      {/* =========================================================================
          EXECUTIVE KPI SUMMARY METRICS
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Pengeluaran Gaji</span>
              <DollarSign size={16} className="text-primary" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Rp {totalNet.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">
              Take Home Pay untuk {filteredPayroll.length} karyawan
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Gaji Kotor (Gross)</span>
              <TrendingUp size={16} className="text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Rp {totalGross.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">
              Gaji pokok + seluruh tunjangan tetap
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Potongan & Pajak</span>
              <ShieldCheck size={16} className="text-amber-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Rp {totalDeductions.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">
              BPJS Ketenagakerjaan, Kesehatan & PPh 21
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-2xs rounded-xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Total Uang Lembur</span>
              <Clock size={16} className="text-blue-500" />
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Rp {totalOvertime.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground">
              Kompensasi lembur yang disetujui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* =========================================================================
          FILTER & PAYROLL DATA TABLE
          ========================================================================= */}
      <Card className="border-border bg-card shadow-2xs rounded-xl overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari karyawan, NIP, jabatan..."
              className="h-9 pl-9 text-xs bg-background border-border rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="All">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadPayrollData}
              disabled={isLoading}
              className="text-xs h-9 px-3 gap-1 border-border bg-card"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Hitung Ulang
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Karyawan</th>
                <th className="px-4 py-3.5">Departemen</th>
                <th className="px-4 py-3.5">Rekening Bank</th>
                <th className="px-4 py-3.5 text-right">Gaji Pokok</th>
                <th className="px-4 py-3.5 text-right">Tunjangan</th>
                <th className="px-4 py-3.5 text-right">Potongan</th>
                <th className="px-4 py-3.5 text-right">Take Home Pay</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Tidak ada data payroll yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={item.name} size="sm" />
                        <div>
                          <p className="font-bold text-foreground text-xs">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{item.employeeCode} • {item.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.department}</p>
                      <p className="text-[10px] text-muted-foreground">{item.company}</p>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <p className="font-semibold text-foreground">{item.bankName}</p>
                      <p className="text-[11px] text-muted-foreground">{item.bankAccountNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      Rp {item.basicSalary.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                      +Rp {(item.positionAllowance + item.transportMealAllowance + item.overtimePay).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                      -Rp {(item.bpjsTkDeduction + item.bpjsHealthDeduction + item.taxDeduction).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">
                      Rp {item.netSalary.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-primary/10 text-primary border-primary/30'
                        }
                      >
                        {item.status === 'Paid' ? 'Dibayar' : 'Disetujui'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewPayslip(item)}
                          className="h-8 px-2 text-xs font-semibold text-primary hover:bg-primary/10"
                          title="Lihat Slip Gaji"
                        >
                          <Printer size={13} className="mr-1" /> Slip
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem({ ...item })}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          title="Edit Komponen Gaji"
                        >
                          <Edit3 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* =========================================================================
          MODAL SLIP GAJI (PAYSLIP PREVIEW & CETAK)
          ========================================================================= */}
      {viewPayslip && (
        <Dialog open={!!viewPayslip} onOpenChange={() => setViewPayslip(null)}>
          <DialogContent className="max-w-2xl bg-card border-border p-6 rounded-2xl shadow-2xl">
            <div id="printable-payslip" className="space-y-5">
              {/* Kop Slip Gaji */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-foreground">GESIT PEOPLE HCM</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{viewPayslip.company}</p>
                  <p className="text-[11px] text-muted-foreground">Slip Pembayaran Gaji Karyawan</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary bg-primary/5">
                    Periode: {MONTHS[selectedMonth]} {selectedYear}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">Ref: {viewPayslip.id}</p>
                </div>
              </div>

              {/* Data Karyawan */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3.5 rounded-xl border border-border/60">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Nama Karyawan</span>
                  <p className="font-bold text-foreground text-sm">{viewPayslip.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">NIP: {viewPayslip.employeeCode}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Jabatan / Departemen</span>
                  <p className="font-bold text-foreground text-sm">{viewPayslip.jobTitle}</p>
                  <p className="text-[11px] text-muted-foreground">{viewPayslip.department}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Rekening Pembayaran</span>
                  <p className="font-bold text-foreground">{viewPayslip.bankName} - {viewPayslip.bankAccountNumber}</p>
                  <p className="text-[11px] text-muted-foreground">a.n. {viewPayslip.bankAccountName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Status Pajak</span>
                  <p className="font-bold text-foreground">K/0 (Menikah 0 Anak)</p>
                </div>
              </div>

              {/* Rincian Penerimaan & Potongan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Penerimaan */}
                <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
                  <p className="font-bold text-foreground border-b border-border pb-1.5 flex items-center justify-between">
                    <span>Penghasilan (Earnings)</span>
                    <span className="text-emerald-600">+</span>
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Pokok</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.basicSalary.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tunjangan Jabatan</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.positionAllowance.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uang Makan & Transport</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.transportMealAllowance.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lembur ({viewPayslip.overtimeHours} jam)</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.overtimePay.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-border/80 pt-2 flex justify-between font-bold text-foreground">
                    <span>Total Penghasilan Kotor</span>
                    <span>Rp {viewPayslip.grossSalary.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Potongan */}
                <div className="rounded-xl border border-border/80 p-3.5 space-y-2.5">
                  <p className="font-bold text-foreground border-b border-border pb-1.5 flex items-center justify-between">
                    <span>Potongan (Deductions)</span>
                    <span className="text-rose-600">-</span>
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BPJS Ketenagakerjaan (3%)</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.bpjsTkDeduction.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BPJS Kesehatan (1%)</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.bpjsHealthDeduction.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PPh Pasal 21</span>
                    <span className="font-medium text-foreground">Rp {viewPayslip.taxDeduction.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="border-t border-border/80 pt-2 flex justify-between font-bold text-foreground">
                    <span>Total Potongan</span>
                    <span className="text-rose-600">
                      -Rp {(viewPayslip.bpjsTkDeduction + viewPayslip.bpjsHealthDeduction + viewPayslip.taxDeduction).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Take Home Pay */}
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-primary uppercase">Gaji Bersih Diterima (Take Home Pay)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Sudah ditransfer ke rekening {viewPayslip.bankName}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-extrabold text-foreground">
                    Rp {viewPayslip.netSalary.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Button */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewPayslip(null)} className="text-xs">
                Tutup
              </Button>
              <Button size="sm" onClick={() => window.print()} className="text-xs gap-1.5">
                <Printer size={13} />
                Cetak Slip
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* =========================================================================
          MODAL EDIT KOMPONEN GAJI KARYAWAN
          ========================================================================= */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="max-w-lg bg-card border-border p-6 rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Sesuaikan Komponen Gaji: {editingItem.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui gaji pokok, tunjangan, atau potongan khusus karyawan.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditItem} className="space-y-4 pt-2 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Gaji Pokok (IDR)</Label>
                <Input
                  type="number"
                  value={editingItem.basicSalary}
                  onChange={(e) => setEditingItem({ ...editingItem, basicSalary: Number(e.target.value) })}
                  className="bg-background border-border text-xs rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Tunjangan Jabatan</Label>
                  <Input
                    type="number"
                    value={editingItem.positionAllowance}
                    onChange={(e) => setEditingItem({ ...editingItem, positionAllowance: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Uang Makan & Transport</Label>
                  <Input
                    type="number"
                    value={editingItem.transportMealAllowance}
                    onChange={(e) => setEditingItem({ ...editingItem, transportMealAllowance: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Uang Lembur (IDR)</Label>
                  <Input
                    type="number"
                    value={editingItem.overtimePay}
                    onChange={(e) => setEditingItem({ ...editingItem, overtimePay: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Potongan Lainnya</Label>
                  <Input
                    type="number"
                    value={editingItem.otherDeductions}
                    onChange={(e) => setEditingItem({ ...editingItem, otherDeductions: Number(e.target.value) })}
                    className="bg-background border-border text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)} className="text-xs">
                  Batal
                </Button>
                <Button type="submit" size="sm" className="text-xs bg-primary text-primary-foreground font-semibold">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PayrollManager;
