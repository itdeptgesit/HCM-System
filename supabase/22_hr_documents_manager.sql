-- ==============================================================================
-- GESIT HCM — HR Documents Manager (Google Drive Enterprise Storage)
-- File: supabase/22_hr_documents_manager.sql
-- Jalankan di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oyhwtleoftbiyabsgjsu/sql/new
-- ==============================================================================

-- 1. Buat tabel hr_documents (Penyimpanan Utama: Google Drive Perusahaan)
CREATE TABLE IF NOT EXISTS public.hr_documents (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title                text NOT NULL,
  description          text,
  category             text NOT NULL DEFAULT 'umum',
  -- Kategori: 'sk' | 'kebijakan' | 'form' | 'sop' | 'pengumuman' | 'umum'
  file_url             text NOT NULL, -- Google Drive webViewLink / view URL
  file_name            text NOT NULL,
  file_size            bigint,
  gdrive_file_id       text,          -- Google Drive File ID
  gdrive_download_link text,          -- Google Drive Direct Download URL
  storage_provider     text DEFAULT 'gdrive',
  -- Target departemen: null / kosong = semua karyawan, atau array nama departemen
  target_departments   text[] DEFAULT NULL,
  is_active            boolean DEFAULT true,
  uploaded_by          text,
  uploaded_by_id       text,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

-- Tambahkan kolom jika tabel sudah sempat dibuat sebelumnya
ALTER TABLE public.hr_documents ADD COLUMN IF NOT EXISTS gdrive_file_id text;
ALTER TABLE public.hr_documents ADD COLUMN IF NOT EXISTS gdrive_download_link text;
ALTER TABLE public.hr_documents ADD COLUMN IF NOT EXISTS storage_provider text DEFAULT 'gdrive';
ALTER TABLE public.hr_documents ADD COLUMN IF NOT EXISTS target_departments text[] DEFAULT NULL;
ALTER TABLE public.hr_documents ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Indexes untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_hr_documents_category ON public.hr_documents(category);
CREATE INDEX IF NOT EXISTS idx_hr_documents_is_active ON public.hr_documents(is_active);
CREATE INDEX IF NOT EXISTS idx_hr_documents_created_at ON public.hr_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_documents_gdrive_id ON public.hr_documents(gdrive_file_id);

-- RLS (Row Level Security)
ALTER TABLE public.hr_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_documents TO authenticated, anon;

DROP POLICY IF EXISTS "HR documents all access" ON public.hr_documents;
CREATE POLICY "HR documents all access" ON public.hr_documents
  FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_hr_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_hr_documents_updated_at ON public.hr_documents;
CREATE TRIGGER tr_hr_documents_updated_at
  BEFORE UPDATE ON public.hr_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hr_documents_updated_at();

-- Catatan:
-- File dokumen disimpan secara terpusat di Google Drive Perusahaan melalui
-- Supabase Edge Function 'upload-to-gdrive' (Service Account Server-to-Server)
-- atau Webhook Google Apps Script yang sudah terpasang.
