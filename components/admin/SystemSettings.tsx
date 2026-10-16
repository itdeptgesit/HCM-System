import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building2, 
  Clock, 
  MapPin, 
  Bell, 
  ShieldCheck, 
  Server, 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  Globe, 
  Lock, 
  Mail, 
  Calendar, 
  Smartphone, 
  Layers, 
  Cpu, 
  RefreshCw,
  Sliders,
  DollarSign,
  FileCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  Timer,
  Sunrise,
  Sunset
} from '@/components/ui/icons';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ToastProvider';
import { toast } from 'sonner';

interface SystemSettingsProps {
  currentUser?: any;
}

interface GeneralSettings {
  companyName: string;
  employeePrefix: string;
  timezone: string;
  currency: string;
  payrollCutoffStart: number;
  payrollCutoffEnd: number;
  hrSupportEmail: string;
  contactPhone: string;
}

interface AttendancePolicySettings {
  id?: number;
  allow_wfh: boolean;
  require_selfie: boolean;
  require_location: boolean;
  max_radius_meters: number;
  schedule_id?: number;
  schedule_name: string;
  work_start: string;
  work_end: string;
  grace_period_minutes: number;
  work_days: string[];
  auto_approve_overtime_under_1h: boolean;
  is_flexible: boolean;
  flex_start: string;
  flex_end: string;
  required_work_hours: number;
}

interface NotificationSettings {
  emailLeaveNotification: boolean;
  emailOvertimeNotification: boolean;
  clockInReminder: boolean;
  clockOutReminder: boolean;
  contractExpiryAlertDays: number;
  autoEscalateApprovalDays: number;
}

interface SecuritySettings {
  sessionTimeoutHours: number;
  enforceSingleSession: boolean;
  requirePasswordChangeQuarterly: boolean;
  minPasswordLength: number;
  maintenanceMode: boolean;
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  companyName: 'The Gesit Companies',
  employeePrefix: 'GES',
  timezone: 'Asia/Jakarta (WIB)',
  currency: 'IDR (Rp)',
  payrollCutoffStart: 21,
  payrollCutoffEnd: 20,
  hrSupportEmail: 'hr.support@gesit.co.id',
  contactPhone: '+62 21 5790 1234',
};

const DEFAULT_ATTENDANCE_SETTINGS: AttendancePolicySettings = {
  allow_wfh: true,
  require_selfie: true,
  require_location: true,
  max_radius_meters: 200,
  schedule_name: 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)',
  work_start: '07:00',
  work_end: '16:00',
  grace_period_minutes: 0,
  work_days: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
  auto_approve_overtime_under_1h: false,
  is_flexible: true,
  flex_start: '07:00',
  flex_end: '10:00',
  required_work_hours: 9,
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailLeaveNotification: true,
  emailOvertimeNotification: true,
  clockInReminder: true,
  clockOutReminder: true,
  contractExpiryAlertDays: 30,
  autoEscalateApprovalDays: 3,
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  sessionTimeoutHours: 24,
  enforceSingleSession: false,
  requirePasswordChangeQuarterly: false,
  minPasswordLength: 8,
  maintenanceMode: false,
};

