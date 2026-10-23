import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  Upload,
  FileText,
  Download,
  Trash2,
  Plus,
  X,
  Search,
  ChevronDown,
  Eye,
  Loader2,
  File,
  FileImage,
  AlertCircle,
  CheckCircle2,
  Users,
  Building2,
  Info,
  Link as LinkIcon,
} from '@/components/ui/icons';
import { supabase } from '../../lib/supabaseClient';
import { uploadFileToGoogleDrive } from '../../lib/googleDriveUpload';

// ─── Types ──────────────────────────────────────────────────────────────────

export type DocCategory = 'sk' | 'kebijakan' | 'form' | 'sop' | 'pengumuman' | 'umum';

export interface HRDocument {
  id: string;
  title: string;
  description?: string | null;
  category: DocCategory;
  file_url: string;
  file_name: string;
  file_size?: number | null;
  gdrive_file_id?: string | null;
  gdrive_download_link?: string | null;
  storage_provider?: string;
  target_departments?: string[] | null;
  is_active: boolean;
  uploaded_by?: string | null;
  created_at: string;
}

interface HRDocumentsManagerProps {
  currentUser?: any;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES: Record<DocCategory, { label: string; color: string; bg: string; icon: typeof FileText }> = {
  sk: {
    label: 'SK / Surat Keputusan',
    color: 'text-blue-700 dark:text-blue-300',
    bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70',
    icon: FileText,
  },
  kebijakan: {
    label: 'Kebijakan Perusahaan',
    color: 'text-purple-700 dark:text-purple-300',
    bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/70',
    icon: FileText,
  },
  form: {
    label: 'Form & Template',
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70',
    icon: File,
  },
  sop: {
    label: 'SOP & Prosedur',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/70',
    icon: FileText,
  },
  pengumuman: {
    label: 'Pengumuman',
    color: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70',
    icon: Info,
  },
  umum: {
    label: 'Umum',
    color: 'text-slate-700 dark:text-zinc-300',
    bg: 'bg-slate-100 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700',
    icon: Folder,
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return FileImage;
  return FileText;
}

function extractGDriveId(url: string): string | null {
  const m = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

function getGDriveDownloadUrl(fileUrl: string, fileId?: string | null): string {
  const id = fileId || extractGDriveId(fileUrl);
  if (id) {
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return fileUrl;
}

function getGDrivePreviewUrl(fileUrl: string, fileId?: string | null): string {
  const id = fileId || extractGDriveId(fileUrl);
  if (id) {
    return `https://drive.google.com/file/d/${id}/preview`;
  }
  if (fileUrl.includes('/file/d/')) {
    return fileUrl.replace(/\/view(\?.*)?$/, '/preview');
  }
  return fileUrl;
}

// ─── Upload / Edit Modal ─────────────────────────────────────────────────────

interface UploadModalProps {
  onClose: () => void;
  onSaved: () => void;
  currentUser?: any;
  editing?: HRDocument | null;
}

function UploadModal({ onClose, onSaved, currentUser, editing }: UploadModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'upload' | 'link'>(
    editing?.file_url?.includes('drive.google.com') && !editing ? 'link' : 'upload'
  );
  const [title, setTitle] = useState(editing?.title || '');
  const [description, setDescription] = useState(editing?.description || '');
  const [category, setCategory] = useState<DocCategory>(editing?.category || 'umum');
  const [targetDepts, setTargetDepts] = useState<string>(
    editing?.target_departments?.join(', ') || ''
  );
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [gdriveLink, setGdriveLink] = useState(editing?.file_url || '');
  const [uploading, setUploading] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [error, setError] = useState('');

  const handleFile = (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      setError('Ukuran file Google Drive maksimal 25 MB.');
      return;
    }
    setFile(f);
    setError('');
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Judul dokumen wajib diisi.'); return; }

    setUploading(true);
    setUploadStatusMsg('Menyimpan dokumen...');
    setError('');

    try {
      let fileUrl = editing?.file_url || '';
      let fileName = editing?.file_name || '';
      let fileSize = editing?.file_size;
      let gdriveFileId = editing?.gdrive_file_id || null;
      let gdriveDownloadLink = editing?.gdrive_download_link || null;

      if (mode === 'upload') {
        if (!editing && !file) {
          setError('Pilih file untuk diunggah ke Google Drive.');
          setUploading(false);
          return;
        }

        if (file) {
          setUploadStatusMsg('Mengunggah file ke Google Drive Perusahaan...');
          const gdriveRes = await uploadFileToGoogleDrive(file, {
            category: category === 'sk' ? 'sk_perusahaan' : 'internal_hr',
            visibility: 'all_active',
            folderType: category === 'sk' ? 'sk_published' : 'hr_internal',
            targetEmail: currentUser?.email,
            notes: description || title,
          });

          if (!gdriveRes.success || !gdriveRes.fileUrl) {
            throw new Error(
              gdriveRes.error ||
              'Gagal mengunggah file ke Google Drive. Pastikan kredensial Service Account terkonfigurasi dengan benar.'
            );
          }

          fileUrl = gdriveRes.fileUrl;
          fileName = gdriveRes.fileName || file.name;
          fileSize = gdriveRes.fileSize || file.size;
          gdriveFileId = gdriveRes.fileId || extractGDriveId(fileUrl);
          gdriveDownloadLink =
            gdriveRes.downloadUrl ||
            (gdriveFileId ? `https://drive.google.com/uc?export=download&id=${gdriveFileId}` : null);
        }
      } else {
        if (!gdriveLink.trim()) {
          setError('Tautan Google Drive wajib diisi.');
          setUploading(false);
          return;
        }
        fileUrl = gdriveLink.trim();
        const extractedId = extractGDriveId(fileUrl);
        gdriveFileId = extractedId;
        gdriveDownloadLink = extractedId
          ? `https://drive.google.com/uc?export=download&id=${extractedId}`
          : fileUrl;
        fileName = fileName || `${title.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      }

      const depts = targetDepts.trim()
        ? targetDepts.split(',').map(d => d.trim()).filter(Boolean)
        : null;

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_url: fileUrl,
        file_name: fileName || title.trim(),
        file_size: fileSize || null,
        gdrive_file_id: gdriveFileId,
        gdrive_download_link: gdriveDownloadLink,
        storage_provider: 'gdrive',
        target_departments: depts,
        uploaded_by: currentUser?.fullName || currentUser?.full_name || null,
        uploaded_by_id: currentUser?.id ? String(currentUser.id) : null,
        is_active: true,
      };

      if (editing) {
        const { error: updErr } = await supabase
          .from('hr_documents')
          .update(payload)
          .eq('id', editing.id);
        if (updErr) throw updErr;

        try {
          await supabase
            .from('company_news')
            .update({
              title: title.trim(),
              content: description.trim() || `Dokumen resmi HR: ${title.trim()}`,
              file_url: fileUrl,
              file_name: fileName || title.trim(),
            })
            .eq('file_url', editing.file_url);
        } catch (syncErr) {
          console.warn('Sync update company_news warning:', syncErr);
        }
      } else {
        const { error: insErr } = await supabase
          .from('hr_documents')
          .insert([payload]);
        if (insErr) throw insErr;

        try {
          await supabase.from('company_news').insert([{
            title: title.trim(),
            content: description.trim() || `Dokumen resmi HR: ${title.trim()}`,
            category: category === 'sk' ? 'holiday' : 'info',
            file_url: fileUrl,
            file_name: fileName || title.trim(),
            is_pinned: false,
            is_active: true,
            published_at: new Date().toISOString(),
          }]);
        } catch (syncErr) {
          console.warn('Sync insert company_news warning:', syncErr);
        }
      }

      onSaved();
    } catch (err: any) {
      console.error('Upload Google Drive error:', err);
      setError('Gagal menyimpan dokumen: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
      setUploadStatusMsg('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161a25] shadow-2xl border border-slate-200 dark:border-zinc-800 max-h-[92vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white dark:bg-[#161a25] border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Folder size={17} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-zinc-100 leading-tight">
                {editing ? 'Edit Dokumen' : 'Upload Dokumen HR'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Penyimpanan Aman di Google Drive Perusahaan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Switcher */}
          {!editing && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-[#0f121a] p-1 border border-slate-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  mode === 'upload'
                    ? 'bg-white dark:bg-[#1f2637] text-blue-600 dark:text-blue-400 shadow-xs border border-transparent dark:border-zinc-700/60'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                <Upload size={14} /> Upload ke GDrive
              </button>
              <button
                type="button"
                onClick={() => setMode('link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-all ${
                  mode === 'link'
                    ? 'bg-white dark:bg-[#1f2637] text-blue-600 dark:text-blue-400 shadow-xs border border-transparent dark:border-zinc-700/60'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                <LinkIcon size={14} /> Link Google Drive
              </button>
            </div>
          )}

          {/* Upload Dropzone */}
          {!editing && mode === 'upload' && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                  : file
                  ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30'
                  : 'border-slate-300 dark:border-zinc-700 bg-slate-50/60 dark:bg-[#11141e] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-100/60 dark:hover:bg-zinc-800/40'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.zip,.rar"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <>
                  <CheckCircle2 size={26} className="text-emerald-500" />
                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-xs">{file.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400">{formatFileSize(file.size)} • Siap diunggah ke Google Drive</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                    <Upload size={22} />
                  </div>
                  <div className="text-center">
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
                      Pilih file atau drag & drop ke sini
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      PDF, Word, Excel, JPG, PNG (Maks. 25 MB)
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mode Manual Link */}
          {!editing && mode === 'link' && (
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                Tautan Berbagi Google Drive <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                value={gdriveLink}
                onChange={e => setGdriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#10131c] px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                Pastikan akses file di Google Drive diatur ke "Siapa saja yang memiliki link" atau domain kantor.
              </p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Judul Dokumen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: SK Direksi No 05/2025 tentang Libur Bersama"
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#10131c] px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Ringkasan isi dokumen (opsional)..."
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#10131c] px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Kategori Dokumen <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={e => setCategory(e.target.value as DocCategory)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#10131c] px-3.5 py-2.5 pr-8 text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400"
              >
                {Object.entries(CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key} className="bg-white dark:bg-[#161a25] text-slate-900 dark:text-zinc-100">
                    {val.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            </div>
          </div>

          {/* Target Departments */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 dark:text-zinc-300 mb-1">
              Target Departemen <span className="text-[10px] font-normal text-slate-400 dark:text-zinc-500">(kosong = seluruh karyawan)</span>
            </label>
            <input
              type="text"
              value={targetDepts}
              onChange={e => setTargetDepts(e.target.value)}
              placeholder="Contoh: Operasional, IT, Finance (pisahkan dengan koma)"
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-[#10131c] px-3.5 py-2.5 text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-3.5 py-2.5 text-[12px] text-rose-700 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {uploading && uploadStatusMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 px-3.5 py-2.5 text-[12px] text-blue-700 dark:text-blue-300">
              <Loader2 size={15} className="animate-spin shrink-0" />
              {uploadStatusMsg}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 py-2.5 text-[13px] font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#12346A] hover:bg-[#1a4a8f] dark:bg-blue-600 dark:hover:bg-blue-500 py-2.5 text-[13px] font-bold text-white transition-colors disabled:opacity-50 shadow-sm"
            >
              {uploading ? (
                <><Loader2 size={15} className="animate-spin" /> Mengupload...</>
              ) : (
                <><Upload size={15} /> {editing ? 'Simpan Perubahan' : 'Upload ke GDrive'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HRDocumentsManager({ currentUser }: HRDocumentsManagerProps) {
  const [docs, setDocs] = useState<HRDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<DocCategory | 'all'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<HRDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<HRDocument | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('hr_documents')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDocs((data as HRDocument[]) || []);
    } catch (err) {
      console.error('Fetch docs error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleDelete = async (doc: HRDocument) => {
    if (!confirm(`Hapus dokumen "${doc.title}"? Tindakan ini tidak dapat diurungkan.`)) return;
    setDeleting(doc.id);
    try {
      const { error } = await supabase
        .from('hr_documents')
        .update({ is_active: false })
        .eq('id', doc.id);
      if (error) throw error;

      if (doc.file_url) {
        try {
          await supabase
            .from('company_news')
            .update({ is_active: false })
            .eq('file_url', doc.file_url);
        } catch (syncErr) {
          console.warn('Sync delete company_news warning:', syncErr);
        }
      }

      showToast('success', 'Dokumen berhasil dihapus.');
      fetchDocs();
    } catch (err: any) {
      showToast('error', 'Gagal menghapus: ' + (err.message || 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const filtered = docs.filter(d => {
    const matchCat = activeCategory === 'all' || d.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const categoryCount = (cat: DocCategory | 'all') =>
    cat === 'all' ? docs.length : docs.filter(d => d.category === cat).length;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-[#111520] p-5 sm:p-6 shadow-xs">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-[13px] font-semibold border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-700 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-700 dark:text-rose-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
            <Folder size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
                Dokumen & Files
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                Google Drive Storage
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Kelola dokumen resmi kantor di Google Drive agar dapat langsung dibuka dan diunduh karyawan di PWA Mobile
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { setEditingDoc(null); setShowModal(true); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#12346A] hover:bg-[#1a4a8f] dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-[13px] font-bold text-white transition-colors shadow-sm"
        >
          <Plus size={16} />
          Upload Dokumen
        </button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="mt-5 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul dokumen atau nama file..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-[#181d29] text-[13px] text-slate-900 dark:text-zinc-100 outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`flex-none px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all ${
              activeCategory === 'all'
                ? 'bg-[#12346A] dark:bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 dark:bg-[#181d29] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/80 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
          >
            Semua ({categoryCount('all')})
          </button>
          {(Object.keys(CATEGORIES) as DocCategory[]).map(catKey => {
            const count = categoryCount(catKey);
            const active = activeCategory === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveCategory(catKey)}
                className={`flex-none px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                  active
                    ? 'bg-[#12346A] dark:bg-blue-600 text-white shadow-xs font-bold'
                    : 'bg-slate-50 dark:bg-[#181d29] text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/80 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {CATEGORIES[catKey].label} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Grid */}
      <div className="mt-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-blue-600 dark:text-blue-400" />
            <p className="text-[13px] text-slate-400 dark:text-zinc-500">Memuat data dokumen...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
              <Folder size={28} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800 dark:text-zinc-200">
                {search ? 'Tidak ada dokumen yang cocok' : 'Belum ada dokumen'}
              </p>
              <p className="text-[12px] text-slate-400 dark:text-zinc-500 mt-1 max-w-sm">
                {search
                  ? 'Coba gunakan kata kunci pencarian yang lain atau ubah kategori filter.'
                  : 'Klik tombol "Upload Dokumen" untuk mengunggah dokumen baru ke Google Drive.'}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={() => { setEditingDoc(null); setShowModal(true); }}
                className="mt-1 flex items-center gap-2 rounded-xl bg-[#12346A] hover:bg-[#1a4a8f] dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2 text-[12px] font-bold text-white transition-colors"
              >
                <Plus size={14} /> Upload Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(doc => {
              const cat = CATEGORIES[doc.category] || CATEGORIES.umum;
              const Icon = getFileIcon(doc.file_name);
              const downloadUrl = getGDriveDownloadUrl(
                doc.file_url,
                doc.gdrive_file_id || doc.gdrive_download_link
              );

              return (
                <div
                  key={doc.id}
                  className="group flex flex-col rounded-2xl bg-white dark:bg-[#141824] border border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cat.bg}`}>
                      <Icon size={18} className={cat.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-slate-900 dark:text-zinc-100 leading-snug line-clamp-2">
                        {doc.title}
                      </div>
                      {doc.description && (
                        <div className="text-[11.5px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {doc.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${cat.bg} ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
                      GDrive
                    </span>
                    {doc.target_departments && doc.target_departments.length > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                        <Building2 size={9} />
                        {doc.target_departments.join(', ')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400">
                        <Users size={9} />
                        Semua karyawan
                      </span>
                    )}
                    {doc.file_size && (
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 self-center">
                        {formatFileSize(doc.file_size)}
                      </span>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="px-4 pb-3">
                    <div className="text-[11px] text-slate-400 dark:text-zinc-400 truncate" title={doc.file_name}>
                      {doc.file_name}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      Upload: {new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {doc.uploaded_by && ` • ${doc.uploaded_by}`}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-auto border-t border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-[#10131d] flex items-center divide-x divide-slate-100 dark:divide-zinc-800/80">
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(doc)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                    >
                      <Download size={13} /> Unduh
                    </a>
                    <button
                      type="button"
                      onClick={() => { setEditingDoc(doc); setShowModal(true); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc)}
                      disabled={deleting === doc.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    >
                      {deleting === doc.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* In-App Document Viewer Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#121622] border-b border-zinc-800 text-white shadow-md">
            <div className="min-w-0 flex-1 pr-4">
              <h3 className="text-[14px] font-bold truncate leading-tight">{previewDoc.title}</h3>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{previewDoc.file_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={getGDriveDownloadUrl(previewDoc.file_url, previewDoc.gdrive_file_id || previewDoc.gdrive_download_link)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold transition-colors shadow-xs"
              >
                <Download size={13} /> Unduh
              </a>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X size={17} />
              </button>
            </div>
          </div>
          <div className="flex-1 w-full h-full relative bg-zinc-950 flex items-center justify-center overflow-hidden">
            <iframe
              src={getGDrivePreviewUrl(previewDoc.file_url, previewDoc.gdrive_file_id)}
              title={previewDoc.title}
              className="w-full h-full border-0"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* Upload / Edit Modal */}
      {showModal && (
        <UploadModal
          onClose={() => { setShowModal(false); setEditingDoc(null); }}
          onSaved={() => {
            setShowModal(false);
            setEditingDoc(null);
            fetchDocs();
            showToast(
              'success',
              editingDoc
                ? 'Dokumen berhasil diperbarui.'
                : 'Dokumen berhasil diunggah ke Google Drive dan langsung tersedia di aplikasi mobile.'
            );
          }}
          currentUser={currentUser}
          editing={editingDoc}
        />
      )}
    </div>
  );
}
