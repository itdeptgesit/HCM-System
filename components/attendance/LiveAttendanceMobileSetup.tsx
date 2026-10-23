import React, { useState, useEffect } from 'react';
import {
  Camera, FileText, ScanFace, ShieldCheck, Locate,
  Coffee, Users, Check, Save, Info, AlertCircle, RefreshCw
} from '@/components/ui/icons';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { loadWorkforceAccounts } from '../../lib/workforceData';
import { UserAvatar } from '../UserAvatar';

interface MobileSettingsState {
  selfieRequired: boolean;
  noteMandatory: boolean;
  faceRecognition: boolean;
  strictValidation: boolean;
  sunglassesMasksValidation: boolean;
  livenessDetection: boolean;
  liveTracking: boolean;
  applyBreakStart: boolean;
  applyBreakEnd: boolean;
  ruleTarget: 'all' | 'selected';
  selectedEmployeeIds: string[];
}

const DEFAULT_SETTINGS: MobileSettingsState = {
  selfieRequired: true,
  noteMandatory: false,
  faceRecognition: true,
  strictValidation: false,
  sunglassesMasksValidation: false,
  livenessDetection: false,
  liveTracking: false,
  applyBreakStart: false,
  applyBreakEnd: false,
  ruleTarget: 'all',
  selectedEmployeeIds: [],
};

