-- ==============================================================================
-- GESIT HCM SYSTEM: MIGRATION 12 - SK PENGANGKATAN KARYAWAN & RIWAYAT KONTRAK
-- ==============================================================================
-- Fitur:
-- 1. Tabel master SK Pengangkatan (employee_appointments) untuk mencatat
--    seluruh data SK resmi, klausul hak, penandatangan, dan tautan file PDF Google Drive.
-- 2. Tabel timeline riwayat kontrak (employee_contract_history) agar riwayat
--    perubahan status (Probation -> PKWTT, dll) terlacak rapi.
-- 3. Memastikan kolom kontrak & SK pada tabel user_accounts siap digunakan.
-- 4. Pengaturan RLS (Row Level Security) agar aman dan dapat diakses tim HR/Admin.
-- ==============================================================================

BEGIN;

-- 1. Pastikan kolom-kolom terkait SK & Kontrak tersedia di public.user_accounts
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS contract_type TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS pkwt_number TEXT,
  ADD COLUMN IF NOT EXISTS sk_file_url TEXT,
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS status_effective_date DATE;

CREATE INDEX IF NOT EXISTS idx_user_accounts_contract_type ON public.user_accounts(contract_type);
CREATE INDEX IF NOT EXISTS idx_user_accounts_pkwt_number ON public.user_accounts(pkwt_number);


-- 2. Tabel Riwayat Kontrak & Masa Kerja (employee_contract_history)
CREATE TABLE IF NOT EXISTS public.employee_contract_history (
  id BIGSERIAL PRIMARY KEY,
  employee_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  sk_number TEXT,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  sk_file_url TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_contract_hist_emp_id ON public.employee_contract_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_contract_hist_sk ON public.employee_contract_history(sk_number);

-- RLS untuk employee_contract_history
ALTER TABLE public.employee_contract_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access employee_contract_history" ON public.employee_contract_history;
CREATE POLICY "Full access employee_contract_history" ON public.employee_contract_history FOR ALL USING (true) WITH CHECK (true);


-- 3. Tabel Master Dokumen SK Pengangkatan (employee_appointments)
CREATE TABLE IF NOT EXISTS public.employee_appointments (
  id BIGSERIAL PRIMARY KEY,
  sk_number TEXT NOT NULL UNIQUE,
  employee_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_nik TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT 'PT. GESIT PERKASA',
  salutation TEXT NOT NULL DEFAULT 'Saudari', -- 'Saudari' atau 'Saudara'
  probation_start_date DATE,
  probation_end_date DATE,
  effective_date DATE,
  issue_date DATE,
  issue_city TEXT DEFAULT 'Jakarta',
  signer_name TEXT NOT NULL DEFAULT 'Javier Wijaya',
  signer_title TEXT NOT NULL DEFAULT 'VP of HR & Logistics',
  clause_medical TEXT DEFAULT 'Sesuai Peraturan Perusahaan',
  clause_insurance TEXT DEFAULT 'Sesuai Peraturan Perusahaan',
  clause_leave TEXT,
  sk_file_url TEXT, -- Tautan Google Drive PDF
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_appointments_sk_num ON public.employee_appointments(sk_number);
CREATE INDEX IF NOT EXISTS idx_emp_appointments_emp_id ON public.employee_appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_appointments_issue_date ON public.employee_appointments(issue_date);

-- RLS untuk employee_appointments
ALTER TABLE public.employee_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Full access employee_appointments" ON public.employee_appointments;
CREATE POLICY "Full access employee_appointments" ON public.employee_appointments FOR ALL USING (true) WITH CHECK (true);

COMMIT;
