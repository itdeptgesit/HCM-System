-- 24_add_company_logo_and_color.sql
-- Menambahkan kolom logo_url dan color pada tabel companies untuk Master Company

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS color text DEFAULT '#12346a';

-- Pastikan izin akses CRUD tetap terbuka untuk anon & authenticated sesuai skema app-hr
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated, anon;
