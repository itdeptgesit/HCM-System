-- ==============================================================================
-- GESIT HCM — DOKUMEN & GOOGLE DRIVE METADATA SCHEMA + STRICT RLS POLICIES
-- File: supabase/04_hcm_documents.sql
-- ==============================================================================

-- 1. Helper Function: Ambil email user yang sedang login (dari JWT atau session)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::json->>'email', ''),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  )::text;
$$;

-- 2. Helper Function: Ambil ID karyawan (user_accounts.id) dari sesi yang login
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM public.user_accounts 
  WHERE email = public.get_current_user_email() 
     OR auth_id = auth.uid()
  LIMIT 1;
$$;

-- 3. Helper Function: Periksa apakah user yang login adalah HR / Admin Aktif
CREATE OR REPLACE FUNCTION public.is_active_hr()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_role text;
  v_status text;
  v_groups text[];
BEGIN
  SELECT role, status, groups INTO v_role, v_status, v_groups
  FROM public.user_accounts
  WHERE email = public.get_current_user_email() OR auth_id = auth.uid()
  LIMIT 1;
  
  IF v_status IS NULL OR LOWER(v_status) NOT IN ('active', 'on leave') THEN
    RETURN false;
  END IF;
  
  IF LOWER(v_role) IN ('super admin', 'admin', 'hr manager', 'hr staff', 'super_admin') THEN
    RETURN true;
  END IF;
  
  IF v_groups && ARRAY['hr', 'hrd', 'admin', 'super_admin']::text[] THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- 4. Helper Function: Periksa apakah user yang login adalah karyawan aktif terdaftar
CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_accounts
    WHERE (email = public.get_current_user_email() OR auth_id = auth.uid())
      AND LOWER(status) IN ('active', 'on leave')
  );
$$;

-- ==============================================================================
-- 5. TABEL HCM_DOCUMENTS (Metadata Dokumen Google Drive & Pengaturan Akses)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hcm_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    uploader_id BIGINT REFERENCES public.user_accounts(id) ON DELETE SET NULL,
    gdrive_file_id TEXT NOT NULL,
    gdrive_web_view_link TEXT NOT NULL,
    gdrive_download_link TEXT,
    folder_id TEXT,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    category TEXT NOT NULL CHECK (category IN (
        'ktp', 'ijazah', 'sk_karyawan', 'bpjs', 'foto_profil',
        'news_attachment', 'news_image', 'sk_perusahaan', 'internal_hr'
    )),
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'all_active', 'hr_only')),
    status TEXT NOT NULL CHECK (status IN ('processing', 'draft', 'published', 'failed', 'deleted')) DEFAULT 'published',
    target_email TEXT,
    permissions_metadata JSONB DEFAULT '[]'::JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_private_has_employee CHECK (
        visibility != 'private' OR employee_id IS NOT NULL
    )
);

-- Indexing untuk query berkecepatan tinggi
CREATE INDEX IF NOT EXISTS idx_hcm_documents_employee_id ON public.hcm_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_hcm_documents_category ON public.hcm_documents(category);
CREATE INDEX IF NOT EXISTS idx_hcm_documents_visibility ON public.hcm_documents(visibility);
CREATE INDEX IF NOT EXISTS idx_hcm_documents_status ON public.hcm_documents(status);
CREATE INDEX IF NOT EXISTS idx_hcm_documents_gdrive_file_id ON public.hcm_documents(gdrive_file_id);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.hcm_documents ENABLE ROW LEVEL SECURITY;

-- Bersihkan policy lama jika ada
DROP POLICY IF EXISTS "hcm_docs_select_policy" ON public.hcm_documents;
DROP POLICY IF EXISTS "hcm_docs_insert_policy" ON public.hcm_documents;
DROP POLICY IF EXISTS "hcm_docs_update_policy" ON public.hcm_documents;
DROP POLICY IF EXISTS "hcm_docs_delete_policy" ON public.hcm_documents;

-- A. SELECT POLICY:
-- 1. HR aktif dapat membaca semua dokumen (pribadi, internal, draft, published).
-- 2. Karyawan aktif dapat membaca:
--    - Dokumen pribadinya sendiri (employee_id = get_current_employee_id()).
--    - Dokumen umum berstatus 'published' dengan visibility = 'all_active' (News, SK terbit).
-- 3. Karyawan nonaktif / pihak luar: ditolak (tidak bisa melihat apapun).
CREATE POLICY "hcm_docs_select_policy" ON public.hcm_documents
FOR SELECT USING (
  -- HR Aktif memiliki hak baca penuh
  public.is_active_hr() = true
  OR
  (
    -- Karyawan aktif hanya dapat melihat dokumen miliknya atau dokumen terbit untuk seluruh karyawan
    public.is_active_employee() = true
    AND (
      (visibility = 'private' AND employee_id = public.get_current_employee_id())
      OR
      (visibility = 'all_active' AND status = 'published')
    )
  )
);

-- B. INSERT POLICY:
-- 1. HR aktif dapat mengunggah dokumen apapun.
-- 2. Karyawan aktif hanya dapat mengunggah dokumen pribadi untuk dirinya sendiri (visibility = 'private').
CREATE POLICY "hcm_docs_insert_policy" ON public.hcm_documents
FOR INSERT WITH CHECK (
  public.is_active_hr() = true
  OR
  (
    public.is_active_employee() = true
    AND visibility = 'private'
    AND employee_id = public.get_current_employee_id()
  )
);

-- C. UPDATE POLICY:
-- 1. HR aktif dapat memperbarui metadata, visibilitas, dan status publikasi.
-- 2. Karyawan aktif hanya dapat memperbarui catatan dokumen pribadi miliknya sendiri,
--    tidak boleh memanipulasi visibility, status, atau memindahkan owner ke orang lain.
CREATE POLICY "hcm_docs_update_policy" ON public.hcm_documents
FOR UPDATE USING (
  public.is_active_hr() = true
  OR
  (
    public.is_active_employee() = true
    AND visibility = 'private'
    AND employee_id = public.get_current_employee_id()
  )
) WITH CHECK (
  public.is_active_hr() = true
  OR
  (
    public.is_active_employee() = true
    AND visibility = 'private'
    AND employee_id = public.get_current_employee_id()
  )
);

-- D. DELETE POLICY:
-- Hanya HR aktif yang berwenang menghapus dokumen HCM.
CREATE POLICY "hcm_docs_delete_policy" ON public.hcm_documents
FOR DELETE USING (
  public.is_active_hr() = true
);
