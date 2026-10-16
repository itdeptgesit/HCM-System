import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  KeyRound, 
  RefreshCw, 
  X, 
  CheckCircle, 
  AlertTriangle,
  UserX,
  Mail,
  Building,
  Layers,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Unlock,
  Check
} from '@/components/ui/icons';
import { supabase, ensureAuthUserWithPassword } from '../../lib/supabaseClient';
import { useToast } from '../ToastProvider';

interface UserAccount {
  id: number;
  email: string;
  full_name: string;
  username?: string;
  role: string;
  status: string;
  company?: string;
  department?: string;
  job_title?: string;
  employee_code?: string;
  created_at?: string;
  last_login?: string;
  auth_id?: string;
}

export const AccountManagement: React.FC = () => {
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [credentialFilter, setCredentialFilter] = useState<'all' | 'need_password' | 'has_password'>('all');

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    role: 'Employee',
    status: 'Active',
    company: 'The Gesit Companies',
    department: 'Human Resources',
    password: ''
  });
  const [saving, setSaving] = useState(false);

  // Set / Reset Password Modal
  const [passwordModalAccount, setPasswordModalAccount] = useState<UserAccount | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Delete Confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Fetch accounts error:', err);
      showToast('Gagal memuat akun: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openAddModal = () => {
    setEditingAccount(null);
    setFormData({
      full_name: '',
      email: '',
      username: '',
      role: 'Employee',
      status: 'Active',
      company: 'The Gesit Companies',
      department: 'Human Resources',
      password: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setFormData({
      full_name: acc.full_name || '',
      email: acc.email || '',
      username: acc.username || '',
      role: acc.role || 'Employee',
      status: acc.status || 'Active',
      company: acc.company || 'The Gesit Companies',
      department: acc.department || 'Human Resources',
      password: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() || !formData.email.trim()) {
      showToast('Nama lengkap dan email wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from('user_accounts')
          .update({
            full_name: formData.full_name.trim(),
            email: formData.email.trim().toLowerCase(),
            username: formData.username.trim().toLowerCase() || null,
            role: formData.role || 'Employee',
            status: formData.status,
            company: formData.company,
            department: formData.department,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingAccount.id);

        if (error) throw error;
        showToast('Akun berhasil diperbarui', 'success');
      } else {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${yy}${mm}`;
        const usedNumbers = accounts
          .map(a => a.employee_code || '')
          .filter(code => code.startsWith(prefix) && /^\d{7}$/.test(code))
          .map(code => Number(code.slice(4)))
          .filter(n => Number.isInteger(n) && n > 0);
        const nextSeq = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;
        const generatedCode = `${prefix}${String(nextSeq).padStart(3, '0')}`;

        let authId: string | null = null;
        if (formData.password && formData.password.trim().length >= 6) {
          try {
            authId = await ensureAuthUserWithPassword(
              formData.email.trim().toLowerCase(),
              formData.password.trim(),
              formData.full_name.trim()
            );
          } catch (error) { throw error; }
        }

        const { error } = await supabase
          .from('user_accounts')
          .insert([{
            full_name: formData.full_name.trim(),
            email: formData.email.trim().toLowerCase(),
            username: formData.username.trim().toLowerCase() || formData.email.split('@')[0],
            role: formData.role || 'Employee',
            status: formData.status,
            company: formData.company,
            department: formData.department,
            employee_code: generatedCode,
            auth_id: authId || null
          }]);

        if (error) throw error;
        showToast('Akun baru berhasil didaftarkan dengan role ' + (formData.role || 'Employee'), 'success');
      }

      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      showToast('Gagal menyimpan akun: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (account: UserAccount) => {
    const nextStatus = account.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const { error } = await supabase
        .from('user_accounts')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', account.id);

      if (error) throw error;
      showToast(`Status akun ${account.full_name} diubah menjadi ${nextStatus}`, 'success');
      fetchAccounts();
    } catch (err: any) {
      showToast('Gagal mengubah status: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('user_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Akun berhasil dihapus', 'success');
      setDeletingId(null);
      fetchAccounts();
    } catch (err: any) {
      showToast('Gagal menghapus akun: ' + err.message, 'error');
    }
  };

  // Password Setup Modal Handlers
  const openPasswordModal = (acc: UserAccount) => {
    setPasswordModalAccount(acc);
    setPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordError('');
    setShowPasswordText(false);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let generated = 'Gesit@';
    for (let i = 0; i < 4; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordInput(generated);
    setConfirmPasswordInput(generated);
    setPasswordError('');
    setShowPasswordText(true);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalAccount) return;

    if (passwordInput.length < 6) {
      setPasswordError('Password minimal harus 6 karakter');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setPasswordError('Konfirmasi password tidak sesuai');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');

    try {
      // 1. Provision / update in Supabase Auth
      let authUserId: string | null = null;
      authUserId = await ensureAuthUserWithPassword(
          passwordModalAccount.email,
          passwordInput,
          passwordModalAccount.full_name,
          passwordModalAccount.id
        );
      if (!authUserId) throw new Error('Akun Auth tidak berhasil dibuat.');

      // 2. Update user_accounts record
      const updateData: any = {
        status: 'Active',
        updated_at: new Date().toISOString()
      };
      if (authUserId) {
        updateData.auth_id = authUserId;
      }

      const { error: updateErr } = await supabase
        .from('user_accounts')
        .update(updateData)
        .eq('id', passwordModalAccount.id);

      if (updateErr) throw updateErr;

      showToast(
        `Password untuk ${passwordModalAccount.full_name} berhasil disimpan. Akun kini siap digunakan untuk login.`,
        'success'
      );
      setPasswordModalAccount(null);
      await fetchAccounts();
    } catch (err: any) {
      setPasswordError('Gagal menyimpan password: ' + (err.message || 'Unknown error'));
      showToast('Gagal menyimpan password: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const haystack = [
      acc.full_name,
      acc.email,
      acc.username || '',
      acc.employee_code || '',
      acc.department || '',
      acc.company || ''
    ].join(' ').toLowerCase();

    const matchesSearch = haystack.includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || acc.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || acc.status === statusFilter;
    
    let matchesCredential = true;
    if (credentialFilter === 'need_password') {
      matchesCredential = !acc.auth_id;
    } else if (credentialFilter === 'has_password') {
      matchesCredential = Boolean(acc.auth_id);
    }

    return matchesSearch && matchesRole && matchesStatus && matchesCredential;
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Administrasi & Keamanan
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-primary" />
            Account Management
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Data karyawan dari HR otomatis tersinkronisasi di sini. Tinggal memasukkan password untuk mengaktifkan akun login (Role default: <strong>Employee</strong>).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Akun</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs">
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama, email, username, NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-border bg-muted/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none transition-all"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Peran (Role)</option>
              <option value="Super Admin">Super Admin</option>
              <option value="Admin">Admin</option>
              <option value="HR Manager">HR Manager</option>
              <option value="HR Staff">HR Staff</option>
              <option value="Employee">Employee</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status Akun</option>
              <option value="Active">Aktif (Active)</option>
              <option value="Suspended">Ditangguhkan (Suspended)</option>
              <option value="Inactive">Nonaktif (Inactive)</option>
            </select>

            <select
              value={credentialFilter}
              onChange={(e) => setCredentialFilter(e.target.value as any)}
              className="h-9 rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Status Password</option>
              <option value="need_password">⚠️ Belum Ada Password (Perlu Diset)</option>
              <option value="has_password">✅ Password Sudah Aktif</option>
            </select>
          </div>

          <div className="text-xs text-muted-foreground">
            Total: <strong className="font-semibold text-foreground">{filteredAccounts.length}</strong> Akun
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-semibold">Pengguna & NIK</th>
                <th className="pb-3 font-semibold">Peran (Role)</th>
                <th className="pb-3 font-semibold">Organisasi</th>
                <th className="pb-3 font-semibold">Status Login / Password</th>
                <th className="pb-3 font-semibold">Status Akun</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Memuat data akun pengguna...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada akun yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground border border-border shrink-0">
                          {acc.full_name?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                        <div>
                          <div className="font-bold text-foreground flex items-center gap-2">
                            <span>{acc.full_name}</span>
                            {acc.employee_code && (
                              <span className="font-mono text-[10px] bg-muted/70 text-muted-foreground px-1.5 py-0.5 rounded border border-border/70">
                                {acc.employee_code}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{acc.email}</span>
                            {acc.username && <span className="text-muted-foreground/80">(@{acc.username})</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        acc.role === 'Super Admin' 
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60' 
                          : acc.role.includes('Admin') || acc.role.includes('Manager')
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60'
                          : 'bg-muted/60 text-muted-foreground border border-border/60'
                      }`}>
                        <Shield className="h-3 w-3" />
                        <span>{acc.role || 'Employee'}</span>
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="text-xs font-medium text-foreground">{acc.department || '-'}</div>
                      <div className="text-[11px] text-muted-foreground">{acc.company || '-'}</div>
                    </td>
                    <td className="py-3.5">
                      {acc.auth_id ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Password Aktif</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => openPasswordModal(acc)}
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors cursor-pointer"
                          title="Klik untuk memasukkan password awal karyawan"
                        >
                          <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                          <span>Perlu Password</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        acc.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                      }`}>
                        {acc.status === 'Active' ? 'Aktif' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Tombol Atur Password */}
                        <button
                          onClick={() => openPasswordModal(acc)}
                          className="rounded-lg p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          title={acc.auth_id ? 'Ubah / Reset Password' : 'Atur Password Karyawan Baru'}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle Suspend */}
                        <button
                          onClick={() => handleToggleStatus(acc)}
                          className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                            acc.status === 'Active'
                              ? 'text-muted-foreground hover:bg-muted'
                              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                          }`}
                          title={acc.status === 'Active' ? 'Suspend Akun' : 'Aktifkan Akun'}
                        >
                          {acc.status === 'Active' ? <UserX className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </button>

                        {/* Edit Profil */}
                        <button
                          onClick={() => openEditModal(acc)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Edit Akun"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Hapus */}
                        <button
                          onClick={() => setDeletingId(acc.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Profil Akun */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 text-card-foreground">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <h3 className="text-base font-bold text-foreground">
                {editingAccount ? 'Edit Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Email Resmi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@gesit.co.id"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="budi.santoso"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Peran (Role)
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                  >
                    <option value="Employee">Employee (Default)</option>
                    <option value="HR Staff">HR Staff</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Admin">Admin</option>
                    <option value="Super Admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Perusahaan
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Status Akun
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full h-9 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground focus:border-primary focus:bg-background focus:outline-none cursor-pointer"
                >
                  <option value="Active">Aktif (Active)</option>
                  <option value="Suspended">Ditangguhkan (Suspended)</option>
                  <option value="Inactive">Nonaktif (Inactive)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SET / RESET PASSWORD KARYAWAN */}
      {passwordModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-150 text-card-foreground">
            <div className="flex items-start justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {passwordModalAccount.auth_id ? 'Ubah Kata Sandi' : 'Atur Password Karyawan'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Masukkan password agar karyawan dapat login ke aplikasi.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPasswordModalAccount(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Target Identity Summary Card */}
            <div className="mt-4 p-3.5 rounded-xl bg-muted/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Karyawan</span>
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-muted/60 text-muted-foreground border border-border/50">
                  <Shield className="h-3 w-3" /> {passwordModalAccount.role || 'Employee'}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{passwordModalAccount.full_name}</p>
                <p className="text-xs text-muted-foreground">{passwordModalAccount.email}</p>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-border/60 text-[11px] text-muted-foreground">
                <span>NIK: <strong className="text-foreground">{passwordModalAccount.employee_code || '-'}</strong></span>
                <span>•</span>
                <span>Dept: <strong className="text-foreground">{passwordModalAccount.department || '-'}</strong></span>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  {passwordError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-foreground">
                    Password Baru <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> Buat Acak
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    required
                    placeholder="Minimal 6 karakter"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full h-10 rounded-xl border border-border bg-muted/40 pl-3 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Konfirmasi Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showPasswordText ? 'text' : 'password'}
                  required
                  placeholder="Ketik ulang password"
                  value={confirmPasswordInput}
                  onChange={(e) => {
                    setConfirmPasswordInput(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                Karyawan dapat langsung login ke aplikasi menggunakan email <strong>{passwordModalAccount.email}</strong> dan kata sandi ini.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setPasswordModalAccount(null)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {passwordSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{passwordSaving ? 'Menyimpan...' : 'Simpan & Aktifkan Login'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl border border-border text-card-foreground">
            <h3 className="text-base font-bold text-foreground">Hapus Akun Pengguna?</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Tindakan ini akan menghapus akun login dan profil pengguna. Data presensi dan pengajuan yang terkait akan kehilangan relasi ke akun ini.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;
