import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  FileText,
  Building2,
  FolderTree,
  Settings,
  User,
  CheckCircle2,
  FileWarning,
  Megaphone,
  MapPin,
  History,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  Sparkles,
} from '@/components/ui/icons';
import { supabase } from '@/lib/supabaseClient';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleTheme?: () => void;
  isDark?: boolean;
  onLogout?: () => void;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onToggleTheme,
  isDark,
  onLogout,
}: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [employees, setEmployees] = React.useState<any[]>([]);

  // Keyboard shortcut listener ⌘K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Load employee quick-list when search modal opens
  React.useEffect(() => {
    if (open) {
      const loadEmployees = async () => {
        try {
          const { data } = await supabase
            .from('user_accounts')
            .select('id, full_name, employee_code, department, job_title, email, company')
            .order('full_name')
            .limit(30);
          if (data) setEmployees(data);
        } catch (e) {
          // ignore error
        }
      };
      loadEmployees();
    }
  }, [open]);

  const handleSelect = (callback: () => void) => {
    onOpenChange(false);
    callback();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pencarian Global HCM"
      description="Cari karyawan, menu navigasi, atau jalankan aksi cepat..."
      className="max-w-2xl rounded-2xl border border-slate-200 dark:border-[#27272a] shadow-2xl overflow-hidden bg-white dark:bg-[#131316]"
    >
      <CommandInput placeholder="Ketik nama karyawan, menu, atau aksi (misal: Budi, Cuti, Absen)..." />
      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
          Tidak ada data atau menu yang cocok dengan kata kunci.
        </CommandEmpty>

        {/* ── QUICK ACTIONS ── */}
        <CommandGroup heading="Aksi Cepat">
          <CommandItem
            value="buat pengajuan cuti lembur absen form permohonan izin sakit"
            onSelect={() => handleSelect(() => navigate('/requests'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-white">
                Buat Pengajuan Cuti / Lembur / Absen
              </div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                Buka formulir pengajuan mandiri dan persetujuan
              </div>
            </div>
          </CommandItem>

          <CommandItem
            value="profil saya data akun ganti password identitas user email"
            onSelect={() => handleSelect(() => navigate('/profile'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <User className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-white">Profil Saya</div>
              <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                Kelola data akun, informasi kontak, dan kata sandi
              </div>
            </div>
          </CommandItem>

          {onToggleTheme && (
            <CommandItem
              value="tema gelap terang dark mode light mode tampilan"
              onSelect={() => handleSelect(onToggleTheme)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Ubah tema tampilan aplikasi
                </div>
              </div>
            </CommandItem>
          )}

          {onLogout && (
            <CommandItem
              value="keluar akun logout signout keluar dari sistem"
              onSelect={() => handleSelect(onLogout)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer text-rose-600 dark:text-rose-400"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <LogOut className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">Keluar dari Akun</div>
                <div className="text-[10px] opacity-75">Akhiri sesi login saat ini</div>
              </div>
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator className="my-1.5" />

        {/* ── MENU & WORKSPACE ── */}
        <CommandGroup heading="Modul & Halaman">
          <CommandItem
            value="dashboard beranda ringkasan eksekutif statistik hcm kpi overview"
            onSelect={() => handleSelect(() => navigate('/'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4 text-slate-500" />
            <span>Dashboard Human Capital</span>
          </CommandItem>

          <CommandItem
            value="data karyawan daftar pegawai user accounts struktur organisasi nik jabatan"
            onSelect={() => handleSelect(() => navigate('/employees'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <Users className="h-4 w-4 text-slate-500" />
            <span>Data Karyawan</span>
          </CommandItem>

          <CommandItem
            value="laporan presensi absensi rekap kehadiran harian log attendance export excel"
            onSelect={() => handleSelect(() => navigate('/attendance/report'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>Laporan Presensi</span>
          </CommandItem>

          <CommandItem
            value="request absen koreksi presensi lupa clock in clock out kehadiran"
            onSelect={() => handleSelect(() => navigate('/attendance/requests'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Request Absen</span>
          </CommandItem>

          <CommandItem
            value="kalender kerja cuti bersama libur nasional tanggal merah agenda event skb"
            onSelect={() => handleSelect(() => navigate('/attendance/calendar'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <Calendar className="h-4 w-4 text-slate-500" />
            <span>Kalender Kerja & Libur</span>
          </CommandItem>

          <CommandItem
            value="radius office lokasi kantor geofencing koordinat gps absensi"
            onSelect={() => handleSelect(() => navigate('/attendance/locations'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <MapPin className="h-4 w-4 text-slate-500" />
            <span>Radius Office & Lokasi</span>
          </CommandItem>

          <CommandItem
            value="pengajuan approval persetujuan cuti lembur izin sakit reimbursement atasan"
            onSelect={() => handleSelect(() => navigate('/requests'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 text-slate-500" />
            <span>Pengajuan & Persetujuan Berjenjang</span>
          </CommandItem>

          <CommandItem
            value="catatan sp karyawan surat peringatan kedisiplinan disciplinary sanksi"
            onSelect={() => handleSelect(() => navigate('/disciplinary'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <FileWarning className="h-4 w-4 text-slate-500" />
            <span>Catatan SP Karyawan</span>
          </CommandItem>

          <CommandItem
            value="news pengumuman perusahaan berita internal broadcast artikel"
            onSelect={() => handleSelect(() => navigate('/news'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <Megaphone className="h-4 w-4 text-slate-500" />
            <span>News & Pengumuman Perusahaan</span>
          </CommandItem>

          <CommandItem
            value="log aktivitas audit trail riwayat user login aksi sistem"
            onSelect={() => handleSelect(() => navigate('/admin/activity-logs'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <History className="h-4 w-4 text-slate-500" />
            <span>Log Aktivitas & Audit</span>
          </CommandItem>

          <CommandItem
            value="laporan analitik grafik statistik turnover demografi headcount chart"
            onSelect={() => handleSelect(() => navigate('/analytics'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <span>Laporan & Analitik</span>
          </CommandItem>

          <CommandItem
            value="pengaturan sistem setting konfigurasi hak akses user permissions"
            onSelect={() => handleSelect(() => navigate('/settings'))}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Pengaturan Sistem</span>
          </CommandItem>
        </CommandGroup>

        {/* ── EMPLOYEES DIRECTORY DIRECT SEARCH ── */}
        {employees.length > 0 && (
          <>
            <CommandSeparator className="my-1.5" />
            <CommandGroup heading="Direktori Karyawan">
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={`${emp.full_name} ${emp.employee_code} ${emp.department} ${emp.job_title} ${emp.email}`}
                  onSelect={() => handleSelect(() => navigate('/employees'))}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs cursor-pointer"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-200 shrink-0">
                    {(emp.full_name || 'K').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {emp.full_name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">
                      {emp.employee_code ? `${emp.employee_code} • ` : ''}
                      {emp.job_title || emp.department || emp.company || '-'}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {emp.department || ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer shortcut hints */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#18181b]/50 text-[10px] text-slate-400 dark:text-zinc-500">
        <div className="flex items-center gap-3">
          <span>
            Navigasi: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono">↑</kbd>{' '}
            <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono">↓</kbd>
          </span>
          <span>
            Pilih: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono">↵</kbd>
          </span>
        </div>
        <span>
          Tutup: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 font-mono">ESC</kbd>
        </span>
      </div>
    </CommandDialog>
  );
}
