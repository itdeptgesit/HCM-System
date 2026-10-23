import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin, Plus, Search, Filter, RefreshCw, Trash2, Edit3,
  Loader2, Locate, ExternalLink, Map as MapIcon, MapPinOff, Ban,
  Building2, CheckCircle2, Navigation, AlertTriangle, RotateCcw, Info,
  Users, UserCheck, Lock, Unlock, Check, X, ShieldAlert, Smartphone
} from '@/components/ui/icons';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { supabase } from '../../lib/supabaseClient';
import { loadWorkforceAccounts } from '../../lib/workforceData';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '../StatCard';
import { UserAvatar } from '../UserAvatar';
import { LiveAttendanceMobileSetup } from './LiveAttendanceMobileSetup';
import {
  OfficeLocation, UserAccount, parseLocationMeta, encodeLocationAddress
} from './attendanceTypes';

const MapPicker: React.FC<{
  lat: string;
  lng: string;
  radius: string;
  onPick: (lat: number, lng: number) => void;
}> = ({ lat, lng, radius, onPick }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const center: [number, number] = [Number(lat) || -6.22, Number(lng) || 106.84];
  const ClickHandler = () => {
    useMapEvents({
      click: (event) => onPick(event.latlng.lat, event.latlng.lng)
    });
    return null;
  };
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/60 dark:border-zinc-800", isDark && "map-theme-dark")}>
      <MapContainer center={center} zoom={16} style={{ height: 260, width: '100%' }} scrollWheelZoom>
        <TileLayer
          key={isDark ? 'osm-dark' : 'osm-light'}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ClickHandler />
        <Marker position={center} />
        <Circle
          center={center}
          radius={Number(radius) || 50}
          pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.18 }}
        />
      </MapContainer>
      <div className="bg-muted/40 dark:bg-zinc-900/60 px-3 py-2 text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/40">
        <span>Klik peta untuk menentukan titik koordinat kantor. Lingkaran menunjukkan radius geofence.</span>
        <span className="font-mono font-semibold text-primary">{Number(radius) || 50}m</span>
      </div>
    </div>
  );
};

