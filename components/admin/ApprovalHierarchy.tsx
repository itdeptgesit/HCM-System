import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  Search, 
  Save, 
  RefreshCw, 
  UserCheck, 
  Shield, 
  ArrowRight, 
  ChevronRight, 
  Edit3, 
  CheckCircle2, 
  X,
  Layers,
  Settings2,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ToastProvider';

interface UserAccount {
  id: number;
  full_name: string;
  email: string;
  department?: string;
  job_title?: string;
  role?: string;
  supervisor_id?: number | null;
  manager_id?: number | null;
  attendance_hr_id?: number | null;
  vp_id?: number | null;
  attendance_supervisor_id?: number | null;
  attendance_manager_id?: number | null;
  attendance_vp_id?: number | null;
}

interface WorkflowRule {
  id: string;
  name: string;
  type: string;
  levels: Array<{
    level: number;
    title: string;
    roleRequired: string;
    description: string;
  }>;
}

const DEFAULT_WORKFLOWS: WorkflowRule[] = [
  {
    id: 'leave',
    name: 'Alur Persetujuan Cuti & Izin',
    type: 'Cuti Tahunan, Sakit, & Izin Pribadi',
    levels: [
      { level: 1, title: 'Atasan Langsung', roleRequired: 'Supervisor', description: 'Review ketersediaan jadwal tim & operasional' },
      { level: 2, title: 'Head of Department', roleRequired: 'Manager', description: 'Approval kuota & dampak produktivitas unit' },
      { level: 3, title: 'HR Specialist / HRD', roleRequired: 'HR Admin', description: 'Verifikasi saldo hak cuti & pencatatan sistem' }
    ]
  },
  {
    id: 'overtime',
    name: 'Alur Persetujuan Lembur (Overtime)',
    type: 'Lembur Hari Kerja & Hari Libur',
    levels: [
      { level: 1, title: 'Supervisor Lapangan', roleRequired: 'Supervisor', description: 'Verifikasi urgensi tugas & estimasi jam lembur' },
      { level: 2, title: 'Department Manager', roleRequired: 'Manager', description: 'Approval anggaran alokasi biaya lembur' }
    ]
  },
  {
    id: 'reimbursement',
    name: 'Alur Klaim & Reimbursement',
    type: 'Kesehatan, Perjalanan Dinas, & Operasional',
    levels: [
      { level: 1, title: 'Manager Departemen', roleRequired: 'Manager', description: 'Validasi kelayakan bukti kwitansi & kebutuhan dinas' },
      { level: 2, title: 'Finance & HR Approval', roleRequired: 'HR & Finance', description: 'Verifikasi audit & penjadwalan transfer dana' },
      { level: 3, title: 'Direksi / VP (Klaim > Rp 5 Juta)', roleRequired: 'Vice President', description: 'Persetujuan eksekutif untuk pengeluaran bernominal besar' }
    ]
  }
];

