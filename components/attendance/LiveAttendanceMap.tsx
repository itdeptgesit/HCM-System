'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin, Search, Filter, RefreshCw, Building2, User, Clock,
  CheckCircle2, AlertTriangle, ExternalLink, Users, Calendar,
  Navigation, Eye, X, Layers, Compass, RotateCcw
} from '@/components/ui/icons';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabaseClient';
import { jakartaDate } from '@/lib/workforce-contract';
import { getDistanceMeters, OfficeLocation, formatTime } from './attendanceTypes';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '../UserAvatar';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Helper component to smoothly fly/pan to coordinates
function MapFlyTo({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.flyTo(center, zoom || 16, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcon Generators (no broken static image URLs)
const createOfficeIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-office-pin',
    html: `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: #1e3a8a;
        color: white;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        font-size: 16px;
      ">
        🏢
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
};

const createEmployeePin = (isInside: boolean, initials: string) => {
  const bg = isInside ? '#10b981' : '#f59e0b';
  const border = isInside ? '#059669' : '#d97706';

  return L.divIcon({
    className: 'custom-employee-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: ${bg};
        color: white;
        font-weight: 700;
        font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.25);
        font-family: sans-serif;
      ">
        ${initials.slice(0, 2).toUpperCase()}
        <span style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${border};
          border: 1.5px solid white;
        "></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export interface LiveAttendanceMapProps {
  currentUser?: any;
}

export function LiveAttendanceMap({ currentUser }: LiveAttendanceMapProps) {
  const [selectedDate, setSelectedDate] = useState<string>(jakartaDate());
  const [loading, setLoading] = useState<boolean>(true);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [attendancePoints, setAttendancePoints] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'outside'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedEmployeePoint, setSelectedEmployeePoint] = useState<any | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const { resolvedTheme } = useTheme();
  const [mapTheme, setMapTheme] = useState<'dark' | 'light' | 'satellite'>('dark');

  const activeTileConfig = useMemo(() => {
    if (mapTheme === 'satellite') {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        name: 'Satelit',
        containerClass: 'map-theme-satellite',
        maxZoom: 19
      };
    }
    if (mapTheme === 'light') {
      return {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: 'Terang',
        containerClass: 'map-theme-light',
        maxZoom: 19
      };
    }
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Dark Mode',
      containerClass: 'map-theme-dark',
      maxZoom: 19
    };
  }, [mapTheme]);

  // Load office locations & attendance records for selected date
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active office locations
      const { data: officeData, error: officeErr } = await supabase
        .from('office_locations')
        .select('*')
        .order('name');
      if (officeErr) throw officeErr;
      const validOffices = (officeData || []).filter(
        (o) => !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude))
      );
      setLocations(validOffices);

      // 2. Fetch users for metadata
      const { data: usersData, error: userErr } = await supabase
        .from('user_accounts')
        .select('id, full_name, nickname, employee_code, department, avatar_url');
      if (userErr) {
        console.warn('Error fetching user_accounts in attendance map:', userErr);
      }
      const uMap: Record<string, any> = {};
      const depts = new Set<string>();
      if (usersData) {
        usersData.forEach((u) => {
          const key = String(u.id);
          const empName = u.full_name || u.nickname || 'Karyawan';
          uMap[key] = {
            name: empName,
            nik: u.employee_code || '',
            department: u.department || 'Umum',
            avatar: u.avatar_url || ''
          };
          if (u.department) depts.add(u.department);
        });
      }
      setDepartments(Array.from(depts).sort());

      // 3. Fetch attendance records for selected date
      const { data: attData, error: attErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', selectedDate);
      if (attErr) throw attErr;

      // 4. Process attendance points with lat/lng
      const points: any[] = [];
      (attData || []).forEach((row) => {
        const lat = Number(row.clock_in_lat || row.latitude);
        const lng = Number(row.clock_in_lng || row.longitude);

        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          const userMeta = uMap[String(row.user_id)] || {
            name: row.user_name || 'Karyawan',
            nik: '',
            department: row.department || 'Umum',
            avatar: ''
          };

          // Find nearest office and check if inside radius
          let minDistance = Infinity;
          let nearestOffice: OfficeLocation | null = null;
          let isInsideRadius = false;

          validOffices.forEach((office) => {
            const dist = getDistanceMeters(
              lat,
              lng,
              Number(office.latitude),
              Number(office.longitude)
            );
            if (dist < minDistance) {
              minDistance = dist;
              nearestOffice = office;
            }
            if (dist <= (Number(office.radius_meters) || 50)) {
              isInsideRadius = true;
            }
          });

          points.push({
            id: row.id,
            userId: row.user_id,
            userName: userMeta.name,
            userNik: userMeta.nik,
            department: userMeta.department,
            avatarUrl: userMeta.avatar,
            date: row.date,
            clockIn: row.clock_in,
            clockOut: row.clock_out,
            status: row.status,
            photoUrl: row.photo_url,
            latitude: lat,
            longitude: lng,
            isInsideRadius,
            distanceToNearest: Math.round(minDistance),
            nearestOfficeName: nearestOffice ? nearestOffice.name : 'Kantor Pusat'
          });
        }
      });

      setAttendancePoints(points);
    } catch (err: any) {
      console.error('Failed to load attendance map data:', err);
      toast.error('Gagal memuat peta presensi: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Filter attendance points
  const filteredPoints = useMemo(() => {
    return attendancePoints.filter((pt) => {
      if (statusFilter === 'inside' && !pt.isInsideRadius) return false;
      if (statusFilter === 'outside' && pt.isInsideRadius) return false;
      if (departmentFilter !== 'all' && pt.department !== departmentFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = pt.userName.toLowerCase().includes(q);
        const matchNik = pt.userNik.toLowerCase().includes(q);
        const matchDept = pt.department.toLowerCase().includes(q);
        const matchOffice = pt.nearestOfficeName.toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchDept && !matchOffice) return false;
      }

      return true;
    });
  }, [attendancePoints, statusFilter, departmentFilter, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = attendancePoints.length;
    const inside = attendancePoints.filter((p) => p.isInsideRadius).length;
    const outside = attendancePoints.filter((p) => !p.isInsideRadius).length;
    const insidePercentage = total > 0 ? Math.round((inside / total) * 100) : 0;
    return { total, inside, outside, insidePercentage };
  }, [attendancePoints]);

  // Default Map Center
  const defaultCenter: [number, number] = useMemo(() => {
    if (locations.length > 0 && locations[0].latitude) {
      return [Number(locations[0].latitude), Number(locations[0].longitude)];
    }
    return [-6.225018, 106.833600];
  }, [locations]);

  const handleSelectEmployee = (pt: any) => {
    setSelectedEmployeePoint(pt);
    setFlyTarget([pt.latitude, pt.longitude]);
  };

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── HEADER & DATE SELECTOR ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-1">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Peta Sebaran Presensi Karyawan
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Visualisasi lokasi riil Clock In / Clock Out mobile karyawan terhadap radius perimeter kantor The Gesit Companies.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/70">
            <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-8 text-xs bg-background border-none shadow-none font-semibold w-36"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 px-3 text-xs gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* ── KPI STATS OVERVIEW ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
              <span>Total Terpantau</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {stats.total}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Karyawan dengan koordinat GPS
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
              <span>Di Dalam Radius</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.inside} <span className="text-sm font-semibold text-muted-foreground">({stats.insidePercentage}%)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Presensi di perimeter kantor resmi
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
              <span>Di Luar Radius / WFH</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.outside}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Presensi di luar batas perimeter
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold uppercase">
              <span>Titik Kantor Aktif</span>
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-black text-foreground">
              {locations.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Geofence kantor terdaftar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── MAP & LIST WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ── SIDE LIST (EMPLOYEES ON MAP) ── */}
        <div className="lg:col-span-4 xl:col-span-4 space-y-3.5">
          {/* Filter Bar */}
          <Card className="border-border/70 shadow-2xs p-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama, NIK, divisi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-muted/20 border-border/80"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="inside">Di Dalam Radius</option>
                <option value="outside">Di Luar Radius</option>
              </select>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-8 rounded-lg border border-border/80 bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Divisi</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </Card>

          {/* Employee List */}
          <Card className="border-border/70 shadow-2xs overflow-hidden">
            <CardHeader className="p-3 border-b border-border/60 bg-muted/20">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Daftar Karyawan ({filteredPoints.length})</span>
                <span className="text-[11px] font-normal lowercase">Klik untuk fokus di peta</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredPoints.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <MapPin className="h-8 w-8 opacity-25" />
                  <p className="font-semibold text-foreground">Tidak Ada Titik Presensi</p>
                  <p className="text-[11px] max-w-xs">
                    Tidak ditemukan rekaman presensi dengan koordinat GPS pada tanggal {selectedDate}.
                  </p>
                </div>
              ) : (
                <div className="max-h-[580px] overflow-y-auto divide-y divide-border/60">
                  {filteredPoints.map((pt) => {
                    const isSelected = selectedEmployeePoint?.id === pt.id;

                    return (
                      <div
                        key={pt.id}
                        onClick={() => handleSelectEmployee(pt)}
                        className={`p-3 transition-colors cursor-pointer flex items-center justify-between group ${
                          isSelected
                            ? 'bg-primary/10 border-l-4 border-primary'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar name={pt.userName} url={pt.avatarUrl} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                {pt.userName}
                              </p>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                pt.isInsideRadius
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}>
                                {pt.isInsideRadius ? 'Radius Kantor' : 'Luar Radius'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                              <span>Clock In: <b>{formatTime(pt.clockIn)}</b></span>
                              <span>· {pt.distanceToNearest}m dari {pt.nearestOfficeName}</span>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="h-7 w-7 text-muted-foreground group-hover:text-foreground shrink-0"
                          title="Fokus di peta"
                        >
                          <Compass className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── MAIN LEAFLET MAP DISPLAY ── */}
        <div className="lg:col-span-8 xl:col-span-8">
          <Card className="border-border/70 shadow-sm overflow-hidden">
            {/* Map Header */}
            <CardHeader className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Peta Distribusi Lokasi Presensi Mobile
                </CardTitle>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Map Style Selector */}
                <div className="flex items-center gap-1 bg-muted/70 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => setMapTheme('dark')}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1',
                      mapTheme === 'dark'
                        ? 'bg-primary dark:bg-blue-600 text-white shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Mode Gelap Bersih (100% Gratis, Tanpa Watermark)"
                  >
                    <span>🌙 Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTheme('light')}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1',
                      mapTheme === 'light'
                        ? 'bg-primary dark:bg-blue-600 text-white shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="OpenStreetMap Terang"
                  >
                    <span>☀️ Terang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapTheme('satellite')}
                    className={cn(
                      'px-2 py-0.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1',
                      mapTheme === 'satellite'
                        ? 'bg-primary dark:bg-blue-600 text-white shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Citra Satelit Esri Asli"
                  >
                    <span>🛰️ Satelit</span>
                  </button>
                </div>

                {/* Legend Badges */}
                <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                    <span className="h-2.5 w-2.5 rounded bg-blue-600 inline-block" /> Kantor
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Di Radius
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" /> Luar Radius
                  </span>
                </div>
              </div>
            </CardHeader>

            {/* Map Container */}
            <CardContent className="p-0">
              <div className={cn("h-[640px] w-full relative", activeTileConfig.containerClass)}>
                <MapContainer
                  center={defaultCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom
                >
                  <TileLayer
                    key={activeTileConfig.url + '-' + mapTheme}
                    attribution={activeTileConfig.attribution}
                    url={activeTileConfig.url}
                    maxZoom={activeTileConfig.maxZoom}
                  />

                  <MapFlyTo center={flyTarget} />

                  {/* 1. Office Location Markers & Geofence Circles */}
                  {locations.map((loc) => (
                    <React.Fragment key={`office-${loc.id}`}>
                      <Marker
                        position={[Number(loc.latitude), Number(loc.longitude)]}
                        icon={createOfficeIcon(loc.name)}
                      >
                        <Popup>
                          <div className="p-1 min-w-[210px] text-xs font-sans">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900">
                              <span>🏢</span> {loc.name}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                              {loc.address}
                            </p>
                            <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-blue-600">
                                Perimeter: {loc.radius_meters}m
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold bg-blue-50 text-blue-700 border-blue-200">
                                Kantor Resmi
                              </Badge>
                            </div>
                          </div>
                        </Popup>
                      </Marker>

                      <Circle
                        center={[Number(loc.latitude), Number(loc.longitude)]}
                        radius={Number(loc.radius_meters) || 50}
                        pathOptions={{
                          color: '#2563eb',
                          fillColor: '#3b82f6',
                          fillOpacity: 0.14,
                          weight: 1.5
                        }}
                      />
                    </React.Fragment>
                  ))}

                  {/* 2. Employee Attendance Markers */}
                  {filteredPoints.map((pt) => (
                    <Marker
                      key={`att-${pt.id}`}
                      position={[pt.latitude, pt.longitude]}
                      icon={createEmployeePin(pt.isInsideRadius, pt.userName)}
                    >
                      <Popup>
                        <div className="p-1 min-w-[230px] text-xs font-sans">
                          {/* Header Identity */}
                          <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm text-slate-900 truncate">
                                {pt.userName}
                              </h4>
                              <p className="text-[11px] text-slate-500 truncate">
                                {pt.userNik ? `NIK: ${pt.userNik} · ` : ''}
                                {pt.department}
                              </p>
                            </div>
                          </div>

                          {/* Time & Radius Info */}
                          <div className="py-2 space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Waktu Masuk:</span>
                              <span className="font-bold text-slate-900">
                                {formatTime(pt.clockIn)}
                              </span>
                            </div>

                            {pt.clockOut && (
                              <div className="flex items-center justify-between">
                                <span className="text-slate-500">Waktu Pulang:</span>
                                <span className="font-bold text-slate-900">
                                  {formatTime(pt.clockOut)}
                                </span>
                              </div>
                            )}

                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Status Radius:</span>
                              <span className={`font-bold ${pt.isInsideRadius ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {pt.isInsideRadius ? '● Di Dalam Kantor' : '▲ Di Luar Kantor'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-100">
                              <span>Jarak ke Kantor:</span>
                              <span className="font-semibold text-slate-900">
                                {pt.distanceToNearest}m ({pt.nearestOfficeName})
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-2 border-t border-slate-200">
                            <a
                              href={`https://www.google.com/maps?q=${pt.latitude},${pt.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full inline-flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[11px] transition-colors"
                            >
                              <ExternalLink size={12} /> Buka di Google Maps
                            </a>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default LiveAttendanceMap;
