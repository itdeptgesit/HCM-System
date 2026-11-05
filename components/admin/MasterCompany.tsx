import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Building,
  MapPin,
  Calendar,
  Upload,
  Image as ImageIcon,
  Palette,
} from '@/components/ui/icons';
import { supabase } from '../../lib/supabaseClient';
import { useToast } from '../ToastProvider';
import { 
  getCompanyBrand, 
  saveCompanyBrand, 
  getAllCompanyBranding,
  CompanyBrandConfig 
} from '../../lib/companyBrandingService';

interface Company {
  id: number;
  name: string;
  code?: string;
  address?: string;
  created_at?: string;
}

export const MasterCompany: React.FC = () => {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    address: '',
    logoUrl: '',
    color: '#12346a'
  });
  const [brandingVersion, setBrandingVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (err: any) {
      console.error('Fetch companies error:', err);
      showToast('Gagal memuat data company: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAddModal = () => {
    setEditingCompany(null);
    setFormData({ 
      name: '', 
      code: '', 
      address: '',
      logoUrl: '',
      color: '#12346a'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    const brand = getCompanyBrand(comp.name);
    setFormData({ 
      name: comp.name || '', 
      code: comp.code || '', 
      address: comp.address || '',
      logoUrl: brand.logoUrl || '',
      color: brand.color || '#12346a'
    });
    setIsModalOpen(true);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file & ukuran (maks 2MB untuk logo base64)
    if (!file.type.startsWith('image/')) {
      showToast('Harap pilih file gambar (PNG, JPG, SVG, WebP)', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran gambar maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, logoUrl: base64 }));
      showToast('Logo berhasil dimuat', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Nama perusahaan wajib diisi', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            address: formData.address.trim()
          })
          .eq('id', editingCompany.id);

        if (error) throw error;
        // Simpan branding logo & warna perusahaan
        saveCompanyBrand(formData.name.trim(), {
          logoUrl: formData.logoUrl,
          color: formData.color,
        });
        showToast('Perusahaan berhasil diperbarui', 'success');
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([{
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            address: formData.address.trim()
          }]);

        if (error) throw error;
        // Simpan branding logo & warna perusahaan
        saveCompanyBrand(formData.name.trim(), {
          logoUrl: formData.logoUrl,
          color: formData.color,
        });
        showToast('Perusahaan baru berhasil ditambahkan', 'success');
      }

      setBrandingVersion(v => v + 1);
      setIsModalOpen(false);
      fetchCompanies();
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Perusahaan berhasil dihapus', 'success');
      setDeletingId(null);
      fetchCompanies();
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-zinc-500">
            Master Data & Organisasi
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 sm:text-3xl flex items-center gap-2">
            <Building2 className="h-7 w-7 text-[#12346a] dark:text-blue-400" />
            Master Company
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 sm:text-sm">
            Kelola entitas anak perusahaan dan unit bisnis dalam ekosistem The Gesit Companies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCompanies}
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
            <span>Tambah Company</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#222225] bg-white dark:bg-[#131316] p-6 shadow-xs">
        {/* Search */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Cari nama atau kode company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50/70 dark:bg-[#18181b] pl-9 pr-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none transition-all"
            />
          </div>
          <div className="text-xs text-slate-500 dark:text-zinc-400">
            Total: <strong className="font-semibold text-slate-900 dark:text-zinc-100">{filteredCompanies.length}</strong> Perusahaan
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                <th className="pb-3 font-semibold">Perusahaan</th>
                <th className="pb-3 font-semibold">Kode</th>
                <th className="pb-3 font-semibold">Alamat Kantor</th>
                <th className="pb-3 font-semibold">Dibuat</th>
                <th className="pb-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                    Memuat data perusahaan...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-zinc-400">
                    Tidak ada data perusahaan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((comp) => {
                  const brand = getCompanyBrand(comp.name);
                  const brandColor = brand.color || '#12346a';

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/80 dark:hover:bg-[#18181c]/70 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          {brand.logoUrl ? (
                            <div 
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-1 shadow-2xs overflow-hidden"
                              style={{ borderColor: `${brandColor}40` }}
                            >
                              <img 
                                src={brand.logoUrl} 
                                alt={comp.name} 
                                className="h-full w-full object-contain" 
                              />
                            </div>
                          ) : (
                            <div 
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-xs border shadow-2xs transition-transform"
                              style={{ 
                                backgroundColor: `${brandColor}15`, 
                                color: brandColor,
                                borderColor: `${brandColor}35`
                              }}
                            >
                              {comp.code?.slice(0, 2) || comp.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-slate-900 dark:text-zinc-100 block">
                              {comp.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span 
                                className="inline-block size-2 rounded-full" 
                                style={{ backgroundColor: brandColor }}
                                title={`Theme color: ${brandColor}`}
                              />
                              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 uppercase">
                                {brandColor}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="rounded-md bg-slate-100 dark:bg-[#18181b] border border-slate-200/60 dark:border-[#27272a] px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-zinc-300">
                          {comp.code || '-'}
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-500 dark:text-zinc-400 max-w-xs truncate">
                        {comp.address || '-'}
                      </td>
                      <td className="py-3.5 text-slate-500 dark:text-zinc-400">
                        {comp.created_at ? new Date(comp.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(comp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#18181c] hover:text-[#12346a] dark:hover:text-blue-300 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(comp.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
                {editingCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan Baru'}
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
                  Nama Perusahaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Gesit Alami"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] px-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Kode Perusahaan (Singkatan)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: GNA"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full h-9 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] px-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  Alamat Kantor
                </label>
                <textarea
                  rows={2}
                  placeholder="Jl. Jend. Sudirman Kav 25, Jakarta"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] p-3 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#12346a] dark:focus:border-blue-500 focus:bg-white dark:focus:bg-[#1f1f23] focus:outline-none"
                />
              </div>

              {/* Branding Section: Logo Upload & Theme Color */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-[#12346a] dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                    Branding & Tampilan Logo
                  </span>
                </div>

                {/* Logo Upload & Preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Logo Perusahaan
                  </label>
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] p-1.5 overflow-hidden shadow-2xs"
                      style={{ borderColor: `${formData.color}60` }}
                    >
                      {formData.logoUrl ? (
                        <img 
                          src={formData.logoUrl} 
                          alt="Logo Preview" 
                          className="h-full w-full object-contain" 
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-300 dark:text-zinc-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[#1f1f23] cursor-pointer transition-colors shadow-2xs">
                          <Upload className="h-3.5 w-3.5 text-slate-500" />
                          <span>Pilih Berkas Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                        </label>
                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                            className="text-[11px] text-rose-500 hover:underline px-1.5"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        PNG, JPG, SVG transparan, maksimal 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Color Picker & Presets */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Warna Tema Logo / Perusahaan
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] px-2 py-1 shadow-2xs">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#12346a"
                        className="w-20 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 bg-transparent focus:outline-none uppercase"
                      />
                    </div>

                    {/* Quick color preset chips */}
                    <div className="flex items-center gap-1.5">
                      {[
                        { color: '#12346a', label: 'Navy' },
                        { color: '#059669', label: 'Emerald' },
                        { color: '#0284c7', label: 'Sky' },
                        { color: '#f97316', label: 'Orange' },
                        { color: '#6366f1', label: 'Indigo' },
                        { color: '#8b5cf6', label: 'Purple' },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, color: preset.color }))}
                          className="size-6 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shadow-2xs"
                          style={{ backgroundColor: preset.color }}
                          title={preset.label}
                        >
                          {formData.color.toLowerCase() === preset.color.toLowerCase() && (
                            <Check className="size-3 text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">Hapus Perusahaan?</h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Tindakan ini tidak dapat dibatalkan. Karyawan yang terikat dengan perusahaan ini mungkin perlu diperbarui.
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

export default MasterCompany;
