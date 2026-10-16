import React, { useState, useEffect, useCallback } from 'react';
import { 
  Megaphone, 
  Pin, 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  PartyPopper, 
  CalendarDays, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  Upload, 
  Image as ImageIcon, 
  FolderOpen, 
  Loader2, 
  Settings, 
  HelpCircle 
} from '@/components/ui/icons';
import { supabase } from '../../lib/supabaseClient';
import { 
  uploadFileToGoogleDrive, 
  getGoogleDriveWebhookUrl, 
  setGoogleDriveWebhookUrl, 
  GOOGLE_APPS_SCRIPT_TEMPLATE 
} from '../../lib/googleDriveUpload';

export type NewsCategory = 'info' | 'holiday' | 'event';

export interface CompanyNewsItem {
  id: string;
  title: string;
  content: string;
  category: NewsCategory;
  event_date: string | null;
  is_pinned: boolean;
  is_active: boolean;
  file_url?: string | null;
  file_name?: string | null;
  image_url?: string | null;
  published_at: string;
  updated_at?: string;
}

interface CompanyNewsManagerProps {
  currentUser?: any;
}

const isGoogleDriveUrl = (url?: string | null) => {
  if (!url) return false;
  return url.includes('drive.google.com') || url.includes('docs.google.com');
};

const resolveGoogleDriveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  const clean = url.trim();
  if (!clean) return '';
  if (clean.startsWith('data:image/')) return clean;

  const driveMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }
  return clean;
};

const getGoogleDrivePreviewIframeUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const clean = url.trim();
  const driveMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  return null;
};

const CATEGORY_MAP: Record<NewsCategory, { label: string; bg: string; text: string; border: string; icon: typeof Info }> = {
  info: {
    label: 'Informasi HR',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
  },
  holiday: {
    label: 'Libur / SKB',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CalendarDays,
  },
  event: {
    label: 'Event Kantor',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: PartyPopper,
  },
};