const OfficeLocationsManager: React.FC<{
  locations: OfficeLocation[];
  setLocations: React.Dispatch<React.SetStateAction<OfficeLocation[]>>;
  onRefresh?: () => void;
  loading?: boolean;
}> = ({ locations, setLocations, onRefresh, loading }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [mainTab, setMainTab] = useState<'location' | 'mobile'>('location');
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [radiusFilter, setRadiusFilter] = useState<'all' | '50' | '100' | 'more'>('all');
  const [accessFilter, setAccessFilter] = useState<'all' | 'all_users' | 'restricted'>('all');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OfficeLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Workforce Accounts state
  const [allEmployees, setAllEmployees] = useState<UserAccount[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('-6.225018');
  const [longitude, setLongitude] = useState('106.833600');
  const [radius, setRadius] = useState('50');
  const [isActive, setIsActive] = useState(true);
  const [assignmentMode, setAssignmentMode] = useState<'all' | 'restricted'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchText, setUserSearchText] = useState('');
  const [userDeptFilter, setUserDeptFilter] = useState('all');

  // Quick Employee Assignment Modal state
  const [managingLocation, setManagingLocation] = useState<OfficeLocation | null>(null);
  const [quickMode, setQuickMode] = useState<'all' | 'restricted'>('all');
  const [quickSelectedUserIds, setQuickSelectedUserIds] = useState<string[]>([]);
  const [quickSearchText, setQuickSearchText] = useState('');
  const [quickDeptFilter, setQuickDeptFilter] = useState('all');
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const data = await loadWorkforceAccounts();
      if (data && data.length > 0) {
        setAllEmployees(data as any[]);
      }
    } catch (err: any) {
      console.error('Error loading workforce accounts:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    allEmployees.forEach(e => {
      if (e.department && e.department.trim()) set.add(e.department.trim());
    });
    return Array.from(set).sort();
  }, [allEmployees]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setAddress('');
    setLatitude('-6.225018');
    setLongitude('106.833600');
    setRadius('50');
    setIsActive(true);
    setAssignmentMode('all');
    setSelectedUserIds([]);
    setUserSearchText('');
    setUserDeptFilter('all');
    setShowForm(true);
  };

  const openEdit = (loc: OfficeLocation) => {
    setEditing(loc);
    setName(loc.name);
    const meta = parseLocationMeta(loc);
    setAddress(meta.cleanAddress);
    setLatitude(String(loc.latitude));
    setLongitude(String(loc.longitude));
    setRadius(String(loc.radius_meters));
    setIsActive(loc.is_active);
    setAssignmentMode(meta.assignmentMode);
    setSelectedUserIds(meta.assignedUserIds);
    setUserSearchText('');
    setUserDeptFilter('all');
    setShowForm(true);
  };

  const openQuickManage = (loc: OfficeLocation) => {
    setManagingLocation(loc);
    const meta = parseLocationMeta(loc);
    setQuickMode(meta.assignmentMode);
    setQuickSelectedUserIds(meta.assignedUserIds);
    setQuickSearchText('');
    setQuickDeptFilter('all');
  };

  const filteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (userDeptFilter !== 'all' && (emp.department || '').trim() !== userDeptFilter) {
        return false;
      }
      if (userSearchText.trim()) {
        const q = userSearchText.toLowerCase().trim();
        const matchName = (emp.full_name || '').toLowerCase().includes(q);
        const matchEmail = (emp.email || '').toLowerCase().includes(q);
        const matchCode = (emp.employee_code || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [allEmployees, userSearchText, userDeptFilter]);

  const quickFilteredEmployees = useMemo(() => {
    return allEmployees.filter(emp => {
      if (quickDeptFilter !== 'all' && (emp.department || '').trim() !== quickDeptFilter) {
        return false;
      }
      if (quickSearchText.trim()) {
        const q = quickSearchText.toLowerCase().trim();
        const matchName = (emp.full_name || '').toLowerCase().includes(q);
        const matchEmail = (emp.email || '').toLowerCase().includes(q);
        const matchCode = (emp.employee_code || '').toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCode) return false;
      }
      return true;
    });
  }, [allEmployees, quickSearchText, quickDeptFilter]);

  const handleGetCurrentPosition = () => {
    if (!navigator.geolocation) {
      toast.error('Browser tidak mendukung pendeteksi geolokasi');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success('Koordinat GPS saat ini berhasil diterapkan');
      },
      (err) => {
        toast.error('Gagal mengambil koordinat: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        const { data, error } = await supabase.from('office_locations').select('*').order('name');
        if (!error && data) setLocations(data);
      }
      await loadEmployees();
      toast.success('Data titik kantor berhasil diperbarui');
    } catch (err: any) {
      toast.error('Gagal memuat ulang: ' + (err.message || 'Error'));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const lat = parseFloat(latitude.replace(',', '.'));
      const lng = parseFloat(longitude.replace(',', '.'));
      const radiusM = parseInt(radius, 10);
      if (!name.trim() || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(radiusM) || radiusM <= 0) {
        toast.error('Isi semua data dengan benar (radius harus angka > 0)');
        setSaving(false);
        return;
      }

      const finalAddress = encodeLocationAddress(address.trim() || name.trim(), assignmentMode, selectedUserIds);
      const payload: any = {
        name: name.trim(),
        address: finalAddress,
        latitude: lat,
        longitude: lng,
        radius_meters: radiusM,
        is_active: isActive,
      };

      const payloadWithNative: any = {
        ...payload,
        assignment_mode: assignmentMode,
        assigned_user_ids: selectedUserIds,
      };

      if (editing) {
        const { data: before, error: beforeError } = await supabase
          .from('office_locations')
          .select('id, radius_meters')
          .eq('id', editing.id)
          .maybeSingle();
        if (beforeError) throw beforeError;
        if (!before) throw new Error('Lokasi tidak ditemukan atau tidak bisa dibaca.');

        let updateErr: any = null;
        const res1 = await supabase.from('office_locations').update(payloadWithNative).eq('id', editing.id);
        if (res1.error) {
          const res2 = await supabase.from('office_locations').update(payload).eq('id', editing.id);
          updateErr = res2.error;
        }
        if (updateErr) throw updateErr;

        const { data: saved, error: verifyError } = await supabase
          .from('office_locations')
          .select('id, name, address, latitude, longitude, radius_meters, is_active')
          .eq('id', editing.id)
          .maybeSingle();
        if (verifyError) throw verifyError;
        if (!saved) throw new Error('Update ditolak RLS: data tidak terlihat setelah disimpan.');

        setLocations(prev => prev.map(l => (l.id === editing.id ? {
          ...l,
          ...saved,
          assignment_mode: assignmentMode,
          assigned_user_ids: selectedUserIds
        } as OfficeLocation : l)));

        toast.success(`Lokasi "${saved.name}" berhasil diperbarui`);
      } else {
        let insertRes: any = await supabase.from('office_locations').insert([payloadWithNative]).select().single();
        if (insertRes.error) {
          insertRes = await supabase.from('office_locations').insert([payload]).select().single();
        }
        if (insertRes.error) throw insertRes.error;

        if (insertRes.data) {
          const savedLoc: OfficeLocation = {
            ...(insertRes.data as OfficeLocation),
            assignment_mode: assignmentMode,
            assigned_user_ids: selectedUserIds
          };
          setLocations(prev => [...prev, savedLoc]);
          toast.success(`Lokasi "${savedLoc.name}" berhasil ditambahkan`);
        }
      }
      setShowForm(false);
      setEditing(null);
    } catch (err: any) {
      toast.error('Gagal simpan lokasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSave = async () => {
    if (!managingLocation) return;
    setQuickSaving(true);
    try {
      const meta = parseLocationMeta(managingLocation);
      const finalAddress = encodeLocationAddress(meta.cleanAddress || managingLocation.name, quickMode, quickSelectedUserIds);
      const payload: any = {
        address: finalAddress,
      };
      const payloadWithNative: any = {
        ...payload,
        assignment_mode: quickMode,
        assigned_user_ids: quickSelectedUserIds,
      };

      let err: any = null;
      const res1 = await supabase.from('office_locations').update(payloadWithNative).eq('id', managingLocation.id);
      if (res1.error) {
        const res2 = await supabase.from('office_locations').update(payload).eq('id', managingLocation.id);
        err = res2.error;
      }
      if (err) throw err;

      setLocations(prev => prev.map(l => {
        if (l.id === managingLocation.id) {
          return {
            ...l,
            address: finalAddress,
            assignment_mode: quickMode,
            assigned_user_ids: quickSelectedUserIds,
          };
        }
        return l;
      }));

      toast.success(`Hak akses presensi untuk "${managingLocation.name}" berhasil diperbarui`);
      setManagingLocation(null);
    } catch (err: any) {
      toast.error('Gagal menyimpan hak akses: ' + err.message);
    } finally {
      setQuickSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('office_locations').delete().eq('id', deleteId);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== deleteId));
      toast.success('Lokasi kantor berhasil dihapus');
      setDeleteId(null);
    } catch (err: any) {
      toast.error('Gagal hapus lokasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLoc = locations.find(l => l.id === deleteId) || null;

  // Stats calculation
  const stats = useMemo(() => {
    const total = locations.length;
    const activeCount = locations.filter(l => l.is_active).length;
    const inactiveCount = locations.filter(l => !l.is_active).length;
    const avgRadius = total > 0 ? Math.round(locations.reduce((acc, l) => acc + (Number(l.radius_meters) || 0), 0) / total) : 0;
    return { total, activeCount, inactiveCount, avgRadius };
  }, [locations]);

  // Filtering
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (loc.name || '').toLowerCase().includes(q);
        const matchAddr = (loc.address || '').toLowerCase().includes(q);
        if (!matchName && !matchAddr) return false;
      }
      if (statusFilter === 'active' && !loc.is_active) return false;
      if (statusFilter === 'inactive' && loc.is_active) return false;
      if (radiusFilter === '50' && loc.radius_meters > 50) return false;
      if (radiusFilter === '100' && (loc.radius_meters <= 50 || loc.radius_meters > 100)) return false;
      if (radiusFilter === 'more' && loc.radius_meters <= 100) return false;
      return true;
    });
  }, [locations, searchQuery, statusFilter, radiusFilter]);

  const defaultMapCenter: [number, number] = useMemo(() => {
    const first = locations.find(l => l.is_active && !Number.isNaN(Number(l.latitude)));
    if (first) return [Number(first.latitude), Number(first.longitude)];
    return [-6.225018, 106.833600];
  }, [locations]);

  const hasFilter = searchQuery.trim() !== '' || statusFilter !== 'all' || radiusFilter !== 'all';

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Standard PageHeader */}
      <PageHeader
        title="Live Attendance"
        description="Kelola titik lokasi kantor, radius geofence, serta aturan presensi mobile (selfie, face recognition, liveness detection)."
      >
        {mainTab === 'location' && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="gap-1.5 border-border/60 bg-background/80 dark:bg-zinc-900/80 text-foreground hover:bg-muted shadow-2xs text-xs font-semibold"
            >
              <RefreshCw size={14} className={cn((refreshing || loading) && 'animate-spin text-primary dark:text-blue-400')} />
              <span>Muat Ulang</span>
            </Button>
            <Button
              size="sm"
              onClick={openAdd}
              className="gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 shadow-2xs text-xs font-semibold"
            >
              <Plus size={14} />
              <span>Tambah Lokasi</span>
            </Button>
          </div>
        )}
      </PageHeader>

      {/* Top-Level Tabs (Talenta Style: Location set up | Mobile set up) */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          onClick={() => setMainTab('location')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mainTab === 'location'
              ? "bg-[#103065] text-white dark:bg-blue-600 shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Building2 size={14} />
          <span>Location set up</span>
          <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-bold">
            {locations.length}
          </Badge>
        </button>

        <button
          onClick={() => setMainTab('mobile')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer",
            mainTab === 'mobile'
              ? "bg-[#103065] text-white dark:bg-blue-600 shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Smartphone size={14} />
          <span>Mobile set up</span>
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {mainTab === 'mobile' ? (
        <LiveAttendanceMobileSetup />
      ) : (
        <>
          {/* Tab Switcher */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-fit mb-6">
            <TabsList>
              <TabsTrigger value="list">
                <Building2 size={14} className="mr-1.5" />
                <span>Daftar Lokasi</span>
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px] font-bold">
                  {locations.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="map">
                <MapIcon size={14} className="mr-1.5" />
                <span>Peta Sebaran GPS</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

      {/* StatCards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Titik Kantor"
          value={stats.total}
          subValue="Lokasi terdaftar"
          icon={Building2}
          color="slate"
        />
        <StatCard
          label="Lokasi Aktif"
          value={stats.activeCount}
          subValue="Siap presensi mobile"
          icon={CheckCircle2}
          color="emerald"
          status="on-track"
        />
        <StatCard
          label="Rata-rata Radius"
          value={`${stats.avgRadius}m`}
          subValue="Toleransi geofence"
          icon={Navigation}
          color="blue"
        />
        <StatCard
          label="Lokasi Nonaktif"
          value={stats.inactiveCount}
          subValue={stats.inactiveCount > 0 ? "Presensi dinonaktifkan" : "Semua kantor aktif"}
          icon={AlertTriangle}
          color={stats.inactiveCount > 0 ? "amber" : "slate"}
          status={stats.inactiveCount > 0 ? "at-risk" : undefined}
        />
      </div>

      {/* Filter Toolbar Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              Filter &amp; Pencarian Lokasi
            </CardTitle>
            <p className="text-[11px] font-medium text-muted-foreground mt-1">
              Menampilkan {filteredLocations.length} dari total {locations.length} titik kantor
            </p>
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRadiusFilter('all');
              }}
              className="h-8 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <RotateCcw size={13} className="mr-1" /> Reset Filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cari Lokasi / Alamat</Label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Ketik nama kantor atau alamat..."
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status Kantor</Label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Status ({locations.length})</option>
                <option value="active">Aktif Saja ({stats.activeCount})</option>
                <option value="inactive">Nonaktif Saja ({stats.inactiveCount})</option>
              </select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Jangkauan Radius</Label>
              <select
                value={radiusFilter}
                onChange={e => setRadiusFilter(e.target.value as any)}
                className="h-9 w-full rounded-md border border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900 px-2.5 text-xs font-medium text-foreground dark:text-zinc-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="all">Semua Radius</option>
                <option value="50">&le; 50 meter</option>
                <option value="100">51 - 100 meter</option>
                <option value="more">&gt; 100 meter</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content: List View */}
      {activeTab === 'list' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                Daftar Titik Koordinat Kantor
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-1">
                {filteredLocations.length} titik kantor terdaftar &bull; Siap validasi absensi mobile
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {([
                { id: 'all', label: 'Semua', count: locations.length },
                { id: 'active', label: 'Aktif', count: stats.activeCount },
                { id: 'inactive', label: 'Nonaktif', count: stats.inactiveCount },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    statusFilter === f.id
                      ? 'bg-primary dark:bg-blue-600 text-primary-foreground shadow-2xs'
                      : 'border border-border/60 dark:border-zinc-800 bg-muted/30 dark:bg-zinc-900/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-zinc-800'
                  )}
                >
                  {f.label}
                  <span className="ml-1 text-[10px] opacity-70">({f.count})</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredLocations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <MapPinOff size={36} className="opacity-30" />
                <p className="text-sm font-semibold text-foreground">Tidak ada lokasi kantor yang sesuai</p>
                <p className="text-xs text-muted-foreground">Coba ubah kata kunci pencarian atau reset filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[320px]">Lokasi Kantor &amp; Alamat</TableHead>
                      <TableHead>Koordinat GPS</TableHead>
                      <TableHead>Radius Geofence</TableHead>
                      <TableHead>Hak Akses Karyawan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.map(loc => {
                      const meta = parseLocationMeta(loc);
                      const isRestricted = meta.assignmentMode === 'restricted';
                      return (
                        <TableRow key={loc.id} className="hover:bg-muted/30 dark:hover:bg-zinc-800/40 transition-colors">
                          <TableCell className="py-3.5">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                                loc.is_active
                                  ? 'bg-primary/10 text-primary dark:bg-blue-500/15 dark:text-blue-400'
                                  : 'bg-muted text-muted-foreground'
                              )}>
                                <MapPin size={18} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground leading-snug">{loc.name}</div>
                                <div className="text-[11px] text-muted-foreground truncate max-w-[300px] mt-0.5" title={meta.cleanAddress}>
                                  {meta.cleanAddress}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs text-foreground/80 tabular-nums">
                              {Number(loc.latitude).toFixed(6)}, {Number(loc.longitude).toFixed(6)}
                            </div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary dark:text-blue-400 hover:underline mt-0.5"
                            >
                              <span>Buka Google Maps</span>
                              <ExternalLink size={10} />
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="font-mono text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5">
                                {loc.radius_meters}m
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">Area presensi mobile</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {isRestricted ? (
                                <Badge variant="outline" className="text-[11px] font-semibold border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 px-2 py-0.5">
                                  <Lock size={11} /> {meta.assignedUserIds.length} Karyawan
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[11px] font-semibold border-slate-300 dark:border-zinc-700 bg-muted/40 text-muted-foreground gap-1 px-2 py-0.5">
                                  <Users size={11} /> Semua Karyawan
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground block mt-0.5 font-medium">
                              {isRestricted ? 'Akses dibatasi per akun' : 'Terbuka untuk semua'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[11px] font-semibold gap-1.5 px-2 py-0.5',
                                loc.is_active
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'border-border/60 bg-muted/40 text-muted-foreground'
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', loc.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50')} />
                              {loc.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openQuickManage(loc)}
                                className="h-8 px-2 text-xs font-semibold gap-1 border-border/70 text-foreground hover:bg-muted"
                                title="Atur Hak Akses Karyawan"
                              >
                                <Users size={13} className="text-primary dark:text-blue-400" />
                                <span className="hidden sm:inline">Akses</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(loc)}
                                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                                title="Edit Lokasi"
                              >
                                <Edit3 size={14} className="mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(loc.id)}
                                className="h-8 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                                title="Hapus Lokasi"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Map View */}
      {activeTab === 'map' && (
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/40 bg-muted/20">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MapIcon size={16} className="text-primary" />
                Peta Distribusi Geofence Kantor
              </CardTitle>
              <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                Menampilkan {filteredLocations.length} titik koordinat dan perimeter radius presensi karyawan
              </p>
            </div>
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary dark:text-blue-400 font-mono text-xs">
              {filteredLocations.length} Titik
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className={cn("relative", isDark && "map-theme-dark")} style={{ height: 500, width: '100%' }}>
              <MapContainer center={defaultMapCenter} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer
                  key={isDark ? 'osm-dark' : 'osm-light'}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
                {filteredLocations.map(loc => (
                  <React.Fragment key={loc.id}>
                    <Marker position={[Number(loc.latitude), Number(loc.longitude)]}>
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <div className="font-bold text-xs text-slate-900">{loc.name}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{loc.address}</div>
                          <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-blue-600">Radius: {loc.radius_meters}m</span>
                            <span className={`inline-flex items-center gap-1 font-bold ${loc.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${loc.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {loc.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                    <Circle
                      center={[Number(loc.latitude), Number(loc.longitude)]}
                      radius={Number(loc.radius_meters) || 50}
                      pathOptions={{
                        color: loc.is_active ? '#10b981' : '#94a3b8',
                        fillColor: loc.is_active ? '#10b981' : '#94a3b8',
                        fillOpacity: 0.16
                      }}
                    />
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader className="shrink-0 border-b border-border/40 px-6 py-4 bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <MapPin size={18} className="text-primary dark:text-blue-400" />
              {editing ? 'Edit Lokasi Kantor' : 'Tambah Lokasi Kantor'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Atur titik koordinat &amp; radius geofence untuk validasi absen karyawan dari aplikasi mobile.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5 max-h-[75vh]">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pilih Titik di Peta</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGetCurrentPosition}
                className="h-7 px-2 text-[11px] gap-1 font-semibold border-border/60 hover:bg-muted"
              >
                <Locate size={12} className="text-primary" />
                <span>Ambil GPS Sekarang</span>
              </Button>
            </div>

            <MapPicker
              lat={latitude}
              lng={longitude}
              radius={radius}
              onPick={(lat, lng) => {
                setLatitude(lat.toFixed(6));
                setLongitude(lng.toFixed(6));
              }}
            />

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nama Lokasi / Kantor</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Contoh: Kantor Pusat (Trinity Tower) / Gudang Pulogadung"
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Alamat Lengkap</Label>
              <Textarea
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Jl. H. R. Rasuna Said Kav. C22, Kuningan, Jakarta Selatan"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Latitude</Label>
                <Input
                  value={latitude}
                  onChange={e => setLatitude(e.target.value)}
                  placeholder="-6.225018"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Longitude</Label>
                <Input
                  value={longitude}
                  onChange={e => setLongitude(e.target.value)}
                  placeholder="106.833600"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Radius Geofence (Meter)</Label>
                <div className="flex items-center gap-1">
                  {[25, 50, 100, 200].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRadius(String(preset))}
                      className={cn(
                        'px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors',
                        radius === String(preset)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>
              <Input
                type="number"
                value={radius}
                onChange={e => setRadius(e.target.value)}
                placeholder="50"
                min={10}
                className="h-9 text-xs font-mono"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status Lokasi</Label>
              <button
                type="button"
                onClick={() => setIsActive(v => !v)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 text-left text-xs font-semibold transition-all',
                  isActive
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border'
                )}
              >
                <span>{isActive ? 'Aktif (Karyawan dapat absen di lokasi ini)' : 'Nonaktif (Presensi di lokasi ini ditutup)'}</span>
                <span className={cn(
                  'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                  isActive ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}>
                  <span className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                    isActive ? 'left-[18px]' : 'left-0.5'
                  )} />
                </span>
              </button>
            </div>

            {/* Hak Akses Presensi Karyawan */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users size={14} className="text-primary dark:text-blue-400" />
                  Hak Akses Presensi Karyawan
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pilih apakah lokasi ini dibuka untuk seluruh karyawan atau dibatasi untuk akun-akun tertentu saja.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAssignmentMode('all')}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    assignmentMode === 'all'
                      ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40'
                      : 'border-border/70 hover:border-border bg-card text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Users size={13} className="text-primary dark:text-blue-400" />
                      Semua Karyawan
                    </span>
                    {assignmentMode === 'all' && (
                      <span className="h-2 w-2 rounded-full bg-primary dark:bg-blue-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Terbuka untuk semua akun karyawan aktif tanpa batasan penugasan.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentMode('restricted')}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all',
                    assignmentMode === 'restricted'
                      ? 'border-amber-500 bg-amber-500/5 text-foreground ring-1 ring-amber-500/40'
                      : 'border-border/70 hover:border-border bg-card text-muted-foreground'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                      <Lock size={13} className="text-amber-600 dark:text-amber-400" />
                      Karyawan Tertentu
                    </span>
                    {assignmentMode === 'restricted' && (
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Hanya akun karyawan yang dipilih yang dapat absen di lokasi ini.
                  </p>
                </button>
              </div>

              {assignmentMode === 'restricted' && (
                <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground">
                      Daftar Akun Diizinkan ({selectedUserIds.length} Dipilih)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => {
                          const ids = filteredEmployees.map(e => String(e.id));
                          setSelectedUserIds(prev => Array.from(new Set([...prev, ...ids])));
                        }}
                        className="h-6 px-2 text-[11px] font-medium text-primary hover:bg-primary/10"
                      >
                        Pilih Semua Tampil
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setSelectedUserIds([])}
                        className="h-6 px-2 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10"
                      >
                        Hapus Semua
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={userSearchText}
                        onChange={e => setUserSearchText(e.target.value)}
                        placeholder="Cari nama, NIP, email..."
                        className="pl-8 h-8 text-xs"
                      />
                    </div>
                    <select
                      value={userDeptFilter}
                      onChange={e => setUserDeptFilter(e.target.value)}
                      className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none"
                    >
                      <option value="all">Semua Departemen ({allEmployees.length})</option>
                      {departmentsList.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-md border border-border/60 bg-background divide-y divide-border/40 text-xs">
                    {filteredEmployees.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-xs">
                        Tidak ada karyawan ditemukan
                      </div>
                    ) : (
                      filteredEmployees.map(emp => {
                        const isChecked = selectedUserIds.includes(String(emp.id));
                        return (
                          <label
                            key={emp.id}
                            className={cn(
                              'flex items-center justify-between p-2.5 hover:bg-muted/40 cursor-pointer transition-colors',
                              isChecked && 'bg-primary/5'
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const idStr = String(emp.id);
                                  if (e.target.checked) {
                                    setSelectedUserIds(prev => [...prev, idStr]);
                                  } else {
                                    setSelectedUserIds(prev => prev.filter(id => id !== idStr));
                                  }
                                }}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <UserAvatar name={emp.full_name} url={emp.avatar_url} size="xs" />
                              <div className="min-w-0">
                                <div className="font-medium text-foreground truncate">{emp.full_name}</div>
                                <div className="text-[11px] text-muted-foreground truncate">
                                  {emp.department || 'Umum'} &bull; {emp.role || 'Employee'}
                                </div>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                              {emp.employee_code || `#${emp.id}`}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
              <Info size={15} className="mt-0.5 shrink-0" />
              <span>
                Karyawan dianggap berada di area kantor jika jarak GPS perangkatnya &le; radius dari titik koordinat ini. Digunakan langsung oleh PWA Absensi Mobile.
              </span>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4 bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} disabled={saving} className="h-8 text-xs font-semibold">
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 text-xs font-semibold"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {editing ? 'Simpan Perubahan' : 'Simpan Lokasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Employee Assignment Dialog */}
      <Dialog open={!!managingLocation} onOpenChange={(open) => !open && setManagingLocation(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 border-border/60 bg-background overflow-hidden" showCloseButton={false}>
          <DialogHeader className="shrink-0 p-6 pb-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-blue-400">
                  <Users size={18} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Hak Akses Presensi &mdash; {managingLocation?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Tentukan akun-akun karyawan yang berhak melakukan absensi di titik kantor ini.
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setManagingLocation(null)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setQuickMode('all')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  quickMode === 'all'
                    ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/40'
                    : 'border-border/70 hover:border-border bg-card text-muted-foreground'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Users size={13} className="text-primary dark:text-blue-400" />
                    Semua Karyawan (Umum)
                  </span>
                  {quickMode === 'all' && (
                    <span className="h-2 w-2 rounded-full bg-primary dark:bg-blue-500" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Semua karyawan aktif perusahaan dapat absen di kantor ini.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setQuickMode('restricted')}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  quickMode === 'restricted'
                    ? 'border-amber-500 bg-amber-500/5 text-foreground ring-1 ring-amber-500/40'
                    : 'border-border/70 hover:border-border bg-card text-muted-foreground'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Lock size={13} className="text-amber-600 dark:text-amber-400" />
                    Karyawan Tertentu (Khusus)
                  </span>
                  {quickMode === 'restricted' && (
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hanya karyawan yang dipilih di bawah ini yang dapat absen di sini.
                </p>
              </button>
            </div>

            {quickMode === 'restricted' && (
              <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-foreground">
                    Daftar Karyawan Diizinkan ({quickSelectedUserIds.length} Dipilih)
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        const ids = quickFilteredEmployees.map(e => String(e.id));
                        setQuickSelectedUserIds(prev => Array.from(new Set([...prev, ...ids])));
                      }}
                      className="h-6 px-2 text-[11px] font-medium text-primary hover:bg-primary/10"
                    >
                      Pilih Semua Tampil
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setQuickSelectedUserIds([])}
                      className="h-6 px-2 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10"
                    >
                      Hapus Semua
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={quickSearchText}
                      onChange={e => setQuickSearchText(e.target.value)}
                      placeholder="Cari nama, NIP, email..."
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <select
                    value={quickDeptFilter}
                    onChange={e => setQuickDeptFilter(e.target.value)}
                    className="h-8 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground outline-none"
                  >
                    <option value="all">Semua Departemen ({allEmployees.length})</option>
                    {departmentsList.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-md border border-border/60 bg-background divide-y divide-border/40 text-xs">
                  {quickFilteredEmployees.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-xs">
                      Tidak ada karyawan ditemukan
                    </div>
                  ) : (
                    quickFilteredEmployees.map(emp => {
                      const isChecked = quickSelectedUserIds.includes(String(emp.id));
                      return (
                        <label
                          key={emp.id}
                          className={cn(
                            'flex items-center justify-between p-2.5 hover:bg-muted/40 cursor-pointer transition-colors',
                            isChecked && 'bg-primary/5'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const idStr = String(emp.id);
                                if (e.target.checked) {
                                  setQuickSelectedUserIds(prev => [...prev, idStr]);
                                } else {
                                  setQuickSelectedUserIds(prev => prev.filter(id => id !== idStr));
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <UserAvatar name={emp.full_name} url={emp.avatar_url} size="xs" />
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{emp.full_name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {emp.department || 'Umum'} &bull; {emp.role || 'Employee'}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0 ml-2">
                            {emp.employee_code || `#${emp.id}`}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/40 px-6 py-4 bg-muted/20 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {quickMode === 'restricted' ? (
                <span><b>{quickSelectedUserIds.length}</b> karyawan berhak absen di kantor ini</span>
              ) : (
                <span>Semua karyawan aktif diizinkan</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setManagingLocation(null)}
                disabled={quickSaving}
                className="h-8 text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleQuickSave}
                disabled={quickSaving}
                className="h-8 gap-1.5 bg-[#103065] dark:bg-blue-600 text-white hover:bg-[#173e77] dark:hover:bg-blue-700 text-xs font-semibold"
              >
                {quickSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Simpan Akses Karyawan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm border-border/60 dark:border-zinc-800 bg-background dark:bg-zinc-900" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 size={18} /> Hapus Lokasi Kantor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {deleteLoc && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                  <MapPin size={18} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-foreground">{deleteLoc.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground font-mono mt-0.5">
                    {Number(deleteLoc.latitude).toFixed(6)}, {Number(deleteLoc.longitude).toFixed(6)} &bull; {deleteLoc.radius_meters}m
                  </div>
                </div>
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Yakin ingin menghapus titik lokasi ini? Karyawan tidak akan dapat melakukan presensi dari lokasi ini setelah dihapus.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={saving} className="h-8 text-xs font-semibold">
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving} className="h-8 gap-1.5 text-xs font-semibold">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const DEFAULT_OFFICE_LOCATIONS: OfficeLocation[] = [
  {
    id: '274c3712-dbc8-44d7-9290-3606095176f5',
    name: 'Rheem Office',
    address: 'Jl. TB Simatupang No.18, Cilandak, Jakarta Selatan',
    latitude: -6.2912,
    longitude: 106.8134,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-09-13 15:39:27.803191+00'
  },
  {
    id: '2b60bab0-3502-4a9c-959a-169800406704',
    name: 'AI',
    address: 'Jl. Pulogadung, Jakarta Timur',
    latitude: -6.185906066493317,
    longitude: 106.9166238387673,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-10-06 10:28:57.690619+00'
  },
  {
    id: '36c0fc85-a06c-45a6-b722-3b5e2ddc4f52',
    name: 'The City Tower',
    address: 'Jl. MH Thamrin No.81, RT.1/RW.6, Dukuh Atas, Menteng, Kec. Menteng, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10310',
    latitude: -6.1991,
    longitude: 106.823628,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-09-13 15:39:27.803191+00'
  },
  {
    id: '7a4891b6-09b1-4044-84bb-ba1ad0a45787',
    name: 'PPHUI',
    address: 'Jl. H. R. Rasuna Said No.22 Kavling C, Jakarta Selatan',
    latitude: -6.222027409239421,
    longitude: 106.83307848478911,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-10-06 10:28:57.690619+00'
  },
  {
    id: '82901ced-d36f-411d-b98f-c4d6566b352f',
    name: 'Trinity Tower',
    address: 'Jl. H. R. Rasuna Said No.Kav. C22, Kuningan, Jakarta Selatan',
    latitude: -6.225018,
    longitude: 106.8336,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-09-13 15:39:27.803191+00'
  },
  {
    id: 'b6c2142b-bab1-4bb7-a540-6d6ae2a37e70',
    name: 'Sircon',
    address: 'Jl. Sircon, Grogol Utara, Kebayoran Lama, Jakarta Selatan',
    latitude: -6.2175883135583545,
    longitude: 106.7838018541081,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-10-06 10:29:38.150755+00'
  },
  {
    id: 'f87fc7d1-d5a3-424e-b16a-5742ebb110a7',
    name: 'Testing Rumah Rudi',
    address: 'Jl. Jengki, Jakarta Timur',
    latitude: -6.257024,
    longitude: 106.880056,
    radius_meters: 50,
    is_active: true,
    created_at: '2026-09-13 03:49:18.532616+00'
  }
];

export const AttendanceRadius: React.FC<{
  locations?: OfficeLocation[];
  setLocations?: React.Dispatch<React.SetStateAction<OfficeLocation[]>>;
  onRefresh?: () => void;
  loading?: boolean;
}> = (props) => {
  const [internalLocations, setInternalLocations] = useState<OfficeLocation[]>(DEFAULT_OFFICE_LOCATIONS);
  const [internalLoading, setInternalLoading] = useState(false);

  const locations = props.locations || internalLocations;
  const setLocations = props.setLocations || setInternalLocations;

  const fetchLocations = async () => {
    if (props.onRefresh) {
      props.onRefresh();
      return;
    }
    setInternalLoading(true);
    try {
      const { data, error } = await supabase.from('office_locations').select('*').order('name');
      if (!error && data && data.length > 0) {
        setInternalLocations(data);
      }
    } catch (err) {
      console.error('Error fetching office locations:', err);
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    if (!props.locations) {
      fetchLocations();
    }
  }, []);

  return (
    <OfficeLocationsManager
      locations={locations}
      setLocations={setLocations}
      onRefresh={props.onRefresh || fetchLocations}
      loading={props.loading !== undefined ? props.loading : internalLoading}
    />
  );
};

export { OfficeLocationsManager };
export default AttendanceRadius;