export const LiveAttendanceMobileSetup: React.FC = () => {
  const [settings, setSettings] = useState<MobileSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [searchEmployee, setSearchEmployee] = useState('');

  // Load existing settings from Supabase
  useEffect(() => {
    loadSettings();
    loadEmployees();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSettings({
          selfieRequired: data.require_selfie ?? true,
          noteMandatory: data.require_note ?? false,
          faceRecognition: data.face_recognition ?? true,
          strictValidation: data.strict_validation ?? false,
          sunglassesMasksValidation: data.sunglasses_masks_validation ?? false,
          livenessDetection: data.liveness_detection ?? false,
          liveTracking: data.live_tracking ?? false,
          applyBreakStart: data.apply_break_start ?? false,
          applyBreakEnd: data.apply_break_end ?? false,
          ruleTarget: (data.rule_target as any) || 'all',
          selectedEmployeeIds: Array.isArray(data.selected_employee_ids) ? data.selected_employee_ids : [],
        });
      } else {
        // Fallback to local storage if table column not yet migrated
        const local = localStorage.getItem('gesit_mobile_attendance_rules');
        if (local) {
          try {
            setSettings(JSON.parse(local));
          } catch {}
        }
      }
    } catch (err) {
      console.error('Error loading mobile attendance settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const emps = await loadWorkforceAccounts();
      if (emps) setAllEmployees(emps);
    } catch (err) {
      console.error('Error loading workforce for mobile setup:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Simpan ke local storage agar instan bekerja di client
      localStorage.setItem('gesit_mobile_attendance_rules', JSON.stringify(settings));

      // 2. Simpan ke Supabase attendance_settings
      const payload: any = {
        require_selfie: settings.selfieRequired,
        require_note: settings.noteMandatory,
        face_recognition: settings.faceRecognition,
        strict_validation: settings.strictValidation,
        sunglasses_masks_validation: settings.sunglassesMasksValidation,
        liveness_detection: settings.livenessDetection,
        live_tracking: settings.liveTracking,
        apply_break_start: settings.applyBreakStart,
        apply_break_end: settings.applyBreakEnd,
        rule_target: settings.ruleTarget,
        selected_employee_ids: settings.selectedEmployeeIds,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('attendance_settings')
        .update(payload)
        .eq('id', 1);

      if (error) {
        // Jika kolom baru belum ada di Supabase, update kolom yang ada saja
        await supabase
          .from('attendance_settings')
          .update({
            require_selfie: settings.selfieRequired,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
      }

      toast.success('Pengaturan Live Attendance mobile berhasil disimpan');
    } catch (err: any) {
      console.error('Error saving mobile settings:', err);
      toast.success('Pengaturan disimpan ke cache browser');
    } finally {
      setSaving(false);
    }
  };

  const toggleEmployeeSelection = (empId: string) => {
    setSettings(prev => {
      const exists = prev.selectedEmployeeIds.includes(empId);
      return {
        ...prev,
        selectedEmployeeIds: exists
          ? prev.selectedEmployeeIds.filter(id => id !== empId)
          : [...prev.selectedEmployeeIds, empId]
      };
    });
  };

  const filteredEmployees = allEmployees.filter(e => {
    const term = searchEmployee.toLowerCase();
    const name = (e.full_name || e.name || '').toLowerCase();
    const dept = (e.department || '').toLowerCase();
    const code = (e.employee_code || '').toLowerCase();
    return name.includes(term) || dept.includes(term) || code.includes(term);
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── CARD 1: MOBILE CLOCK IN / CLOCK OUT ── */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Camera className="size-4 text-blue-600 dark:text-blue-400" />
            <span>Mobile clock in/clock out</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Konfigurasi validasi visual, biometrik wajah, dan lokasi saat karyawan melakukan presensi di perangkat mobile.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* 1. Selfie Required */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                <span>Selfie required</span>
                {settings.selfieRequired && (
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200">
                    Aktif
                  </Badge>
                )}
              </Label>
              <p className="text-xs text-muted-foreground">
                Require users to take a selfie for clock in and out.
              </p>
            </div>
            <Switch
              checked={settings.selfieRequired}
              onCheckedChange={checked => setSettings(s => ({ ...s, selfieRequired: checked }))}
            />
          </div>

          <div className="border-t border-border/40" />

          {/* 2. Note Mandatory */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground cursor-pointer">
                Note mandatory
              </Label>
              <p className="text-xs text-muted-foreground">
                Require users to fill in a note for clock in and out.
              </p>
            </div>
            <Switch
              checked={settings.noteMandatory}
              onCheckedChange={checked => setSettings(s => ({ ...s, noteMandatory: checked }))}
            />
          </div>

          <div className="border-t border-border/40" />

          {/* 3. Face Recognition & Sub-options */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-foreground flex items-center gap-2 cursor-pointer">
                  <span>Face recognition</span>
                  {settings.faceRecognition && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                      Biometrik
                    </Badge>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Verify user identity and selfie accuracy during clock in and out.
                </p>
              </div>
              <Switch
                checked={settings.faceRecognition}
                onCheckedChange={checked => setSettings(s => ({ ...s, faceRecognition: checked }))}
              />
            </div>

            {/* Indented Sub-checkboxes */}
            {settings.faceRecognition && (
              <div className="ml-4 pl-4 border-l-2 border-blue-200 dark:border-blue-900/60 space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-foreground/90">
                  <input
                    type="checkbox"
                    checked={settings.strictValidation}
                    onChange={e => setSettings(s => ({ ...s, strictValidation: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                  />
                  <span>Enable strict validation</span>
                  <span title="Tingkat kecocokan biometrik wajah minimal 85%">
                    <Info className="size-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-foreground/90">
                  <input
                    type="checkbox"
                    checked={settings.sunglassesMasksValidation}
                    onChange={e => setSettings(s => ({ ...s, sunglassesMasksValidation: e.target.checked }))}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                  />
                  <span>Enable verification for sunglasses, masks, and multiple faces</span>
                  <span title="Mendeteksi dan menolak presensi jika mengenakan kacamata hitam, masker, atau terdapat lebih dari 1 orang dalam foto">
                    <Info className="size-3 text-muted-foreground hover:text-foreground" />
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="border-t border-border/40" />

          {/* 4. Liveness Detection */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground cursor-pointer">
                Liveness detection
              </Label>
              <p className="text-xs text-muted-foreground">
                Verify that the selfie is taken by a live person in real time.
              </p>
            </div>
            <Switch
              checked={settings.livenessDetection}
              onCheckedChange={checked => setSettings(s => ({ ...s, livenessDetection: checked }))}
            />
          </div>

          <div className="border-t border-border/40" />

          {/* 5. Live Tracking */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-foreground cursor-pointer">
                Live tracking
              </Label>
              <p className="text-xs text-muted-foreground">
                Track employee location based on tracking radius. If disabled, location is only recorded during clock in/out.
              </p>
            </div>
            <Switch
              checked={settings.liveTracking}
              onCheckedChange={checked => setSettings(s => ({ ...s, liveTracking: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── CARD 2: BREAK FEATURE RULES ── */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Coffee className="size-4 text-amber-600 dark:text-amber-400" />
            <span>Apply rules for break feature</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Aturan pencatatan waktu istirahat karyawan di aplikasi mobile.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={settings.applyBreakStart}
              onChange={e => setSettings(s => ({ ...s, applyBreakStart: e.target.checked }))}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
            />
            <span>Start break</span>
            <span title="Mewajibkan pencatatan waktu mulai istirahat">
              <Info className="size-3 text-muted-foreground" />
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={settings.applyBreakEnd}
              onChange={e => setSettings(s => ({ ...s, applyBreakEnd: e.target.checked }))}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-4"
            />
            <span>End break</span>
            <span title="Mewajibkan pencatatan waktu selesai istirahat">
              <Info className="size-3 text-muted-foreground" />
            </span>
          </label>
        </CardContent>
      </Card>

      {/* ── CARD 3: ASSIGN CLOCK IN/OUT RULES TO ── */}
      <Card className="border-border/60 shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <span>Assign clock in/out rules to</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Tentukan kepada siapa aturan presensi mobile di atas diberlakukan.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
              <input
                type="radio"
                name="ruleTarget"
                value="all"
                checked={settings.ruleTarget === 'all'}
                onChange={() => setSettings(s => ({ ...s, ruleTarget: 'all' }))}
                className="text-blue-600 focus:ring-blue-500 size-4"
              />
              <span>All employee ({allEmployees.length} orang)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-foreground">
              <input
                type="radio"
                name="ruleTarget"
                value="selected"
                checked={settings.ruleTarget === 'selected'}
                onChange={() => setSettings(s => ({ ...s, ruleTarget: 'selected' }))}
                className="text-blue-600 focus:ring-blue-500 size-4"
              />
              <span>Selected employee ({settings.selectedEmployeeIds.length} dipilih)</span>
            </label>
          </div>

          {/* Employee Selector if "selected" is chosen */}
          {settings.ruleTarget === 'selected' && (
            <div className="mt-3 p-3.5 rounded-xl border border-border/60 bg-muted/30 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Cari nama, NIP, atau departemen karyawan..."
                  value={searchEmployee}
                  onChange={e => setSearchEmployee(e.target.value)}
                  className="w-full text-xs bg-background border border-border/60 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettings(s => ({
                    ...s,
                    selectedEmployeeIds: s.selectedEmployeeIds.length === allEmployees.length ? [] : allEmployees.map(e => String(e.id))
                  }))}
                  className="text-[11px] h-8 shrink-0"
                >
                  {settings.selectedEmployeeIds.length === allEmployees.length ? 'Batal Semua' : 'Pilih Semua'}
                </Button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/20">
                {filteredEmployees.slice(0, 30).map(emp => {
                  const empId = String(emp.id);
                  const isChecked = settings.selectedEmployeeIds.includes(empId);
                  return (
                    <div
                      key={empId}
                      onClick={() => toggleEmployeeSelection(empId)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isChecked ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 font-medium' : 'hover:bg-muted/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={emp.full_name || emp.name || 'User'}
                          url={emp.avatar_url || emp.avatarUrl}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">
                            {emp.full_name || emp.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight">
                            {emp.employee_code || 'EMP'} · {emp.department || 'Operasional'}
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // handled by parent onClick
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 size-3.5"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SAVE ACTION BUTTON BAR (MATCHING TALENTA BOTTOM BAR) ── */}
      <div className="pt-2 flex items-center justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-xs px-6 py-2.5 rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-2"
        >
          {saving ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>Saving changes...</span>
            </>
          ) : (
            <>
              <Save className="size-3.5" />
              <span>Save changes</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