const DEFAULT_NEWS_SAMPLE: CompanyNewsItem[] = [
  {
    id: 'sample-1',
    title: 'Surat Edaran: Kebijakan Libur Nasional & Cuti Bersama Tahun 2026',
    content: 'Diberitahukan kepada seluruh karyawan PT Gesit bahwa penetapan hari libur nasional dan cuti bersama tahun 2026 mengacu pada SKB 3 Menteri terbaru. Silakan mengunduh lampiran SK resmi pada link Google Drive tertera.',
    category: 'holiday',
    event_date: '2026-10-15',
    is_pinned: true,
    is_active: true,
    file_url: 'https://drive.google.com/file/d/sample-sk-libur-2026/view',
    file_name: 'SK_Libur_Nasional_Cuti_Bersama_2026.pdf',
    published_at: new Date().toISOString(),
  },
  {
    id: 'sample-2',
    title: 'Townhall Meeting Q4 2026 & Sosialisasi Sistem HCM',
    content: 'Acara Townhall seluruh unit bisnis Gesit Companies akan diselenggarakan pada akhir bulan. Kehadiran dapat dicatat melalui aplikasi absen mobile.',
    category: 'event',
    event_date: '2026-10-28',
    is_pinned: false,
    is_active: true,
    published_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const CompanyNewsManager: React.FC<CompanyNewsManagerProps> = ({ currentUser }) => {
  const [newsList, setNewsList] = useState<CompanyNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [filterCategory, setFilterCategory] = useState<'all' | NewsCategory>('all');
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CompanyNewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<NewsCategory>('info');
  const [eventDate, setEventDate] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState<string | null>(null);
  const [previewImgFailed, setPreviewImgFailed] = useState(false);

  // Google Drive Upload State
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocMsg, setUploadDocMsg] = useState('');
  const [gdriveConfigModal, setGdriveConfigModal] = useState(false);
  const [gdriveWebhookInput, setGdriveWebhookInput] = useState(getGoogleDriveWebhookUrl());
  const [copiedScript, setCopiedScript] = useState(false);

  // Fetch news from Supabase
  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_news')
        .select('*')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('not find the table')) {
          setTableExists(false);
          const saved = localStorage.getItem('gesit_company_news');
          if (saved) {
            try { setNewsList(JSON.parse(saved)); } catch (_) { setNewsList(DEFAULT_NEWS_SAMPLE); }
          } else {
            setNewsList(DEFAULT_NEWS_SAMPLE);
          }
        } else {
          console.warn('Error fetching company_news:', error);
        }
      } else if (data) {
        setTableExists(true);
        setNewsList(data as CompanyNewsItem[]);
      }
    } catch (err) {
      console.warn('fetchNews exception:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setContent('');
    setCategory('info');
    setEventDate('');
    setIsPinned(false);
    setFileUrl('');
    setFileName('');
    setImageUrl('');
    setErrorMsg('');
    setUploadDocMsg('');
    setModalOpen(true);
  };

  const openEditModal = (item: CompanyNewsItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setContent(item.content);
    setCategory(item.category);
    setEventDate(item.event_date || '');
    setIsPinned(item.is_pinned);
    setFileUrl(item.file_url || '');
    setFileName(item.file_name || '');
    setImageUrl(item.image_url || '');
    setErrorMsg('');
    setUploadDocMsg('');
    setModalOpen(true);
  };

  // Upload file SK otomatis (ke Google Drive Restricted)
  const handleAutoUploadSK = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadDocMsg('Mengunggah file ke Google Drive (Folder News)...');
    setErrorMsg('');

    try {
      const result = await uploadFileToGoogleDrive(file, {
        category: 'news_attachment',
        visibility: 'all_active',
        folderType: 'news_published',
        targetEmail: currentUser?.email,
      });
      if (result.success && result.fileUrl) {
        setFileUrl(result.fileUrl);
        setFileName(result.fileName || file.name);
        setUploadDocMsg(
          isGoogleDriveUrl(result.fileUrl)
            ? '✓ File berhasil diunggah ke Google Drive!'
            : '✓ File siap dilampirkan!'
        );
      } else {
        throw new Error(result.error || 'Gagal mengunggah file.');
      }
    } catch (err: any) {
      console.error('Upload SK error:', err);
      setErrorMsg('Gagal upload file: ' + err.message);
      setUploadDocMsg('');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 15 MB.');
      return;
    }

    setUploadingDoc(true);
    setUploadDocMsg('Mengunggah foto cover ke Google Drive (Folder News)...');
    setErrorMsg('');

    try {
      const result = await uploadFileToGoogleDrive(file, {
        category: 'news_image',
        visibility: 'all_active',
        folderType: 'news_published',
        targetEmail: currentUser?.email,
      });
      if (result.success && result.fileUrl) {
        setImageUrl(result.fileUrl);
        setUploadDocMsg('✓ Foto cover berhasil diunggah ke Google Drive!');
      } else {
        throw new Error(result.error || 'Gagal mengunggah foto.');
      }
    } catch (err: any) {
      console.error('Upload foto error:', err);
      setErrorMsg('Gagal upload foto: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Judul dan isi pengumuman wajib diisi.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    const cleanFileUrl = fileUrl.trim();
    let cleanFileName = fileName.trim();
    if (cleanFileUrl && !cleanFileName) {
      cleanFileName = isGoogleDriveUrl(cleanFileUrl) ? 'Dokumen_SK_Google_Drive.pdf' : 'Lampiran_SK.pdf';
    }

    const payload = {
      title: title.trim(),
      content: content.trim(),
      category,
      event_date: eventDate ? eventDate : null,
      is_pinned: isPinned,
      is_active: true,
      file_url: cleanFileUrl || null,
      file_name: cleanFileName || null,
      image_url: imageUrl.trim() || null,
      published_at: editingItem ? editingItem.published_at : new Date().toISOString(),
    };

    try {
      if (tableExists) {
        if (editingItem) {
          const { error } = await supabase
            .from('company_news')
            .update(payload)
            .eq('id', editingItem.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('company_news')
            .insert([payload]);
          if (error) throw error;
        }
        await fetchNews();
      } else {
        const updated = editingItem
          ? newsList.map(n => n.id === editingItem.id ? { ...n, ...payload } : n)
          : [{ id: 'news-' + Date.now(), ...payload }, ...newsList];
        setNewsList(updated);
        localStorage.setItem('gesit_company_news', JSON.stringify(updated));
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error('Save news error:', err);
      setErrorMsg('Gagal menyimpan pengumuman: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePin = async (item: CompanyNewsItem) => {
    const nextPinned = !item.is_pinned;
    try {
      if (tableExists) {
        await supabase
          .from('company_news')
          .update({ is_pinned: nextPinned })
          .eq('id', item.id);
        await fetchNews();
      } else {
        const updated = newsList.map(n => n.id === item.id ? { ...n, is_pinned: nextPinned } : n);
        setNewsList(updated);
        localStorage.setItem('gesit_company_news', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Toggle pin error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin mengarsipkan / menghapus pengumuman ini?')) return;
    try {
      if (tableExists) {
        await supabase
          .from('company_news')
          .update({ is_active: false })
          .eq('id', id);
        await fetchNews();
      } else {
        const updated = newsList.filter(n => n.id !== id);
        setNewsList(updated);
        localStorage.setItem('gesit_company_news', JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Delete news error:', err);
    }
  };

  const saveGdriveConfig = () => {
    setGoogleDriveWebhookUrl(gdriveWebhookInput.trim());
    setGdriveConfigModal(false);
  };

  const copyAppsScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const filteredNews = newsList.filter(item => {
    if (filterCategory === 'all') return true;
    return item.category === filterCategory;
  });

  const sqlMigrationCode = `-- Jalankan di Supabase SQL Editor sekali saja untuk mengaktifkan tabel company_news:
create table if not exists public.company_news (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 3 and 160),
  content text not null check (length(trim(content)) between 3 and 10000),
  category text not null default 'info' check (category in ('info', 'holiday', 'event')),
  event_date date,
  is_pinned boolean not null default false,
  is_active boolean not null default true,
  file_url text,
  file_name text,
  image_url text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_news add column if not exists file_url text;
alter table public.company_news add column if not exists file_name text;
alter table public.company_news add column if not exists image_url text;

alter table public.company_news enable row level security;
grant select, insert, update, delete on public.company_news to authenticated, anon;
create policy "Allow all on company_news" on public.company_news for all using (true) with check (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlMigrationCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#F1F5F9] dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#12346a]/10 dark:bg-blue-900/30 text-[#12346a] dark:text-blue-300">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                Pengumuman & News Karyawan
              </h3>
              <span className="rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                Auto-Save ke Google Drive
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Upload file SK atau foto resmi dari HCM. File tersimpan otomatis di Google Drive dan langsung tampil di mobile app karyawan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setGdriveWebhookInput(getGoogleDriveWebhookUrl());
              setGdriveConfigModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Konfigurasi Folder Google Drive"
          >
            <Settings className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Set Google Drive</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#12346a] hover:bg-[#0e2752] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>
      </div>

      {/* Database activation alert if table is not yet migrated */}
      {!tableExists && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Tabel Database Supabase Belum Aktif
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  Tabel <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono text-[10px]">public.company_news</code> belum ditemukan di Supabase. Anda dapat menjalankannya di Supabase SQL Editor agar pengumuman tersimpan di server.
                </p>
              </div>
            </div>
            <button
              onClick={copySql}
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 px-3 py-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100/50 transition-colors cursor-pointer"
            >
              {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <button
          onClick={() => setFilterCategory('all')}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterCategory === 'all'
              ? 'bg-[#12346a] text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          Semua ({newsList.length})
        </button>
        <button
          onClick={() => setFilterCategory('info')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterCategory === 'info'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          <span>Informasi HR ({newsList.filter(n => n.category === 'info').length})</span>
        </button>
        <button
          onClick={() => setFilterCategory('holiday')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterCategory === 'holiday'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Libur / SKB ({newsList.filter(n => n.category === 'holiday').length})</span>
        </button>
        <button
          onClick={() => setFilterCategory('event')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
            filterCategory === 'event'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#64748B] hover:text-[#0F172A] dark:hover:text-white border border-[#E2E8F0] dark:border-slate-700'
          }`}
        >
          <PartyPopper className="h-3.5 w-3.5" />
          <span>Event Kantor ({newsList.filter(n => n.category === 'event').length})</span>
        </button>
      </div>

      {/* News Items List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#64748B]">Memuat pengumuman...</div>
        ) : filteredNews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#CBD5E1] dark:border-slate-800 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-[#94A3B8]" />
            <div className="mt-2 text-xs font-bold text-[#0F172A] dark:text-slate-200">
              Belum Ada Pengumuman
            </div>
            <p className="mt-1 text-[11px] text-[#64748B] dark:text-slate-400">
              Klik tombol "Buat Pengumuman Baru" untuk upload file SK ke Google Drive atau posting pengumuman.
            </p>
          </div>
        ) : (
          filteredNews.map((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.info;
            const Icon = cat.icon;
            const isGDrive = isGoogleDriveUrl(item.file_url);

            return (
              <div
                key={item.id}
                className={`group rounded-xl border p-4.5 transition-all ${
                  item.is_pinned
                    ? 'border-[#12346a]/30 bg-blue-50/30 dark:bg-blue-950/10'
                    : 'border-[#E2E8F0] dark:border-slate-800 bg-[#FAFAFA] dark:bg-slate-800/40 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Content and attachments */}
                  <div className="flex-1 space-y-2">
                    {/* Badges bar */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${cat.bg} ${cat.text} ${cat.border}`}>
                        <Icon className="h-3 w-3" />
                        <span>{cat.label}</span>
                      </span>

                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold">
                          <Pin className="h-3 w-3 fill-current" />
                          <span>Disematkan di Atas</span>
                        </span>
                      )}

                      {item.event_date && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#64748B] dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>Tanggal: {new Date(item.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </span>
                      )}

                      <span className="text-[10px] text-[#94A3B8]">
                        · Dipublish {new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 group-hover:text-[#12346a] dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>

                    {/* Content Snippet */}
                    <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed whitespace-pre-line line-clamp-3">
                      {item.content}
                    </p>

                    {/* Attachments Section: SK File (Google Drive) & Photo */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {item.file_url && (
                        <a
                          href={item.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            isGDrive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                          }`}
                        >
                          {isGDrive ? (
                            <FolderOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                          )}
                          <span>
                            {item.file_name || (isGDrive ? 'Buka SK di Google Drive' : 'Buka Dokumen SK')}
                          </span>
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </a>
                      )}

                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewPhotoModal(item.image_url || null);
                            setPreviewImgFailed(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-800 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 transition-colors cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          <span>Lihat Foto / Banner SK</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-start">
                    <button
                      onClick={() => handleTogglePin(item)}
                      title={item.is_pinned ? 'Lepaskan Sematan' : 'Sematkan ke Atas'}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                        item.is_pinned
                          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <Pin className={`h-3.5 w-3.5 ${item.is_pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      title="Edit Pengumuman"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Arsipkan / Hapus"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Preview Foto */}
      {previewPhotoModal && (() => {
        const directImageUrl = resolveGoogleDriveImageUrl(previewPhotoModal);
        const iframeUrl = getGoogleDrivePreviewIframeUrl(previewPhotoModal);
        const isDrive = isGoogleDriveUrl(previewPhotoModal);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
              {/* Header Modal */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pratinjau Foto / Lampiran SK</h3>
                    <p className="text-[11px] text-slate-500">
                      {isDrive ? 'Tersimpan di Google Drive' : 'Dokumen Foto / Gambar'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={previewPhotoModal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 text-xs font-semibold transition-colors"
                  >
                    <span>Buka Link Asli</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      setPreviewPhotoModal(null);
                      setPreviewImgFailed(false);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Image / Iframe Container */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/5 min-h-[350px]">
                {!previewImgFailed ? (
                  <img
                    src={directImageUrl}
                    alt="Lampiran SK"
                    onError={() => setPreviewImgFailed(true)}
                    className="max-h-[75vh] w-auto max-w-full mx-auto object-contain rounded-xl shadow-xs"
                  />
                ) : iframeUrl ? (
                  <iframe
                    src={iframeUrl}
                    title="Pratinjau Dokumen Google Drive"
                    className="w-full h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                    allow="autoplay"
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="inline-flex p-3 rounded-full bg-amber-100 text-amber-700">
                      <AlertCircle className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Gambar tidak dapat ditampilkan langsung di browser
                    </p>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      File di Google Drive mungkin memiliki batasan akses atau berformat dokumen. Anda dapat membukanya langsung di Google Drive.
                    </p>
                    <a
                      href={previewPhotoModal}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-colors"
                    >
                      <span>Buka di Google Drive</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Pengaturan Google Drive Auto-Save */}
      {gdriveConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pengaturan Auto-Save Google Drive
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Otomatis menyimpan file upload langsung ke folder Google Drive perusahaan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGdriveConfigModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Google Apps Script Webhook URL
                </label>
                <input
                  type="url"
                  value={gdriveWebhookInput}
                  onChange={e => setGdriveWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Jika sudah diisi, setiap file yang di-upload dari sistem HCM akan otomatis terkirim dan tersimpan di folder Google Drive Anda.
                </p>
              </div>

              {/* Panduan 1-Menit Pasang */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2 text-blue-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <HelpCircle className="h-4 w-4 text-blue-600" />
                    <span>Cara Pasang Google Apps Script (Gratis & 1 Menit)</span>
                  </div>
                  <button
                    type="button"
                    onClick={copyAppsScript}
                    className="inline-flex items-center gap-1 bg-white border border-blue-300 rounded-md px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    {copiedScript ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedScript ? 'Tersalin!' : 'Salin Script Google'}</span>
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-800 leading-relaxed">
                  <li>Buka <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold">script.google.com</a> lalu klik <strong>New Project</strong>.</li>
                  <li>Klik tombol <strong>Salin Script Google</strong> di atas, lalu tempelkan (paste) ke script editor.</li>
                  <li>Klik <strong>Deploy &rarr; New deployment</strong> &rarr; pilih type <strong>Web app</strong>.</li>
                  <li>Set <em>Execute as:</em> <strong>Me</strong>, dan <em>Who has access:</em> <strong>Anyone</strong>.</li>
                  <li>Klik <strong>Deploy</strong>, lalu salin Web App URL dan tempelkan pada kolom di atas!</li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGdriveConfigModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={saveGdriveConfig}
                  className="rounded-xl bg-[#12346a] px-5 py-2 font-semibold text-white hover:bg-[#0e2752]"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#12346a] text-white">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Upload file SK langsung dari HCM atau tempel link Google Drive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Judul */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Pengumuman <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Contoh: SK Libur Nasional & Cuti Bersama 2026"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                />
              </div>

              {/* Kategori & Tanggal Event */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kategori <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as NewsCategory)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                  >
                    <option value="info">📢 Informasi HR</option>
                    <option value="holiday">🏖️ Libur / SKB (Tanggal Merah)</option>
                    <option value="event">🎯 Event Kantor / Kegiatan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tanggal Kegiatan / Libur (Opsional)
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={e => setEventDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                  />
                </div>
              </div>

              {/* SECTION: Upload File SK (Auto-Save ke Google Drive) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FolderOpen className="h-4 w-4 text-emerald-600" />
                    <span>File SK / Dokumen Resmi (Google Drive / PDF)</span>
                  </div>
                  {isGoogleDriveUrl(fileUrl) && (
                    <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5">
                      ✓ Google Drive Terhubung
                    </span>
                  )}
                </div>

                {/* Direct Upload Button */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors shadow-2xs">
                    {uploadingDoc ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>{uploadingDoc ? 'Mengunggah ke Google Drive...' : 'Upload File SK dari Komputer'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf"
                      disabled={uploadingDoc}
                      onChange={handleAutoUploadSK}
                      className="hidden"
                    />
                  </label>

                  <span className="text-[11px] text-slate-400">atau paste link Google Drive langsung:</span>
                </div>

                {uploadDocMsg && (
                  <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {uploadDocMsg}
                  </p>
                )}

                {/* Input Link / File URL */}
                <div>
                  <input
                    type="url"
                    value={fileUrl}
                    onChange={e => setFileUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... atau hasil upload"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                  />
                </div>

                {fileUrl && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Nama Tampilan File Dokumen
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder="Contoh: SK_Direksi_Tahun_Baru_2026.pdf"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                    />
                  </div>
                )}
              </div>

              {/* Section Foto / Banner SK */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ImageIcon className="h-4 w-4 text-purple-600" />
                  <span>Foto / Poster Acara / Banner SK (Opsional)</span>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Pilih Foto dari Komputer</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">atau paste link gambar di bawah:</span>
                  </div>

                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://.../foto-sk.jpg atau data image"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a]"
                  />

                  {imageUrl && (
                    <div className="mt-2 relative inline-block">
                      <img
                        src={resolveGoogleDriveImageUrl(imageUrl)}
                        alt="Preview"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="h-24 w-auto rounded-lg object-cover border border-slate-300 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 text-white p-0.5 hover:bg-rose-700 cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Is Pinned Checkbox */}
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 p-3">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#12346a] focus:ring-[#12346a]"
                />
                <label htmlFor="is_pinned" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-1.5">
                  <Pin className="h-3.5 w-3.5 text-amber-500" />
                  <span>Sematkan ke bagian atas beranda mobile karyawan (Pin to top)</span>
                </label>
              </div>

              {/* Isi Pengumuman */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Isi / Detail Pengumuman <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Tuliskan isi pengumuman atau instruksi resmi HR secara lengkap di sini..."
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#12346a]/20 focus:border-[#12346a] leading-relaxed resize-y"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingDoc}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#12346a] hover:bg-[#0e2752] px-5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{editingItem ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
