-- ==============================================================================
-- GESIT HCM & APP-ABSEN — AKTIVASI STORAGE MEDICAL-DOCS & PERMISSION NEWS
-- File: supabase/FINAL_STORAGE_AND_PERMISSIONS.sql
-- Jalankan di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/oyhwtleoftbiyabsgjsu/sql/new
-- ==============================================================================

-- 1. Buat Bucket Storage 'medical-docs' untuk Upload Bukti Reimbursement / Medis
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-docs', 'medical-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Medical docs access" ON storage.objects;
CREATE POLICY "Medical docs access" ON storage.objects
FOR ALL TO authenticated, anon
USING (bucket_id = 'medical-docs')
WITH CHECK (bucket_id = 'medical-docs');

-- 2. Izin Akses Tabel company_news (Berita & Pengumuman Perusahaan di Mobile & Web)
CREATE TABLE IF NOT EXISTS public.company_news (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text,
  category text DEFAULT 'general',
  is_pinned boolean DEFAULT false,
  is_active boolean DEFAULT true,
  author text,
  author_id text,
  file_url text,
  file_name text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_news ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_news TO authenticated, anon;

DROP POLICY IF EXISTS "Allow all on company_news" ON public.company_news;
CREATE POLICY "Allow all on company_news" ON public.company_news
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);