export const ApprovalHierarchy: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'mapping' | 'workflows'>('mapping');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  // Edit Mapping Modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('');
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [selectedHR, setSelectedHR] = useState<string>('');
  const [selectedVP, setSelectedVP] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('id, full_name, email, department, job_title, role, supervisor_id, manager_id, attendance_hr_id, vp_id, attendance_supervisor_id, attendance_manager_id, attendance_vp_id')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Fetch users error:', err);
      showToast('Gagal memuat hierarki pengguna: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEditModal = (u: UserAccount) => {
    setEditingUser(u);
    setSelectedSupervisor((u.attendance_supervisor_id || u.supervisor_id)?.toString() || '');
    setSelectedManager((u.attendance_manager_id || u.manager_id)?.toString() || '');
    setSelectedHR(u.attendance_hr_id ? u.attendance_hr_id.toString() : '');
    setSelectedVP((u.attendance_vp_id || u.vp_id)?.toString() || '');
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({
          supervisor_id: selectedSupervisor ? parseInt(selectedSupervisor) : null,
          manager_id: selectedManager ? parseInt(selectedManager) : null,
          attendance_hr_id: selectedHR ? parseInt(selectedHR) : null,
          attendance_supervisor_id: selectedSupervisor ? parseInt(selectedSupervisor) : null,
          attendance_manager_id: selectedManager ? parseInt(selectedManager) : null,
          attendance_vp_id: selectedVP ? parseInt(selectedVP) : null,
          vp_id: selectedVP ? parseInt(selectedVP) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);

      if (error) throw error;
      showToast(`Jalur hierarki persetujuan untuk ${editingUser.full_name} berhasil disimpan!`, 'success');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showToast('Gagal menyimpan hierarki: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper to find approver name
  const getApproverName = (id?: number | null) => {
    if (!id) return '-';
    const found = users.find(u => u.id === id);
    return found ? found.full_name : `ID: ${id}`;
  };

  // Departments list for filtering
  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  const filteredUsers = users.filter(u => {
    const haystack = [u.full_name, u.email, u.department || '', u.job_title || ''].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesDept = deptFilter === 'all' || u.department === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Alur & Tata Kelola
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <GitMerge className="h-7 w-7 text-primary" />
            Hierarchy Approval
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Tentukan approver Supervisor, HR, Manager, dan VP. Tahap yang kosong dilewati sesuai mapping karyawan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('mapping')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'mapping'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Mapping Approver Karyawan</span>
        </button>
        <button
          onClick={() => setActiveTab('workflows')}
          className={`flex items-center gap-2 pb-3 px-2 text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'workflows'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Alur & Aturan Tingkatan (Workflow)</span>
        </button>
      </div>

      {/* TAB 1: Mapping Approver Table */}
      {activeTab === 'mapping' && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
          {/* Filters */}
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari karyawan atau jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border bg-muted/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
                />
              </div>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Departemen</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-muted-foreground">
              Total: <strong className="font-semibold text-foreground">{filteredUsers.length}</strong> Karyawan
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-semibold">Karyawan (Pemohon)</th>
                  <th className="pb-3 font-semibold">Departemen & Jabatan</th>
                  <th className="pb-3 font-semibold">Level 1: Supervisor</th>
                  <th className="pb-3 font-semibold">Manager</th>
                  <th className="pb-3 font-semibold">HR</th>
                  <th className="pb-3 font-semibold">VP</th>
                  <th className="pb-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Memuat data hierarki persetujuan...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Tidak ada karyawan yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                      {/* Pemohon */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground border border-border shrink-0">
                            {u.full_name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{u.full_name}</div>
                            <div className="text-[11px] text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Departemen */}
                      <td className="py-3.5">
                        <div className="font-medium text-foreground">{u.department || '-'}</div>
                        <div className="text-[11px] text-muted-foreground">{u.job_title || '-'}</div>
                      </td>

                      {/* Level 1: Supervisor */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                          u.supervisor_id 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60'
                            : 'bg-muted/60 text-muted-foreground border border-border/50'
                        }`}>
                          <span>{getApproverName(u.attendance_supervisor_id || u.supervisor_id)}</span>
                        </span>
                      </td>

                      {/* Level 2: Manager */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                          u.manager_id 
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60'
                            : 'bg-muted/60 text-muted-foreground border border-border/50'
                        }`}>
                          <span>{getApproverName(u.attendance_manager_id || u.manager_id)}</span>
                        </span>
                      </td>

                      {/* Level 3: HR */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                          u.attendance_hr_id 
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60'
                            : 'bg-muted/60 text-muted-foreground border border-border/50'
                        }`}>
                          <span>{getApproverName(u.attendance_hr_id)}</span>
                        </span>
                      </td>

                      <td className="py-3.5 text-foreground/80">{getApproverName(u.attendance_vp_id || u.vp_id)}</td>
                      {/* Aksi */}
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3 w-3 text-muted-foreground" />
                          <span>Atur</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Visual Workflow Rules */}
      {activeTab === 'workflows' && (
        <div className="space-y-6">
          {DEFAULT_WORKFLOWS.map((wf) => (
            <div key={wf.id} className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">{wf.name}</h3>
                  <p className="text-xs text-muted-foreground">{wf.type}</p>
                </div>
                <span className="self-start rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 sm:self-center">
                  Mengikuti mapping karyawan
                </span>
              </div>

              {/* Chain Steps Diagram */}
              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:justify-between">
                {/* Step 0: Pemohon */}
                <div className="flex-1 rounded-2xl border border-border bg-muted/30 p-4 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inisiasi</div>
                  <div className="mt-1 text-sm font-bold text-foreground">Karyawan Mengajukan</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">Submit form pengajuan di web/portal</p>
                </div>

                {[
                  { level: 1, title: 'Supervisor', roleRequired: 'Approver yang ditunjuk', description: 'Atasan langsung meninjau pengajuan.' },
                  { level: 2, title: 'HR', roleRequired: 'Approver yang ditunjuk', description: 'Verifikasi HR jika tahap ini dikonfigurasi.' },
                  { level: 3, title: 'Manager', roleRequired: 'Approver yang ditunjuk', description: 'Persetujuan manajemen sesuai mapping.' },
                  { level: 4, title: 'VP', roleRequired: 'Approver yang ditunjuk', description: 'Tahap VP jika dikonfigurasi; tahap kosong dilewati.' },
                ].map((lvl) => (
                  <React.Fragment key={lvl.level}>
                    <div className="hidden items-center justify-center lg:flex">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-2xs hover:border-primary transition-all">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Level {lvl.level}
                        </span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{lvl.roleRequired}</span>
                      </div>
                      <div className="mt-2 text-sm font-bold text-foreground">{lvl.title}</div>
                      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{lvl.description}</p>
                    </div>
                  </React.Fragment>
                ))}

                <div className="hidden items-center justify-center lg:flex">
                  <ChevronRight className="h-5 w-5 text-emerald-500" />
                </div>

                {/* Final: Selesai */}
                <div className="flex-1 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Selesai</div>
                  <div className="mt-1 text-sm font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Disetujui & Sinkron</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">Status dan riwayat tersimpan. Ledger dipotong khusus cuti tahunan.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Approvers Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 text-card-foreground">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground">Atur Jalur Persetujuan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Untuk: <strong className="text-foreground">{editingUser.full_name}</strong> ({editingUser.department || 'Tanpa Dept'})
                </p>
              </div>
              <button 
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="mt-4 space-y-4">
              {/* Level 1: Supervisor */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Level 1: Atasan Langsung (Supervisor)
                </label>
                <select
                  value={selectedSupervisor}
                  onChange={(e) => setSelectedSupervisor(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                >
                  <option value="">(Belum ditentukan / Lewati ke Level 2)</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id.toString()}>
                      {u.full_name} — {u.job_title || u.role} ({u.department || 'All'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Pihak pertama yang menerima notifikasi pengajuan.
                </span>
              </div>

              {/* Level 2: Manager */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Level 3: Head of Department (Manager)
                </label>
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                >
                  <option value="">(Belum ditentukan / Lewati tahap)</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id.toString()}>
                      {u.full_name} — {u.job_title || u.role} ({u.department || 'All'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Pemberi persetujuan manajerial setelah Supervisor setuju.
                </span>
              </div>

              {/* Level 3: HR Approval */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Level 2: HR Specialist / PIC HRD
                </label>
                <select
                  value={selectedHR}
                  onChange={(e) => setSelectedHR(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                >
                  <option value="">(Belum ditentukan / Lewati tahap)</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => (
                    <option key={u.id} value={u.id.toString()}>
                      {u.full_name} — {u.job_title || u.role}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Verifikasi HR setelah Supervisor, sebelum Manager. Saldo dipotong hanya pada approval final.
                </span>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-foreground">Level 4: VP</label>
                <select 
                  value={selectedVP} 
                  onChange={e => setSelectedVP(e.target.value)} 
                  className="h-9 w-full rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                >
                  <option value="">(Belum ditentukan / Lewati tahap)</option>
                  {users.filter(u => u.id !== editingUser.id).map(u => <option key={u.id} value={String(u.id)}>{u.full_name} ({u.department || '-'})</option>)}
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Hierarki'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHierarchy;