export const SystemSettings: React.FC<SystemSettingsProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'attendance' | 'notifications' | 'security' | 'system'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latencyMs?: number; error?: string }>({
    connected: false,
  });

  // State
  const [general, setGeneral] = useState<GeneralSettings>(DEFAULT_GENERAL_SETTINGS);
  const [attendance, setAttendance] = useState<AttendancePolicySettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [security, setSecurity] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [simulatedCheckIn, setSimulatedCheckIn] = useState('08:00');

  const calculateSimulatedCheckOut = (inTime: string, hours = 9) => {
    const [h, m] = inTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '--:--';
    const outH = (h + hours) % 24;
    return `${String(outH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Load settings on mount
  useEffect(() => {
    loadAllSettings();
  }, []);

  const loadAllSettings = async () => {
    setLoading(true);
    const startPing = Date.now();

    try {
      // 1. Load Local Storage overrides for general, notifications, and security
      const savedGeneral = localStorage.getItem('gesit_settings_general');
      if (savedGeneral) {
        try { setGeneral(JSON.parse(savedGeneral)); } catch (_) {}
      }

      const savedNotifications = localStorage.getItem('gesit_settings_notifications');
      if (savedNotifications) {
        try { setNotifications(JSON.parse(savedNotifications)); } catch (_) {}
      }

      const savedSecurity = localStorage.getItem('gesit_settings_security');
      if (savedSecurity) {
        try { setSecurity(JSON.parse(savedSecurity)); } catch (_) {}
      }

      // 2. Fetch Attendance Settings & Schedule from Supabase
      const [attRes, schRes] = await Promise.all([
        supabase.from('attendance_settings').select('*').limit(1).maybeSingle(),
        supabase.from('attendance_schedules').select('*').limit(1).maybeSingle(),
      ]);

      const pingDuration = Date.now() - startPing;
      setDbStatus({ connected: true, latencyMs: pingDuration });

      const savedAttendance = localStorage.getItem('gesit_settings_attendance');
      let localAtt: any = null;
      if (savedAttendance) {
        try { localAtt = JSON.parse(savedAttendance); } catch (_) {}
      }

      if (attRes.data || schRes.data) {
        const schName = schRes.data?.name || '';
        const isFlex = schRes.data?.is_flexible ?? (localAtt?.is_flexible !== undefined
          ? localAtt.is_flexible
          : (schName.toLowerCase().includes('fleksibel') || schName.toLowerCase().includes('flexible')));

        setAttendance((prev) => ({
          ...prev,
          id: attRes.data?.id ?? prev.id,
          allow_wfh: attRes.data?.allow_wfh ?? prev.allow_wfh,
          require_selfie: attRes.data?.require_selfie ?? prev.require_selfie,
          require_location: attRes.data?.require_location ?? prev.require_location,
          max_radius_meters: attRes.data?.max_radius_meters ?? prev.max_radius_meters,
          schedule_id: schRes.data?.id ?? prev.schedule_id,
          schedule_name: schRes.data?.name ?? (isFlex ? 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)' : prev.schedule_name),
          work_start: schRes.data?.work_start ? schRes.data.work_start.slice(0, 5) : prev.work_start,
          work_end: schRes.data?.work_end ? schRes.data.work_end.slice(0, 5) : prev.work_end,
          grace_period_minutes: schRes.data?.grace_period_minutes ?? prev.grace_period_minutes,
          is_flexible: isFlex,
          flex_start: schRes.data?.flex_start?.slice(0, 5) || localAtt?.flex_start || (isFlex ? '07:00' : '08:30'),
          flex_end: schRes.data?.flex_end?.slice(0, 5) || localAtt?.flex_end || '10:00',
          required_work_hours: schRes.data?.required_work_hours ?? localAtt?.required_work_hours ?? 9,
        }));
      }
    } catch (err: any) {
      console.error('Error loading settings:', err);
      setDbStatus({ connected: false, error: err.message });
      showToast('Gagal terhubung penuh ke Supabase: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // 1. Save general, notifications, and security into LocalStorage
      localStorage.setItem('gesit_settings_general', JSON.stringify(general));
      localStorage.setItem('gesit_settings_notifications', JSON.stringify(notifications));
      localStorage.setItem('gesit_settings_security', JSON.stringify(security));
      localStorage.setItem('gesit_settings_attendance', JSON.stringify(attendance));
      localStorage.setItem(
        'gesit_attendance_policy',
        JSON.stringify({
          is_flexible: attendance.is_flexible,
          flex_start: attendance.flex_start,
          flex_end: attendance.flex_end,
          required_work_hours: attendance.required_work_hours,
          work_start: attendance.work_start,
          work_end: attendance.work_end,
          grace_period_minutes: attendance.grace_period_minutes,
        })
      );

      // 2. Sync attendance settings to Supabase
      if (attendance.id) {
        const { error } = await supabase
          .from('attendance_settings')
          .update({
            allow_wfh: attendance.allow_wfh,
            require_selfie: attendance.require_selfie,
            require_location: attendance.require_location,
            max_radius_meters: attendance.max_radius_meters,
            updated_at: new Date().toISOString(),
          })
          .eq('id', attendance.id);
        if (error) throw error;
      } else {
        const { data: newAtt, error } = await supabase
          .from('attendance_settings')
          .insert({
            allow_wfh: attendance.allow_wfh,
            require_selfie: attendance.require_selfie,
            require_location: attendance.require_location,
            max_radius_meters: attendance.max_radius_meters,
          })
          .select()
          .maybeSingle();
        if (error) throw error;
        if (newAtt) {
          setAttendance((prev) => ({ ...prev, id: newAtt.id }));
        }
      }

      // 3. Sync schedule to Supabase
      const scheduleNameToSave = attendance.is_flexible
        ? `Jam Kerja Fleksibel (${attendance.flex_start} - ${attendance.flex_end}, ${attendance.required_work_hours} Jam)`
        : attendance.schedule_name;
      const workStartWithSeconds = attendance.is_flexible
        ? `${attendance.flex_start}:00`
        : (attendance.work_start.length === 5 ? `${attendance.work_start}:00` : attendance.work_start);
      const workEndWithSeconds = attendance.is_flexible
        ? `${attendance.flex_end}:00`
        : (attendance.work_end.length === 5 ? `${attendance.work_end}:00` : attendance.work_end);
      const minutes = (time: string) => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins; };
      const graceToSave = attendance.is_flexible ? Math.max(0, minutes(attendance.flex_end) - minutes(attendance.flex_start)) : attendance.grace_period_minutes;

      if (attendance.schedule_id) {
        let schedulePayload: Record<string, any> = {
          name: scheduleNameToSave,
          work_start: workStartWithSeconds,
          work_end: workEndWithSeconds,
          grace_period_minutes: graceToSave,
          is_flexible: attendance.is_flexible,
          flex_start: `${attendance.flex_start}:00`,
          flex_end: `${attendance.flex_end}:00`,
          required_work_hours: attendance.required_work_hours,
        };
        let { error } = await supabase
          .from('attendance_schedules')
          .update(schedulePayload)
          .eq('id', attendance.schedule_id);

        if (error && error.message?.includes('column')) {
          delete schedulePayload.is_flexible;
          delete schedulePayload.flex_start;
          delete schedulePayload.flex_end;
          delete schedulePayload.required_work_hours;
          const { error: fallbackErr } = await supabase
            .from('attendance_schedules')
            .update(schedulePayload)
            .eq('id', attendance.schedule_id);
          if (fallbackErr) throw fallbackErr;
        } else if (error) {
          throw error;
        }
      } else {
        let insertPayload: Record<string, any> = {
          name: scheduleNameToSave,
          work_start: workStartWithSeconds,
          work_end: workEndWithSeconds,
          grace_period_minutes: graceToSave,
          is_flexible: attendance.is_flexible,
          flex_start: `${attendance.flex_start}:00`,
          flex_end: `${attendance.flex_end}:00`,
          required_work_hours: attendance.required_work_hours,
        };
        let { data: newSch, error } = await supabase
          .from('attendance_schedules')
          .insert(insertPayload)
          .select()
          .maybeSingle();

        if (error && error.message?.includes('column')) {
          delete insertPayload.is_flexible;
          delete insertPayload.flex_start;
          delete insertPayload.flex_end;
          delete insertPayload.required_work_hours;
          const { data: fbSch, error: fbErr } = await supabase
            .from('attendance_schedules')
            .insert(insertPayload)
            .select()
            .maybeSingle();
          if (fbErr) throw fbErr;
          newSch = fbSch;
        } else if (error) {
          throw error;
        }

        if (newSch) {
          setAttendance((prev) => ({ ...prev, schedule_id: newSch.id }));
        }
      }

      showToast('Pengaturan sistem berhasil disimpan!', 'success');
      toast.success('Pengaturan sistem berhasil diperbarui.');
    } catch (err: any) {
      console.error('Save error:', err);
      showToast('Gagal menyimpan ke server: ' + err.message, 'error');
      toast.error('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Apakah Anda yakin ingin mengembalikan semua pengaturan ke nilai default?')) {
      setGeneral(DEFAULT_GENERAL_SETTINGS);
      setAttendance(DEFAULT_ATTENDANCE_SETTINGS);
      setNotifications(DEFAULT_NOTIFICATION_SETTINGS);
      setSecurity(DEFAULT_SECURITY_SETTINGS);
      showToast('Pengaturan direset ke default (klik Simpan untuk menerapkan).', 'info');
      toast.info('Formulir direset ke default.');
    }
  };

  const handleClearAppCache = () => {
    if (window.confirm('Bersihkan cache data lokal aplikasi dan muat ulang halaman?')) {
      sessionStorage.clear();
      localStorage.removeItem('gesit_settings_general');
      localStorage.removeItem('gesit_settings_notifications');
      localStorage.removeItem('gesit_settings_security');
      toast.success('Cache berhasil dibersihkan.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const toggleWorkDay = (day: string) => {
    setAttendance((prev) => {
      const exists = prev.work_days.includes(day);
      const newDays = exists ? prev.work_days.filter((d) => d !== day) : [...prev.work_days, day];
      return { ...prev, work_days: newDays };
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Administrasi & Konfigurasi
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-primary" />
            Pengaturan Sistem
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Kelola preferensi umum portal HR, kebijakan presensi, jadwal kerja, notifikasi, dan keamanan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/30 transition-all disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Simpan Pengaturan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border bg-card px-2 rounded-2xl shadow-2xs">
        <div className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'general'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Profil & Umum</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'attendance'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Kebijakan Presensi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'notifications'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Notifikasi & Alert</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Keamanan & Sesi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all shrink-0 ${
              activeTab === 'system'
                ? 'bg-primary text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Server className="h-4 w-4" />
            <span>Status Sistem & DB</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: GENERAL */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Identitas Workspace HR
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Informasi identitas organisasi yang ditampilkan pada seluruh dokumen laporan dan slip.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">Nama Perusahaan / Organisasi</label>
                  <input
                    type="text"
                    value={general.companyName}
                    onChange={(e) => setGeneral({ ...general, companyName: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Format NIK Karyawan</label>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      readOnly
                      value="YYMM + No. Urut (3 Digit)"
                      className="w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground font-mono font-semibold focus:outline-none cursor-default"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Otomatis dari Join Date: <b>TahunBulan (4 digit) + No. Urut (3 digit)</b>. Contoh: <b>2610001</b>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Email Helpdesk / Dukungan HR</label>
                  <input
                    type="email"
                    value={general.hrSupportEmail}
                    onChange={(e) => setGeneral({ ...general, hrSupportEmail: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Kontak Telepon Kantor</label>
                  <input
                    type="text"
                    value={general.contactPhone}
                    onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Kebijakan Siklus & Lokalisasi
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pengaturan periode perhitungan absensi dan payroll karyawan.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-foreground">Zona Waktu (Timezone)</label>
                  <select
                    value={general.timezone}
                    onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                  >
                    <option value="Asia/Jakarta (WIB)">Asia/Jakarta (WIB - UTC+7)</option>
                    <option value="Asia/Makassar (WITA)">Asia/Makassar (WITA - UTC+8)</option>
                    <option value="Asia/Jayapura (WIT)">Asia/Jayapura (WIT - UTC+9)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Mata Uang Default</label>
                  <select
                    value={general.currency}
                    onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                  >
                    <option value="IDR (Rp)">IDR - Indonesian Rupiah (Rp)</option>
                    <option value="USD ($)">USD - US Dollar ($)</option>
                    <option value="SGD (S$)">SGD - Singapore Dollar (S$)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Tanggal Mulai Cut-Off Payroll</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={general.payrollCutoffStart}
                      onChange={(e) => setGeneral({ ...general, payrollCutoffStart: parseInt(e.target.value) || 1 })}
                      className="w-24 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none font-bold text-center"
                    />
                    <span className="text-xs text-muted-foreground">setiap bulan berjalan</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Tanggal Selesai Cut-Off Payroll</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={general.payrollCutoffEnd}
                      onChange={(e) => setGeneral({ ...general, payrollCutoffEnd: parseInt(e.target.value) || 1 })}
                      className="w-24 rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none font-bold text-center"
                    />
                    <span className="text-xs text-muted-foreground">bulan berikutnya</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side preview info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-amber-500/10 p-6 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white font-bold text-lg shadow-sm">
                  GP
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{general.companyName}</h3>
                  <p className="text-[11px] text-muted-foreground font-medium">Enterprise Human Capital System</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 border-t border-border/60 pt-4 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Format NIK Karyawan</span>
                  <span className="font-mono font-semibold text-foreground">2610001 (YYMM-XXX)</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Periode Cut-Off</span>
                  <span className="font-semibold text-foreground">
                    Tgl {general.payrollCutoffStart} - {general.payrollCutoffEnd}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Zona Waktu</span>
                  <span className="font-semibold text-foreground">{general.timezone}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Mata Uang</span>
                  <span className="font-semibold text-foreground">{general.currency}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/30 p-5 text-xs text-amber-800 dark:text-amber-300 dark:text-amber-200">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-bold">Tips Konfigurasi</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Perubahan nama organisasi dan format prefix akan langsung diterapkan pada pembuatan akun karyawan baru dan kop laporan resmi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Jadwal & Jam Kerja (Flexible & Fixed) */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Jadwal & Jam Kerja Reguler
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Konfigurasi jam kerja karyawan (fleksibel atau tetap), tersinkronisasi dengan <code>attendance_schedules</code>.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/300 animate-pulse" />
                  {attendance.is_flexible ? 'Fleksibel 9 Jam' : 'Jadwal Tetap'}
                </span>
              </div>

              {/* Mode Selection Tabs: Flexible vs Fixed */}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setAttendance({
                      ...attendance,
                      is_flexible: true,
                      schedule_name: 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)',
                      flex_start: '07:00',
                      flex_end: '10:00',
                      required_work_hours: 9,
                    })
                  }
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    attendance.is_flexible
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/10 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`rounded-xl p-2.5 ${
                      attendance.is_flexible ? 'bg-primary text-white' : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Jam Kerja Fleksibel</span>
                      <span className="rounded-full bg-amber-100 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5">
                        Aktif
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Check-in fleksibel jam <strong>07:00 - 10:00 pagi</strong>. Jam pulang otomatis mengikuti jam masuk (Wajib 9 jam kerja).
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setAttendance({
                      ...attendance,
                      is_flexible: false,
                      schedule_name: 'Jam Kerja Reguler (Tetap)',
                      work_start: '08:30',
                      work_end: '17:30',
                      grace_period_minutes: 15,
                    })
                  }
                  className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                    !attendance.is_flexible
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/10 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/30'
                  }`}
                >
                  <div
                    className={`rounded-xl p-2.5 ${
                      !attendance.is_flexible ? 'bg-primary text-white' : 'bg-muted/60 text-muted-foreground'
                    }`}
                  >
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Jam Kerja Tetap (Fixed Shift)</div>
                    <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                      Jam masuk dan jam pulang ditentukan tetap (contoh: 08:30 s/d 17:30).
                    </p>
                  </div>
                </button>
              </div>

              {/* Form Input Sesuai Mode */}
              {attendance.is_flexible ? (
                <div className="mt-5 space-y-5">
                  {/* Banner Info Flexible Rule */}
                  <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary text-white p-2">
                        <Timer className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-primary">
                          Ketentuan Jam Kerja Fleksibel 9 Jam
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                          Karyawan dapat masuk antara pukul <strong>{attendance.flex_start} s/d {attendance.flex_end} pagi</strong>. 
                          Jam pulang dihitung otomatis: <strong>Waktu Masuk + {attendance.required_work_hours} Jam Kerja</strong> (termasuk istirahat 1 jam). 
                          Check-in setelah pukul <strong>{attendance.flex_end}</strong> otomatis tercatat <strong>Terlambat</strong>.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                        Jam Buka Masuk (Start Flex)
                      </label>
                      <input
                        type="time"
                        value={attendance.flex_start}
                        onChange={(e) => setAttendance({ ...attendance, flex_start: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-bold focus:border-primary focus:bg-background focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground/80">Paling awal boleh check-in</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Sunset className="h-3.5 w-3.5 text-rose-500" />
                        Batas Akhir Masuk (End Flex)
                      </label>
                      <input
                        type="time"
                        value={attendance.flex_end}
                        onChange={(e) => setAttendance({ ...attendance, flex_end: e.target.value })}
                        className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-bold focus:border-primary focus:bg-background focus:outline-none"
                      />
                      <span className="text-[10px] text-muted-foreground/80">Lewat dari ini = Terlambat</span>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Timer className="h-3.5 w-3.5 text-primary" />
                        Durasi Kerja Wajib
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="number"
                          min="4"
                          max="12"
                          value={attendance.required_work_hours}
                          onChange={(e) =>
                            setAttendance({
                              ...attendance,
                              required_work_hours: parseInt(e.target.value) || 9,
                            })
                          }
                          className="w-20 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-bold text-center focus:border-primary focus:bg-background focus:outline-none"
                        />
                        <span className="text-xs font-bold text-primary">Jam / Hari</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80">9 jam termasuk istirahat</span>
                    </div>
                  </div>

                  {/* Interactive Dynamic Simulator Calculator */}
                  <div className="rounded-xl border border-border bg-muted/30/80 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-primary" />
                          Kalkulator Simulasi Jam Masuk & Target Pulang
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Uji coba simulasi perhitungan jam pulang berdasarkan waktu check-in.
                        </div>
                      </div>

                      <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-2xs">
                        <span className="text-xs text-muted-foreground font-medium">Jika Masuk:</span>
                        <input
                          type="time"
                          value={simulatedCheckIn}
                          onChange={(e) => setSimulatedCheckIn(e.target.value)}
                          className="text-xs font-bold text-primary bg-transparent outline-none cursor-pointer"
                        />
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/80" />
                        <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-950/30 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          Target Pulang: {calculateSimulatedCheckOut(simulatedCheckIn, attendance.required_work_hours)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Simulation Matrix */}
                    <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      {[
                        { in: '07:00', out: '16:00' },
                        { in: '07:30', out: '16:30' },
                        { in: '08:00', out: '17:00' },
                        { in: '08:30', out: '17:30' },
                        { in: '10:00', out: '19:00' },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSimulatedCheckIn(item.in)}
                          className={`rounded-xl p-2 border transition-all text-left ${
                            simulatedCheckIn === item.in
                              ? 'border-primary bg-primary/15 ring-2 ring-primary/20 shadow-xs'
                              : 'border-border bg-card hover:bg-muted'
                          }`}
                        >
                          <div className="text-[10px] text-muted-foreground/80 font-semibold">Masuk {item.in}</div>
                          <div className="text-xs font-bold text-foreground flex items-center justify-between mt-0.5">
                            <span>➔ {calculateSimulatedCheckOut(item.in, attendance.required_work_hours)}</span>
                            <span className="text-[10px] text-emerald-600 font-semibold">{attendance.required_work_hours}j</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode Fixed Shift Form */
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground">Nama Jadwal Shift</label>
                    <input
                      type="text"
                      value={attendance.schedule_name}
                      onChange={(e) => setAttendance({ ...attendance, schedule_name: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Jam Masuk (Start)</label>
                    <input
                      type="time"
                      value={attendance.work_start}
                      onChange={(e) => setAttendance({ ...attendance, work_start: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-bold focus:border-primary focus:bg-background focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground">Jam Pulang (End)</label>
                    <input
                      type="time"
                      value={attendance.work_end}
                      onChange={(e) => setAttendance({ ...attendance, work_end: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground font-bold focus:border-primary focus:bg-background focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Hari Kerja Efektif */}
              <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Hari Kerja Efektif</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                      const isSelected = attendance.work_days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWorkDay(day)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                            isSelected
                              ? 'bg-primary text-white shadow-2xs'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!attendance.is_flexible && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1.5">
                      Toleransi Keterlambatan
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={attendance.grace_period_minutes}
                        onChange={(e) =>
                          setAttendance({ ...attendance, grace_period_minutes: parseInt(e.target.value) || 0 })
                        }
                        className="w-20 rounded-xl border border-border bg-muted/40 px-3 py-1 text-xs text-foreground font-bold text-center focus:border-primary focus:outline-none"
                      />
                      <span className="text-xs text-muted-foreground">menit</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kebijakan Presensi Mobile & Validasi */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Aturan & Geofencing Presensi
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Tersinkronisasi dengan database <code>attendance_settings</code>.
              </p>

              <div className="mt-5 space-y-4">
                {/* WFH Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/15 p-2 text-primary">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Izinkan Presensi WFH (Work From Home)</div>
                      <div className="text-[11px] text-muted-foreground">
                        Karyawan dapat melakukan check-in di luar radius kantor bila disetujui.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendance({ ...attendance, allow_wfh: !attendance.allow_wfh })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      attendance.allow_wfh ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        attendance.allow_wfh ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Require Selfie Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/15 p-2 text-purple-700 dark:text-purple-300">
                      <Camera className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Wajib Swafoto / Selfie (Face Detection)</div>
                      <div className="text-[11px] text-muted-foreground">
                        Mewajibkan foto wajah langsung dari kamera HP/laptop saat check-in & check-out.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendance({ ...attendance, require_selfie: !attendance.require_selfie })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      attendance.require_selfie ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        attendance.require_selfie ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Require Location Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/15 p-2 text-emerald-700 dark:text-emerald-300">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Wajib Verifikasi Koordinat GPS</div>
                      <div className="text-[11px] text-muted-foreground">
                        Memvalidasi ketepatan posisi geografis perangkat terhadap radius kantor terdaftar.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendance({ ...attendance, require_location: !attendance.require_location })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      attendance.require_location ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        attendance.require_location ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Radius Meter Setting */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-foreground">Radius Presensi Maksimal (Geofence)</div>
                      <div className="text-[11px] text-muted-foreground">
                        Jarak toleransi lingkaran absensi dari titik pusat koordinat kantor.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="50"
                        max="2000"
                        step="25"
                        value={attendance.max_radius_meters}
                        onChange={(e) =>
                          setAttendance({ ...attendance, max_radius_meters: parseInt(e.target.value) || 100 })
                        }
                        className="w-24 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground text-center focus:border-primary focus:outline-none"
                      />
                      <span className="text-xs font-bold text-primary">meter</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {[50, 100, 150, 200, 300, 500].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAttendance({ ...attendance, max_radius_meters: r })}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all ${
                          attendance.max_radius_meters === r
                            ? 'bg-primary text-white shadow-2xs'
                            : 'bg-card border border-border text-muted-foreground hover:bg-muted/60'
                        }`}
                      >
                        {r} m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Policy Summary Card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Ringkasan Kebijakan Presensi
              </h3>

              <div className="mt-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Skema Jam Kerja</span>
                  <span className="font-bold text-primary">
                    {attendance.is_flexible ? 'Fleksibel 9 Jam' : 'Jadwal Tetap'}
                  </span>
                </div>
                {attendance.is_flexible ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Rentang Masuk</span>
                      <span className="font-bold text-foreground">
                        {attendance.flex_start} - {attendance.flex_end}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Kewajiban Durasi</span>
                      <span className="font-bold text-emerald-600">
                        {attendance.required_work_hours} Jam / Hari
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Ketentuan Pulang</span>
                      <span className="font-semibold text-foreground text-right">
                        Jam Masuk + {attendance.required_work_hours} Jam
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Jam Kerja</span>
                      <span className="font-bold text-foreground">
                        {attendance.work_start} - {attendance.work_end}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <span className="text-muted-foreground">Toleransi Terlambat</span>
                      <span className="font-bold text-amber-600">{attendance.grace_period_minutes} Menit</span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Presensi WFH</span>
                  <span className={`font-bold ${attendance.allow_wfh ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {attendance.allow_wfh ? 'Diizinkan' : 'Dilarang'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Wajib Selfie</span>
                  <span className={`font-bold ${attendance.require_selfie ? 'text-emerald-600' : 'text-muted-foreground/80'}`}>
                    {attendance.require_selfie ? 'Ya, Wajib' : 'Opsional'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">Geofence GPS</span>
                  <span className="font-bold text-primary">Radius {attendance.max_radius_meters} meter</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Database Record</span>
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    Schedule ID: {attendance.schedule_id ?? 1} | Setting ID: {attendance.id ?? 1}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-5 text-xs text-foreground">
              <div className="font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Validasi Lokasi Kantor
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground">
                Titik lokasi koordinat gedung kantor (latitude & longitude) dapat dikelola secara detail melalui menu{' '}
                <span className="font-semibold underline">Absensi &gt; Radius Office</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Notifikasi Pengajuan & Approval
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pemberitahuan otomatis ke atasan dan karyawan saat pengajuan diajukan atau disetujui.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Email Pengajuan Cuti & Izin</div>
                    <div className="text-[11px] text-muted-foreground">
                      Kirim email ke atasan langsung ketika karyawan mengajukan cuti atau sakit.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        emailLeaveNotification: !notifications.emailLeaveNotification,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.emailLeaveNotification ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.emailLeaveNotification ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Email Pengajuan Lembur (Overtime)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Notifikasi instan ke Manager saat formulir lembur masuk untuk diapprove.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        emailOvertimeNotification: !notifications.emailOvertimeNotification,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.emailOvertimeNotification ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.emailOvertimeNotification ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Eskalasi Approval Otomatis</div>
                    <div className="text-[11px] text-muted-foreground">
                      Alihkan approval ke level atasan berikutnya jika pending tanpa respons.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="14"
                      value={notifications.autoEscalateApprovalDays}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          autoEscalateApprovalDays: parseInt(e.target.value) || 3,
                        })
                      }
                      className="w-16 rounded-xl border border-border bg-card px-2 py-1.5 text-xs font-bold text-center text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">hari</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Peringatan Siklus Kepegawaian (Lifecycle Alerts)
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Pemberitahuan proaktif untuk bagian HRD terkait status kontrak kerja.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Alert Masa Kontrak PKWT Habis</div>
                    <div className="text-[11px] text-muted-foreground">
                      Kirim alert pengingat kepada HR Admin sebelum kontrak PKWT berakhir.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="7"
                      max="90"
                      value={notifications.contractExpiryAlertDays}
                      onChange={(e) =>
                        setNotifications({
                          ...notifications,
                          contractExpiryAlertDays: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-20 rounded-xl border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-center text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">hari sebelumnya</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Pengingat Presensi Masuk (Check-in Push)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Kirim reminder 15 menit sebelum jam kerja reguler dimulai ke mobile app.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifications({
                        ...notifications,
                        clockInReminder: !notifications.clockInReminder,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications.clockInReminder ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications.clockInReminder ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                Kanal Notifikasi
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sistem secara otomatis mengirimkan pemberitahuan melalui email internal dan in-app banner.
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 p-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500/10 dark:bg-emerald-950/300" />
                  <span className="font-semibold text-foreground">In-App Notification Bell</span>
                  <span className="ml-auto text-[10px] text-emerald-600 font-bold">Aktif</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/30 p-3 text-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500/10 dark:bg-emerald-950/300" />
                  <span className="font-semibold text-foreground">Email Gateway SMTP</span>
                  <span className="ml-auto text-[10px] text-emerald-600 font-bold">Terkonfigurasi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SECURITY */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Kebijakan Sesi & Autentikasi
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Aturan keamanan sesi pengguna dan perlindungan akun karyawan.
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Masa Berlaku Sesi Login (Session Timeout)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Pengguna wajib login ulang secara berkala jika tidak ada aktivitas.
                    </div>
                  </div>
                  <select
                    value={security.sessionTimeoutHours}
                    onChange={(e) =>
                      setSecurity({ ...security, sessionTimeoutHours: parseInt(e.target.value) || 24 })
                    }
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value={8}>8 Jam (Shift Harian)</option>
                    <option value={24}>24 Jam (1 Hari)</option>
                    <option value={72}>3 Hari</option>
                    <option value={168}>7 Hari (1 Minggu)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Batasi 1 Sesi Aktif (Single Device Login)</div>
                    <div className="text-[11px] text-muted-foreground">
                      Logout otomatis sesi lama bila akun yang sama login pada perangkat lain.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSecurity({ ...security, enforceSingleSession: !security.enforceSingleSession })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      security.enforceSingleSession ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        security.enforceSingleSession ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Panjang Minimum Kata Sandi</div>
                    <div className="text-[11px] text-muted-foreground">
                      Ketentuan minimum karakter saat karyawan membuat atau mereset sandi.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="6"
                      max="16"
                      value={security.minPasswordLength}
                      onChange={(e) =>
                        setSecurity({ ...security, minPasswordLength: parseInt(e.target.value) || 8 })
                      }
                      className="w-16 rounded-xl border border-border bg-card px-2 py-1.5 text-xs font-bold text-center text-foreground focus:border-primary focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">karakter</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div>
                    <div className="text-xs font-bold text-foreground">Wajib Ganti Password Setiap 90 Hari</div>
                    <div className="text-[11px] text-muted-foreground">
                      Meminta pembaharuan sandi secara periodik untuk keamanan data sensitif.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSecurity({
                        ...security,
                        requirePasswordChangeQuarterly: !security.requirePasswordChangeQuarterly,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      security.requirePasswordChangeQuarterly ? 'bg-primary' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        security.requirePasswordChangeQuarterly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/300/10 dark:bg-rose-950/30 p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200 dark:text-rose-200 flex items-center gap-2">
                <Lock className="h-4 w-4 text-rose-600" />
                Mode Pemeliharaan (Maintenance)
              </h3>
              <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">
                Bila diaktifkan, hanya Super Admin yang dapat mengakses sistem. Pengguna umum akan dialihkan ke layar pemeliharaan.
              </p>

              <div className="mt-4 flex items-center justify-between rounded-xl bg-card p-3.5 border border-rose-500/30">
                <span className="text-xs font-bold text-foreground">Aktifkan Maintenance</span>
                <button
                  type="button"
                  onClick={() => setSecurity({ ...security, maintenanceMode: !security.maintenanceMode })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    security.maintenanceMode ? 'bg-rose-600' : 'bg-muted-foreground/30'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      security.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SYSTEM & DB STATUS */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    Status Backend & Supabase Database
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Koneksi real-time ke PostgreSQL database cluster di Supabase Cloud.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadAllSettings}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Cek Ulang</span>
                </button>
              </div>

              <div className="mt-5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        dbStatus.connected ? 'bg-emerald-500/10 dark:bg-emerald-950/300 animate-pulse' : 'bg-rose-500/10 dark:bg-rose-950/300'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-foreground">Status Koneksi Supabase</div>
                      <div className="text-[11px] text-muted-foreground">PostgreSQL Instance</div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      dbStatus.connected
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                        : 'bg-rose-500/15 text-rose-800 dark:text-rose-200'
                    }`}
                  >
                    {dbStatus.connected ? 'Terhubung (Online)' : 'Terputus (Offline)'}
                  </span>
                </div>

                {dbStatus.latencyMs !== undefined && (
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
                    <div>
                      <div className="font-bold text-foreground">Latensi Respons Database</div>
                      <div className="text-[11px] text-muted-foreground">Round-trip ping time</div>
                    </div>
                    <span className="font-mono text-xs font-bold text-primary">
                      {dbStatus.latencyMs} ms
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
                  <div>
                    <div className="font-bold text-foreground">Versi Portal Gesit People</div>
                    <div className="text-[11px] text-muted-foreground">Dedicated HRIS Release</div>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">v4.1.2 Enterprise</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-3.5">
                  <div>
                    <div className="font-bold text-foreground">Tabel Konfigurasi Aktif</div>
                    <div className="text-[11px] text-muted-foreground">PostgreSQL Schemas</div>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                    attendance_settings, attendance_schedules, user_accounts
                  </span>
                </div>
              </div>
            </div>

            {/* Cache Management */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Pemeliharaan Data & Cache Browser
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Bersihkan cache formulir dan preferensi bila tampilan antarmuka terasa lambat atau tidak sinkron.
              </p>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
                <div>
                  <div className="text-xs font-bold text-foreground">Bersihkan Cache & Refresh Data</div>
                  <div className="text-[11px] text-muted-foreground">
                    Menghapus data sementara di LocalStorage dan memuat ulang data terbaru dari database.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearAppCache}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/15 transition-all"
                >
                  Bersihkan Cache
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                User Sesi Saat Ini
              </h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white font-bold text-sm">
                  {currentUser?.fullName ? currentUser.fullName[0] : 'A'}
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">{currentUser?.fullName || 'HR Administrator'}</div>
                  <div className="text-[11px] text-muted-foreground">{currentUser?.email || 'admin.hr@gesit.co.id'}</div>
                </div>
              </div>
              <div className="mt-4 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                <div>Role: <span className="font-semibold text-foreground">{currentUser?.role || 'Super Admin'}</span></div>
                <div>Department: <span className="font-semibold text-foreground">{currentUser?.department || 'Human Resources'}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
