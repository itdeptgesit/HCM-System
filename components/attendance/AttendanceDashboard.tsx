import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, MapPin, Calendar, Sun, Moon, Coffee, AlertTriangle,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight, ChevronDown, Download,
  Plus, Search, Filter, RefreshCw, Eye, Trash2, Edit3,
  Timer, Briefcase, Users, FileText, BarChart3, Settings,
  Navigation, Shield, X, Loader2, User, Building2, Sunrise, Sunset,
  LayoutDashboard, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { isHRAccount, jakartaDate } from '../../lib/workforce-contract';
import { fetchAllRows, loadWorkforceAccounts, normalizeAttendance } from '../../lib/workforceData';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '../StatCard';
import { UserAvatar } from '../UserAvatar';
import {
  AttendanceRecord, AttendanceSchedule, OfficeLocation, AttendanceSettings,
  UserAccount, LeaveRequest, OvertimeRequest, GPS_BG, GPS_DOT, STATUS_CONFIG, formatTime, formatDate, formatMinutes,
  getDistanceMeters, getGeoLocation, renderStatusBadge, isUserAllowedAtLocation, parseLocationMeta
} from './attendanceTypes';

const ClockPanel: React.FC<{
  userId: string;
  currentUser?: any;
  todayRecord: AttendanceRecord | null;
  schedule: AttendanceSchedule | null;
  locations: OfficeLocation[];
  onClockAction: () => void;
}> = ({ userId, currentUser, todayRecord, schedule, locations, onClockAction }) => {
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'inside' | 'outside' | 'restricted' | 'unknown'>('checking');
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearestLocation, setNearestLocation] = useState<{ name: string; distance: number; allowed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userAccount = useMemo(() => currentUser || { id: userId }, [currentUser, userId]);

  // Filter lokasi aktif yang diizinkan untuk akun karyawan ini
  const userAllowedLocations = useMemo(() => {
    return locations.filter(loc => loc.is_active && isUserAllowedAtLocation(userAccount, loc));
  }, [locations, userAccount]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkLocation = async () => {
      try {
        setLocationStatus('checking');
        const pos = await getGeoLocation();
        setCurrentLocation(pos);

        const activeLocations = locations.filter(loc => loc.is_active);
        if (activeLocations.length > 0) {
          let minDist = Infinity;
          let nearestAny: { loc: OfficeLocation; dist: number } | null = null;
          let insideAllowedLoc: OfficeLocation | null = null;
          let insideRestrictedLoc: OfficeLocation | null = null;

          for (const loc of activeLocations) {
            const dist = getDistanceMeters(pos.lat, pos.lng, loc.latitude, loc.longitude);
            if (dist < minDist) {
              minDist = dist;
              nearestAny = { loc, dist };
            }

            const allowed = isUserAllowedAtLocation(userAccount, loc);
            if (dist <= loc.radius_meters) {
              if (allowed) {
                insideAllowedLoc = loc;
              } else if (!insideRestrictedLoc) {
                insideRestrictedLoc = loc;
              }
            }
          }

          if (insideAllowedLoc) {
            // Berada di dalam radius kantor yang diizinkan
            setNearestLocation({ name: insideAllowedLoc.name, distance: Math.round(minDist), allowed: true });
            setLocationStatus('inside');
            setError(null);
          } else if (insideRestrictedLoc) {
            // Berada di kantor yang dibatasi dan akun tidak terdaftar
            setNearestLocation({ name: insideRestrictedLoc.name, distance: 0, allowed: false });
            setLocationStatus('restricted');
            setError(`Anda berada di ${insideRestrictedLoc.name}, namun akun Anda belum terdaftar untuk absensi di lokasi ini.`);
          } else if (nearestAny) {
            // Di luar radius kantor terdekat
            const allowed = isUserAllowedAtLocation(userAccount, nearestAny.loc);
            setNearestLocation({ name: nearestAny.loc.name, distance: Math.round(nearestAny.dist), allowed });
            setLocationStatus('outside');
          } else {
            setLocationStatus('unknown');
          }
        } else {
          setLocationStatus('unknown');
        }
      } catch {
        setLocationStatus('unknown');
      }
    };
    checkLocation();
    const timer = setInterval(checkLocation, 30000);
    return () => clearInterval(timer);
  }, [locations, userAccount]);

  const isClockedIn = !!todayRecord?.clock_in;
  const isClockedOut = !!todayRecord?.clock_out;

  // Flexible Hours Policy: Check-in 07:00 - 10:00, Wajib 9 Jam Kerja
  const policy = schedule;

  const isFlexible = policy?.is_flexible ?? true;
  const flexStart = policy?.flex_start || '07:00';
  const flexEnd = policy?.flex_end || '10:00';
  const requiredHours = policy?.required_work_hours || 9;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let isLate = false;
  if (isFlexible) {
    const [feH, feM] = flexEnd.split(':').map(Number);
    const flexEndMinutes = (feH || 10) * 60 + (feM || 0);
    // Masuk setelah batas fleksibel (10:00) = Terlambat
    isLate = nowMinutes > flexEndMinutes;
  } else {
    const scheduleStart = (schedule as any)?.work_start || schedule?.start_time || '08:00';
    const [sh, sm] = scheduleStart.split(':').map(Number);
    const scheduleMinutes = (sh || 8) * 60 + (sm || 0);
    isLate = nowMinutes > scheduleMinutes + (schedule?.grace_period_minutes || 15);
  }

  // Perhitungan Target Jam Pulang (Clock In + 9 Jam) & Durasi Real-Time
  const clockInDate = todayRecord?.clock_in ? new Date(todayRecord.clock_in) : null;
  const targetClockOutDate = clockInDate
    ? new Date(clockInDate.getTime() + requiredHours * 60 * 60 * 1000)
    : null;
  const targetClockOutStr = targetClockOutDate
    ? targetClockOutDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const elapsedMinutes = clockInDate && !isClockedOut
    ? Math.max(0, Math.floor((now.getTime() - clockInDate.getTime()) / (60 * 1000)))
    : (todayRecord?.total_work_minutes || 0);

  const targetMinutes = requiredHours * 60; // 540 minutes
  const percentComplete = Math.min(100, Math.round((elapsedMinutes / targetMinutes) * 100));
  const isNineHoursReached = elapsedMinutes >= targetMinutes;
  const remainingMinutes = Math.max(0, targetMinutes - elapsedMinutes);

  const handleClock = async (type: 'in' | 'out') => {
    if (locationStatus === 'restricted') {
      const msg = nearestLocation
        ? `Absensi ditolak: Akun Anda tidak memiliki hak presensi di ${nearestLocation.name}.`
        : 'Absensi ditolak: Akun Anda tidak terdaftar di lokasi ini.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const pos = currentLocation || await getGeoLocation();

      if (type === 'in') {
        const { error: upsertError } = await supabase.rpc('clock_in_attendance', { p_date: jakartaDate(now), p_lat: pos.lat, p_lng: pos.lng, p_status: isLate ? 'late' : 'present', p_work_mode: 'wfo' });
        if (upsertError) throw upsertError;
      } else {
        const { error: updateError } = await supabase.rpc('clock_out_attendance', { p_date: jakartaDate(now), p_lat: pos.lat, p_lng: pos.lng });
        if (updateError) throw updateError;
      }
      onClockAction();
    } catch (err: any) {
      const msg = err.message || 'Gagal melakukan absensi';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clockTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const gpsColor = locationStatus === 'inside'
    ? 'text-emerald-700'
    : locationStatus === 'restricted'
    ? 'text-amber-800'
    : locationStatus === 'outside'
    ? 'text-red-700'
    : 'text-slate-600';
  const gpsDotColor = locationStatus === 'inside'
    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]'
    : locationStatus === 'restricted'
    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.7)]'
    : locationStatus === 'outside'
    ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
    : 'bg-slate-400';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Navy Gradient Header with Clock */}
      <div className="relative bg-gradient-to-br from-[#103065] to-[#173E77] px-6 pt-7 pb-20 text-center text-white">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">Jam Absensi</div>
        <div className="text-[52px] font-light leading-none tracking-tight tabular-nums">
          {clockTime}
        </div>
        <div className="mt-2 text-[13px] text-white/60">{dateStr}</div>
        
        {/* Schedule Badge: Jam Fleksibel atau Tetap */}
        {isFlexible ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-xs">
            <Clock size={11} className="text-[#BC9C33]" />
            <span>Jam Fleksibel: Masuk {flexStart} - {flexEnd} · Pulang Wajib {requiredHours} Jam</span>
          </div>
        ) : schedule ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white/70">
            <Clock size={11} /> {(schedule as any).work_start || schedule.start_time} — {(schedule as any).work_end || schedule.end_time} · Grace {schedule.grace_period_minutes}m
          </div>
        ) : null}
      </div>

      {/* Floating clock button + status card */}
      <div className="relative -mt-14 px-5">
        {/* GPS pill */}
        <div className={cn(
          'mx-auto mb-2 flex w-fit max-w-full items-center justify-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-medium shadow-xs transition-all',
          GPS_BG[locationStatus] || GPS_BG.unknown,
          gpsColor
        )}>
          <span className={cn('h-2 w-2 rounded-full shrink-0', gpsDotColor)} />
          <span>
            {locationStatus === 'checking' && 'Memeriksa lokasi GPS...'}
            {locationStatus === 'inside' && `Di dalam area — ${nearestLocation?.name || 'Kantor'}`}
            {locationStatus === 'restricted' && `Akses Terbatas — ${nearestLocation?.name || 'Kantor'} (Akun tidak terdaftar)`}
            {locationStatus === 'outside' && `Di luar area${nearestLocation ? ` — ${nearestLocation.name} (${nearestLocation.distance}m)` : ''}`}
            {locationStatus === 'unknown' && 'Lokasi GPS tidak diketahui'}
          </span>
        </div>

        {/* Assigned Location Info */}
        {userAllowedLocations.length > 0 ? (
          <div className="mx-auto mb-4 flex w-fit max-w-sm items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
            <MapPin size={12} className="text-[#BC9C33] shrink-0" />
            <span className="truncate">
              Lokasi Presensi Anda:{' '}
              <strong className="font-semibold text-slate-700">
                {userAllowedLocations.map(l => l.name).join(', ')}
              </strong>
            </span>
          </div>
        ) : locations.length > 0 ? (
          <div className="mx-auto mb-4 flex w-fit max-w-sm items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-1.5 text-center text-[11px] text-amber-800">
            <Shield size={12} className="text-amber-600 shrink-0" />
            <span>Akun Anda belum didaftarkan pada lokasi presensi manapun. Hubungi HR.</span>
          </div>
        ) : null}

        {/* Clock action button */}
        <div className="flex justify-center">
          {!isClockedIn ? (
            <button
              onClick={() => handleClock('in')}
              disabled={loading || locationStatus === 'restricted'}
              title={locationStatus === 'restricted' ? 'Akun Anda tidak memiliki hak presensi di lokasi ini' : undefined}
              className={cn(
                "group relative flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-all active:scale-95 disabled:opacity-60",
                locationStatus === 'restricted'
                  ? "bg-gradient-to-br from-amber-700 to-amber-900 shadow-amber-900/30 cursor-not-allowed"
                  : "bg-gradient-to-br from-[#BC9C33] to-[#a88929] shadow-amber-600/30"
              )}
            >
              {loading ? (
                <Loader2 size={36} className="animate-spin" />
              ) : locationStatus === 'restricted' ? (
                <Shield size={32} strokeWidth={1.8} className="text-amber-200" />
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Sunrise size={32} strokeWidth={1.5} />
                </>
              )}
            </button>
          ) : !isClockedOut ? (
            <button
              onClick={() => handleClock('out')}
              disabled={loading || locationStatus === 'restricted'}
              title={locationStatus === 'restricted' ? 'Akun Anda tidak memiliki hak presensi di lokasi ini' : undefined}
              className={cn(
                "group relative flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white text-white shadow-lg transition-all active:scale-95 disabled:opacity-60",
                locationStatus === 'restricted'
                  ? "bg-gradient-to-br from-amber-700 to-amber-900 shadow-amber-900/30 cursor-not-allowed"
                  : "bg-gradient-to-br from-[#103065] to-[#173E77] shadow-blue-900/30"
              )}
            >
              {loading ? (
                <Loader2 size={36} className="animate-spin" />
              ) : locationStatus === 'restricted' ? (
                <Shield size={32} strokeWidth={1.8} className="text-amber-200" />
              ) : (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                  <Sunset size={32} strokeWidth={1.5} />
                </>
              )}
            </button>
          ) : (
            <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-4 border-white bg-emerald-50">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
          )}
        </div>

        {/* Label under button */}
        <div className="mt-3 text-center">
          <div className="text-[15px] font-semibold text-slate-800">
            {locationStatus === 'restricted'
              ? 'Akses Lokasi Terbatas'
              : isClockedIn && !isClockedOut
              ? 'Clock Out'
              : isClockedIn && isClockedOut
              ? 'Absensi Selesai'
              : 'Clock In'}
          </div>
          {locationStatus === 'restricted' ? (
            <div className="mt-1 text-[12px] font-medium text-amber-600">
              Akun Anda tidak memiliki hak akses presensi di lokasi ini
            </div>
          ) : todayRecord ? (
            <div className="mt-1 text-[12px] text-slate-400">
              {isClockedIn && !isClockedOut ? `Mulai pukul ${formatTime(todayRecord.clock_in)}` : isClockedIn && isClockedOut ? 'Selamat beristirahat' : 'Siap untuk memulai hari'}
            </div>
          ) : null}
        </div>

        {/* Card Real-Time Target Jam Pulang (9 Jam Kerja) */}
        {isClockedIn && !isClockedOut && (
          <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sunset size={16} className="text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-[#103065]">
                  Target Jam Pulang: {targetClockOutStr}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isNineHoursReached
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isNineHoursReached
                  ? '✓ 9 Jam Terpenuhi'
                  : `Kurang ${Math.floor(remainingMinutes / 60)}j ${remainingMinutes % 60}m`}
              </span>
            </div>

            {/* Progress Bar Durasi 9 Jam */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-500 ${
                  isNineHoursReached ? 'bg-emerald-500' : 'bg-[#103065]'
                }`}
                style={{ width: `${percentComplete}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Masuk: <strong>{formatTime(todayRecord?.clock_in)}</strong> ({Math.floor(elapsedMinutes / 60)}j {elapsedMinutes % 60}m)
              </span>
              <span>Wajib 9 Jam</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-center text-[13px] text-red-600">
            {error}
          </div>
        )}

        {/* Today Summary Cards */}
        {todayRecord && (
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              {
                label: 'Clock In',
                value: formatTime(todayRecord.clock_in),
                icon: <Sunrise size={13} className="text-emerald-500" />,
              },
              {
                label: isClockedOut ? 'Clock Out' : 'Target Pulang',
                value: isClockedOut ? formatTime(todayRecord.clock_out) : targetClockOutStr,
                icon: <Sunset size={13} className="text-blue-500" />,
              },
              {
                label: 'Durasi',
                value: isClockedOut
                  ? formatMinutes(todayRecord.total_work_minutes)
                  : `${Math.floor(elapsedMinutes / 60)}j ${elapsedMinutes % 60}m`,
                icon: <Timer size={13} className="text-amber-500" />,
              },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-center">
                <div className="mb-1.5 flex justify-center">{item.icon}</div>
                <div className="text-[14px] font-bold tabular-nums text-slate-800">{item.value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export interface AttendanceDashboardProps {
  currentUser?: any;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({ currentUser }) => {
  const userId = String(currentUser?.id || '');
  const isManager = isHRAccount(currentUser);

  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [schedule, setSchedule] = useState<AttendanceSchedule | null>(null);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings | null>(null);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [deptFilter, setDeptFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [historyMonth, setHistoryMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const today = jakartaDate();
      const [todayRes, schRes, locRes, empRes, recRes, lRes, oRes] = await Promise.all([
        supabase.from('attendance_records').select('*').eq('user_id', userId).eq('date', today).maybeSingle(),
        supabase.from('attendance_schedules').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('office_locations').select('*').eq('is_active', true),
        loadWorkforceAccounts().then(data => ({ data })),
        fetchAllRows((from, to) => {
          let query = supabase.from('attendance_records').select('*').gte('date', `${historyMonth}-01`).lte('date', today).order('date', { ascending: false }).order('id');
          if (!isManager) query = query.eq('user_id', userId);
          return query.range(from, to);
        }).then(data => ({ data })),
        fetchAllRows((from, to) => supabase.from('leave_requests').select('*').order('id').range(from, to)).then(data => ({ data })),
        fetchAllRows((from, to) => supabase.from('overtime_requests').select('*').order('id').range(from, to)).then(data => ({ data })),
      ]);

      setTodayRecord(todayRes.data ? normalizeAttendance(todayRes.data) as AttendanceRecord : null);
      if (schRes.data) setSchedule(schRes.data as AttendanceSchedule);
      if (locRes.data) setLocations(locRes.data as OfficeLocation[]);
      if (empRes.data) {
        setAllUsers(empRes.data.map((e: any) => ({
          id: String(e.id),
          full_name: e.full_name,
          email: e.email,
          department: e.department,
          job_title: e.job_title,
          company: e.company,
          status: e.status,
          avatar_url: e.avatar_url,
        })));
      }
      if (recRes.data) setAllRecords(recRes.data.map(normalizeAttendance) as AttendanceRecord[]);
      if (lRes.data) setLeaveRequests(lRes.data as LeaveRequest[]);
      if (oRes.data) setOvertimeRequests(oRes.data as OvertimeRequest[]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, historyMonth, isManager]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshKey]);

  const userMap = useMemo(() => {
    const map = new Map<string, UserAccount>();
    allUsers.forEach(u => map.set(String(u.id), u));
    return map;
  }, [allUsers]);

  const monthlyStats = useMemo(() => {
    const present = allRecords.filter(r => r.status === 'present').length;
    const late = allRecords.filter(r => r.status === 'late').length;
    const absent = allRecords.filter(r => r.status === 'absent').length;
    const leave = allRecords.filter(r => r.status === 'leave').length;
    return { present, late, absent, leave };
  }, [allRecords]);

  const activeUsers = useMemo(() => {
    const filtered = deptFilter === 'all'
      ? allUsers
      : allUsers.filter(u => u.department === deptFilter);
    return filtered.filter(u => u.status !== 'Inactive');
  }, [allUsers, deptFilter]);

  const todayStats = useMemo(() => {
    const today = jakartaDate();
    const todayRecords = allRecords.filter(r => r.date === today);
    const userIds = new Set(activeUsers.map(u => String(u.id)));
    const ts = todayRecords.filter(r => userIds.has(String(r.user_id)));
    const present = ts.filter(r => r.status === 'present').length;
    const late = ts.filter(r => r.status === 'late').length;
    const leave = ts.filter(r => r.status === 'leave').length;
    const absent = ts.filter(r => r.status === 'absent').length;
    const notYet = activeUsers.length - ts.length;
    return { present, late, leave, absent, notYet, total: activeUsers.length };
  }, [allRecords, activeUsers]);

  const managerStats = useMemo(() => {
    const [y, m] = historyMonth.split('-').map(Number);
    const monthRecords = allRecords.filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    const present = monthRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const late = monthRecords.filter(r => r.status === 'late').length;
    const leave = monthRecords.filter(r => r.status === 'leave').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const totalWork = monthRecords.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0);
    const totalOT = monthRecords.reduce((sum, r) => sum + (r.total_overtime_minutes || 0), 0);
    return { present, late, leave, absent, totalWork, totalOT, total: monthRecords.length };
  }, [allRecords, historyMonth]);

  // ── Request scope filters (dept & company) ──────────────────────────

  const renderDashboard = () => (
    <div className="flex flex-col gap-5">
      <ClockPanel
        userId={userId}
        currentUser={currentUser}
        todayRecord={todayRecord}
        schedule={schedule}
        locations={locations}
        onClockAction={() => setRefreshKey(k => k + 1)}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { label: 'Hadir', value: monthlyStats.present, icon: <CheckCircle2 size={16} />, bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
          { label: 'Terlambat', value: monthlyStats.late, icon: <AlertTriangle size={16} />, bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/20' },
          { label: 'Cuti', value: leaveRequests.filter(l => l.status === 'approved').length, icon: <Calendar size={16} />, bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-500/20' },
          { label: 'Lembur', value: overtimeRequests.filter(o => o.status === 'approved').length, icon: <Timer size={16} />, bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/20' },
        ].map((stat, i) => (
          <div key={i} className={cn('rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md', stat.border)}>
            <div className="flex items-center gap-2">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', stat.bg, stat.text)}>
                {stat.icon}
              </div>
              <div>
                <div className={cn('text-xl font-extrabold tabular-nums tracking-[-0.02em]', stat.text)}>{stat.value}</div>
                <div className="text-[11px] font-medium text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <span className="text-[13px] font-bold tracking-[-0.01em] text-slate-800">Aktivitas Terakhir</span>
          <span className="text-[11px] font-medium text-slate-400">7 hari terakhir</span>
        </div>
        <div className="p-2">
          {historyRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
              <Clock size={28} className="opacity-20" />
              <p className="text-[13px] font-medium">Belum ada data</p>
            </div>
          ) : (
            historyRecords.slice(0, 7).map((r, i) => {
              const sc = r.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-600/20' : r.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-600/20' : 'bg-red-50 text-red-700 border-red-600/20';
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl px-4 py-3 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-full border', sc)}>
                      <span className="text-[11px] font-bold">{new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric' })}</span>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-slate-700">
                        {new Date(r.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-400">
                        {formatTime(r.clock_in)} — {r.clock_out ? formatTime(r.clock_out) : '—'}
                      </div>
                    </div>
                  </div>
                  {renderStatusBadge(r.status)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  // ── HR Reports View (all employees) ────────────────────────────────────

  const deptOptions = useMemo(() => {
    const depts = Array.from(new Set(allUsers.map(u => u.department).filter(Boolean) as string[]));
    return depts.sort();
  }, [allUsers]);

  const canViewAll = isManager;

  const fetchAllRecords = useCallback(async () => {
    if (!isManager) return;
    try {
      const today = jakartaDate();
      const monthStart = `${today.slice(0, 7)}-01`;
      const [records, employees] = await Promise.all([
        fetchAllRows((from, to) => supabase.from('attendance_records').select('*').gte('date', monthStart).lte('date', today).order('date', { ascending: false }).order('id').range(from, to)),
        loadWorkforceAccounts(),
      ]);
      setAllRecords(records.map(normalizeAttendance) as AttendanceRecord[]);
      setAllUsers(employees);
    } catch (err) {
      console.warn('HR fetch error:', err);
    }
  }, [isManager]);

  useEffect(() => { if (canViewAll) fetchAllRecords(); }, [canViewAll, fetchAllRecords, refreshKey]);

  const exportCSV = () => {
    const rows = allRecords.map(r => {
      const u = userMap.get(r.user_id);
      return {
        Tanggal: r.date,
        Nama: u?.full_name || 'Unknown',
        Departemen: u?.department || '',
        'Clock In': formatTime(r.clock_in),
        'Clock Out': r.clock_out ? formatTime(r.clock_out) : '-',
        Durasi: formatMinutes(r.total_work_minutes),
        Lembur: formatMinutes(r.total_overtime_minutes),
        Status: STATUS_CONFIG[r.status]?.label || r.status,
      };
    });
    if (rows.length === 0) {
      toast.error('Belum ada data untuk diexport');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`.replace(/"/g, '""')).join(',')),
    ].join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `absensi-harian-${jakartaDate()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('File CSV berhasil diunduh');
  };

  const renderHRDashboard = () => (
    <div className="flex flex-col gap-4 p-3 sm:p-5">
      {/* Header: Dept filter + export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
              <Users size={18} />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Human Resources</p>
              <h3 className="text-xl font-medium tracking-[-0.04em] text-slate-950">Good morning, HR Team</h3>
            </div>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {new Date(historyMonth + '-01').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })} · {activeUsers.length} karyawan aktif
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="h-9 flex-1 sm:flex-none rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 outline-none focus:border-slate-400"
          >
            <option value="all" className="text-slate-900">Semua Departemen</option>
            {deptOptions.map(dep => (
              <option key={dep} value={dep} className="text-slate-900">{dep}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-9 border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      {/* HR overview KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total Employees', value: activeUsers.length, note: 'Active workforce', icon: <Users size={18} />, tone: 'bg-slate-100 text-slate-900' },
          { label: 'Attendance Today', value: todayStats.present + todayStats.late, note: `${todayStats.present} on time · ${todayStats.late} late`, icon: <CheckCircle2 size={18} />, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'On Leave', value: todayStats.leave, note: 'Approved leave today', icon: <Calendar size={18} />, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Pending Requests', value: leaveRequests.filter(r => String(r.status).toLowerCase() === 'pending').length + overtimeRequests.filter(r => String(r.status).toLowerCase() === 'pending').length, note: 'Need HR review', icon: <Clock size={18} />, tone: 'bg-orange-50 text-orange-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>{item.icon}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">HR</span></div>
            <div className="mt-5 text-3xl font-medium tracking-[-0.05em] text-slate-950">{item.value}</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{item.label}</div><div className="mt-1 text-xs text-slate-400">{item.note}</div>
          </div>
        ))}
      </div>

      {/* Today's Stat Cards */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Karyawan', value: todayStats.total, icon: <Users size={14} />, bg: 'bg-slate-100', text: 'text-slate-700' },
          { label: 'Hadir', value: todayStats.present, icon: <CheckCircle2 size={14} />, bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
          { label: 'Terlambat', value: todayStats.late, icon: <AlertTriangle size={14} />, bg: 'bg-amber-500/10', text: 'text-amber-600' },
          { label: 'Cuti/Izin', value: todayStats.leave, icon: <Calendar size={14} />, bg: 'bg-violet-500/10', text: 'text-violet-600' },
          { label: 'Belum Absen', value: todayStats.notYet, icon: <Clock size={14} />, bg: 'bg-orange-500/10', text: 'text-orange-600' },
          { label: 'Tidak Hadir', value: todayStats.absent, icon: <XCircle size={14} />, bg: 'bg-red-500/10', text: 'text-red-600' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-1.5">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', s.bg, s.text)}>{s.icon}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">{s.label}</span>
            </div>
            <div className="mt-2 text-[22px] font-extrabold tabular-nums tracking-[-0.02em] text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Summary: 4 stat bulan ini */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          { label: 'Hadir Bulan Ini', value: managerStats.present, gradient: 'from-emerald-500 to-emerald-400', icon: <CheckCircle2 size={14} /> },
          { label: 'Terlambat', value: managerStats.late, gradient: 'from-amber-500 to-amber-400', icon: <AlertTriangle size={14} /> },
          { label: 'Cuti/Izin', value: managerStats.leave, gradient: 'from-violet-500 to-violet-400', icon: <Calendar size={14} /> },
          { label: 'Total Jam Kerja', value: formatMinutes(managerStats.totalWork), gradient: 'from-[#103065] to-[#173E77]', icon: <Timer size={14} /> },
        ].map((s, i) => (
          <div key={i} className={cn('rounded-xl p-3.5 text-white shadow-sm transition-all hover:shadow-md bg-gradient-to-br', s.gradient)}>
            <div className="flex items-center gap-1.5 text-white/70">
              {s.icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</span>
            </div>
            <div className="mt-1.5 text-[22px] font-extrabold tabular-nums tracking-[-0.02em]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Visual overview */}
      <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-900">Distribusi Kehadiran</h3><p className="mt-0.5 text-[11px] text-slate-400">Status karyawan hari ini</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Live</span></div>
            <div className="mt-5 flex h-32 items-end gap-2 sm:gap-4">
              {[{ label: 'Hadir', value: todayStats.present, color: 'bg-emerald-500' }, { label: 'Terlambat', value: todayStats.late, color: 'bg-amber-400' }, { label: 'Cuti/Izin', value: todayStats.leave, color: 'bg-violet-500' }, { label: 'Belum Absen', value: todayStats.notYet, color: 'bg-slate-300' }, { label: 'Tidak Hadir', value: todayStats.absent, color: 'bg-rose-500' }].map(item => { const max = Math.max(todayStats.total, 1); return <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className="text-xs font-bold tabular-nums text-slate-700">{item.value}</span><div className="flex h-24 w-full items-end rounded-lg bg-slate-50"><div className={cn('w-full rounded-lg transition-all', item.color)} style={{ height: `${Math.max(item.value / max * 100, item.value ? 8 : 2)}%` }} /></div><span className="w-full truncate text-center text-[9px] font-semibold text-slate-400">{item.label}</span></div> })}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="p-4 sm:p-5"><h3 className="text-sm font-bold text-slate-900">Ringkasan Bulanan</h3><p className="mt-0.5 text-[11px] text-slate-400">Performa bulan berjalan</p><div className="mt-5 space-y-4">{[{ label: 'Hadir', value: managerStats.present, color: 'bg-emerald-500' }, { label: 'Terlambat', value: managerStats.late, color: 'bg-amber-400' }, { label: 'Cuti/Izin', value: managerStats.leave, color: 'bg-violet-500' }].map(item => { const total = Math.max(managerStats.present + managerStats.late + managerStats.leave, 1); return <div key={item.label}><div className="mb-1.5 flex justify-between text-[11px]"><span className="font-medium text-slate-500">{item.label}</span><span className="font-bold tabular-nums text-slate-700">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', item.color)} style={{ width: `${Math.min(item.value / total * 100, 100)}%` }} /></div></div> })}</div></CardContent></Card>
      </div>

      {/* Today Table: all employees */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[13px] font-bold tracking-[-0.01em] text-slate-900">Kehadiran Hari Ini</span>
            <div className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-slate-500">Live</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Karyawan</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Departemen</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Clock In</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Clock Out</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Durasi</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-12 text-center text-slate-400">Tidak ada karyawan aktif</TableCell></TableRow>
              ) : (
                activeUsers.map(u => {
                  const today = jakartaDate();
                  const rec = allRecords.find(r => String(r.user_id) === String(u.id) && r.date === today);
                  const isPresent = rec && (rec.status === 'present' || rec.status === 'late');
                  return (
                    <TableRow key={u.id} className={cn('border-b border-slate-100 transition-colors', isPresent ? 'hover:bg-emerald-50/30' : 'hover:bg-slate-50/50')}>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
                            isPresent ? 'bg-gradient-to-br from-[#103065] to-[#173E77]' : 'bg-slate-300'
                          )}>
                            {(u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-[13px] font-semibold text-slate-800">{u.full_name || u.username || 'Tanpa Nama'}</div>
                            {u.job_title && <div className="text-[10px] text-slate-400">{u.job_title}</div>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-500">{u.department || '-'}</TableCell>
                      <TableCell className="tabular-nums text-[12px] text-slate-600">{rec ? formatTime(rec.clock_in) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell className="tabular-nums text-[12px] text-slate-600">{rec?.clock_out ? formatTime(rec.clock_out) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell className="tabular-nums text-[12px] font-semibold text-slate-600">{rec ? formatMinutes(rec.total_work_minutes) : <span className="text-slate-300">—</span>}</TableCell>
                      <TableCell>
                        {rec ? renderStatusBadge(rec.status) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[11px]">Belum Absen</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  // ── Leave Requests View ────────────────────────────────────────────────


  return (
    <div className="w-full">
      <div className="border-b border-border/40 bg-card/60 dark:bg-zinc-900/40 px-4 py-3 sm:px-6 sm:py-4 mb-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-white bg-slate-800">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-foreground">Dashboard Absensi</h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">Overview kehadiran hari ini</p>
          </div>
        </div>
      </div>

      {isManager ? renderHRDashboard() : renderDashboard()}
    </div>
  );
};

export default AttendanceDashboard;
