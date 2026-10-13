import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  Building2, 
  X,
  Layers
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ToastProvider';

interface Department {
  id: number;
  name: string;
  company_id?: number | null;
  created_at?: string;
  companies?: {
    id: number;
    name: string;
    code?: string;
  } | null;
}

interface CompanyOption {
  id: number;
  name: string;
}

export const MasterDepartment: React.FC = () => {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', company_id: '' });
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deptRes, compRes] = await Promise.all([
        supabase
          .from('departments')
          .select(`
            id,
            name,
            company_id,
            created_at,
            companies (
              id,
              name,
              code
            )
          `)
          .order('name', { ascending: true }),
        supabase
          .from('companies')
          .select('id, name')
          .order('name', { ascending: true })
      ]);

      if (deptRes.error) throw deptRes.error;
      if (compRes.error) throw compRes.error;

      setDepartments((deptRes.data as any) || []);
      setCompanies(compRes.data || []);
    } catch (err: any) {
      console.error('Fetch departments error:', err);
      showToast('Gagal memuat departemen: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ name: '', company_id: companies[0]?.id?.toString() || '' });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      company_id: dept.company_id ? dept.company_id.toString() : ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama departemen wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        company_id: formData.company_id ? parseInt(formData.company_id) : null
      };

      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update(payload)
          .eq('id', editingDept.id);

        if (error) throw error;
        showToast('Departemen berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([payload]);

        if (error) throw error;
        showToast('Departemen berhasil ditambahkan', 'success');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Departemen berhasil dihapus', 'success');
      setDeletingId(null);
      fetchData();
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const filteredDepartments = departments.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.companies?.name && d.companies.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCompany = selectedCompanyFilter === 'all' || 
      (d.company_id && d.company_id.toString() === selectedCompanyFilter);
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
            Master Data & Organisasi
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-3xl flex items-center gap-2">
            <FolderTree className="h-7 w-7 text-[#12346a] dark:text-blue-400" />
            Master Department
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 sm:text-sm">
            Struktur hierarki departemen, divisi, dan unit kerja fungsional.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-zinc-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#12346a] dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#153466] dark:hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Departemen</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#131316] p-6 shadow-xs">
        {/* Filters */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Cari departemen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/70 dark:bg-[#18181b] pl-9 pr-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none transition-all"
              />
            </div>

            <select
              value={selectedCompanyFilter}
              onChange={(e) => setSelectedCompanyFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/70 dark:bg-[#18181b] px-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Semua Perusahaan</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id.toString()}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Total: <strong className="font-semibold text-slate-900 dark:text-zinc-100">{filteredDepartments.length}</strong> Departemen
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Departemen</th>
                <th className="pb-3 font-semibold">Perusahaan Induk</th>
                <th className="pb-3 font-semibold">Dibuat</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                    Memuat data departemen...
                  </td>
                </tr>
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                    Tidak ada data departemen yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/80 dark:hover:bg-[#18181c]/70 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#12346a]/10 dark:bg-blue-950/50 text-[#12346a] dark:text-blue-300 font-bold text-xs border border-[#12346a]/15 dark:border-blue-800/40">
                          <Layers className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-zinc-100">{dept.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a] px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                        <Building2 className="h-3 w-3 text-slate-400 dark:text-zinc-500" />
                        <span>{dept.companies?.name || 'Semua Entitas'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 dark:text-zinc-400">
                      {dept.created_at ? new Date(dept.created_at).toLocaleDateString('id-ID') : '-'}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(dept)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18181c] hover:text-[#12346a] dark:hover:text-blue-300 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(dept.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#131316] p-6 shadow-2xl border border-slate-200 dark:border-[#27272a] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
                {editingDept ? 'Edit Departemen' : 'Tambah Departemen Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Nama Departemen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Human Resources, Information Technology"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] px-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Perusahaan Induk
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] px-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="">(Semua Entitas)</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id.toString()}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 dark:border-[#27272a] px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#18181b] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#12346a] dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-[#153466] dark:hover:bg-blue-500 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131316] p-6 shadow-2xl border border-slate-200 dark:border-[#27272a]">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Hapus Departemen?</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Karyawan yang terikat dengan departemen ini akan kehilangan relasi departemen.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-slate-200 dark:border-[#27272a] px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-[#18181b] cursor-pointer"
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

export default MasterDepartment;
