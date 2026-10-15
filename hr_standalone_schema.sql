-- ==============================================================================
-- GESIT HRIS / HCM — COMPLETE STANDALONE DATABASE SCHEMA & MIGRATION
-- Dedicated PostgreSQL / Supabase Schema for Human Resources, Payroll, & Attendance
-- Idempotent script: Safe to run on fresh or existing databases
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. MASTER ORGANISASI (COMPANIES & DEPARTMENTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departments (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    company_id BIGINT REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. USER ACCOUNTS & EMPLOYEES (CORE HR TABLE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Employee',
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migrasi kolom jika user_accounts sudah pernah dibuat sebelumnya
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS auth_id UUID;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Employee';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS groups TEXT[] DEFAULT ARRAY['employee']::TEXT[];

-- Organisasi
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'The Gesit Companies';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS job_level TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS grade_class TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS employee_code TEXT UNIQUE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Status Kepegawaian
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'Active';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS status_effective_date DATE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS separation_date DATE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS separation_reason TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'PKWT';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS contract_type TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS pkwt_number TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- Kontak & Alamat
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS e_sign_url TEXT;

-- Biodata
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS birth_place TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS marital_status TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS blood_type TEXT;

-- Legalitas & Pajak
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS passport_number TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS npwp TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bpjs_tk_number TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bpjs_health_number TEXT;

-- Data Pendidikan
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS last_education TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS major TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS graduation_year TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS education_start_year TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS gpa TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS diploma_number TEXT;

-- Dokumen Karyawan (Google Drive)
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS ktp_file_url TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS ijazah_file_url TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS sk_file_url TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bpjs_file_url TEXT;

-- Payroll & Rekening
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS payroll_status TEXT DEFAULT 'Active';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'BCA';
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bank_account_name TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS tax_status TEXT DEFAULT 'TK/0';

-- Hierarki & Approval Presensi
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS supervisor_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS manager_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS vp_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS attendance_supervisor_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS attendance_hr_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS attendance_manager_id BIGINT;
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS attendance_vp_id BIGINT;

-- Metadata
ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Indeks
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON public.user_accounts (role);
CREATE INDEX IF NOT EXISTS idx_user_accounts_emp_code ON public.user_accounts (employee_code);

-- ==============================================================================
-- 4. RIWAYAT MUTASI & PROMOSI (CAREER / TRANSFER HISTORY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_transfer_history (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    transfer_type TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_company TEXT,
    new_company TEXT,
    previous_department TEXT,
    new_department TEXT,
    previous_job_title TEXT,
    new_job_title TEXT,
    sk_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward-compat table alias
CREATE TABLE IF NOT EXISTS public.employee_transfer_histories (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT,
    transfer_type TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    previous_company TEXT,
    new_company TEXT,
    previous_department TEXT,
    new_department TEXT,
    previous_job_title TEXT,
    new_job_title TEXT,
    sk_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4B. RIWAYAT KONTRAK & SK KERJA (CONTRACT & PKWT TIMELINE)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_emp_contract_hist_emp_id ON public.employee_contract_history (employee_id);
ALTER TABLE public.employee_contract_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access employee_contract_history" ON public.employee_contract_history;
CREATE POLICY "Public full access employee_contract_history" ON public.employee_contract_history FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 5. KALENDER LIBUR & CUTI BERSAMA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.company_holidays (
    id BIGSERIAL PRIMARY KEY,
    holiday_date DATE NOT NULL,
    holiday_name TEXT,
    name TEXT,
    holiday_type TEXT NOT NULL DEFAULT 'national_holiday',
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS holiday_name TEXT;
ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS deduct_annual_leave BOOLEAN DEFAULT false;
ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'company_policy';
ALTER TABLE public.company_holidays ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.company_holidays ALTER COLUMN year DROP NOT NULL;
ALTER TABLE public.company_holidays ALTER COLUMN year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT;

-- Update name dari holiday_name jika salah satu kosong
UPDATE public.company_holidays SET name = holiday_name WHERE name IS NULL AND holiday_name IS NOT NULL;
UPDATE public.company_holidays SET holiday_name = name WHERE holiday_name IS NULL AND name IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_holidays_holiday_date_name_key'
  ) THEN
    BEGIN
      ALTER TABLE public.company_holidays ADD CONSTRAINT company_holidays_holiday_date_name_key UNIQUE (holiday_date, name);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON public.company_holidays (holiday_date);

-- ==============================================================================
-- 6. LOKASI KANTOR (OFFICE LOCATIONS / GEOFENCING)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.office_locations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 150,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias compatibility table
CREATE TABLE IF NOT EXISTS public.attendance_offices (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 150,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. JADWAL & PENGATURAN PRESENSI
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_schedules (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL DEFAULT 'Jam Kerja Fleksibel',
    work_start TIME DEFAULT '07:00:00',
    work_end TIME DEFAULT '10:00:00',
    grace_period_minutes INTEGER DEFAULT 180,
    is_flexible BOOLEAN NOT NULL DEFAULT true,
    flex_start TIME DEFAULT '07:00:00',
    flex_end TIME DEFAULT '10:00:00',
    required_work_hours NUMERIC DEFAULT 9,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_schedules 
    ADD COLUMN IF NOT EXISTS is_flexible BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS flex_start TIME NOT NULL DEFAULT '07:00:00',
    ADD COLUMN IF NOT EXISTS flex_end TIME NOT NULL DEFAULT '10:00:00',
    ADD COLUMN IF NOT EXISTS required_work_hours NUMERIC NOT NULL DEFAULT 9;

CREATE TABLE IF NOT EXISTS public.attendance_settings (
    id BIGSERIAL PRIMARY KEY,
    allow_wfh BOOLEAN DEFAULT true,
    require_selfie BOOLEAN DEFAULT true,
    require_location BOOLEAN DEFAULT true,
    max_radius_meters INTEGER DEFAULT 200,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. DATA PRESENSI HARIAN (ATTENDANCE RECORDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE SET NULL,
    employee_id BIGINT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    check_in_lat DOUBLE PRECISION,
    check_in_lng DOUBLE PRECISION,
    check_in_photo_url TEXT,
    check_in_address TEXT,
    check_out_lat DOUBLE PRECISION,
    check_out_lng DOUBLE PRECISION,
    check_out_photo_url TEXT,
    check_out_address TEXT,
    status TEXT NOT NULL DEFAULT 'Present',
    work_duration_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS employee_id BIGINT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_photo_url TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_in_address TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_photo_url TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS check_out_address TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Present';
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS work_duration_minutes INTEGER DEFAULT 0;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records (date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON public.attendance_records (user_id);

-- ==============================================================================
-- 9. PENGAJUAN (CUTI, LEMBUR, KOREKSI PRESENSI, REIMBURSEMENT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL DEFAULT 'Tahunan',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) DEFAULT 1,
    reason TEXT NOT NULL,
    attachment_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.overtime_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours NUMERIC(4,2) DEFAULT 0,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    attendance_date DATE,
    date DATE,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    requested_check_in TIMESTAMPTZ,
    requested_check_out TIMESTAMPTZ,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id TEXT,
    reviewer_note TEXT,
    approved_by TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_correction_requests
    ADD COLUMN IF NOT EXISTS attendance_date DATE,
    ADD COLUMN IF NOT EXISTS clock_in_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clock_out_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS requested_check_in TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS requested_check_out TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reviewer_id TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_note TEXT,
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.reimbursements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'Medical',
    amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    description TEXT,
    receipt_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    approved_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attendance_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    request_date DATE,
    type TEXT DEFAULT 'dinas',
    start_date DATE,
    end_date DATE,
    total_days NUMERIC(4,1) DEFAULT 1,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    photo_url TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reviewer_id TEXT,
    reviewer_note TEXT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance_requests
    ADD COLUMN IF NOT EXISTS request_date DATE,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_id TEXT,
    ADD COLUMN IF NOT EXISTS reviewer_note TEXT,
    ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.attendance_request_settings (
    id BOOLEAN PRIMARY KEY DEFAULT true CHECK(id),
    period_type TEXT NOT NULL DEFAULT 'weekly',
    period_days INTEGER NOT NULL DEFAULT 7,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

INSERT INTO public.attendance_request_settings (id, period_type, period_days, enabled)
VALUES (true, 'weekly', 7, true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 10. AUDIT LOGS & COMPATIBILITY TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.company_employees (
    id BIGSERIAL PRIMARY KEY,
    user_account_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    employee_code TEXT,
    full_name TEXT NOT NULL,
    department TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 11. RPC FUNCTION: NEXT EMPLOYEE CODE GENERATOR
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.next_employee_code(p_join_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    v_date DATE := COALESCE(p_join_date, CURRENT_DATE);
    v_prefix TEXT := TO_CHAR(v_date, 'YYMM');
    v_count INT;
    v_seq TEXT;
BEGIN
    -- Nomor urut global 4 digit, baseline terakhir 0391 (next: 0392)
    SELECT COALESCE(
        MAX(
            CASE 
                WHEN LENGTH(employee_code) >= 6 AND SUBSTRING(employee_code FROM LENGTH(employee_code) - 3) ~ '^\d+$'
                THEN SUBSTRING(employee_code FROM LENGTH(employee_code) - 3)::INT
                ELSE 0
            END
        ), 391
    ) INTO v_count
    FROM public.user_accounts;

    IF v_count < 391 THEN
        v_count := 391;
    END IF;

    v_count := v_count + 1;
    v_seq := LPAD(v_count::TEXT, 4, '0');
    RETURN v_prefix || v_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_transfer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public full access companies" ON public.companies;
    CREATE POLICY "Public full access companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access departments" ON public.departments;
    CREATE POLICY "Public full access departments" ON public.departments FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access user_accounts" ON public.user_accounts;
    CREATE POLICY "Public full access user_accounts" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access employee_transfer_history" ON public.employee_transfer_history;
    CREATE POLICY "Public full access employee_transfer_history" ON public.employee_transfer_history FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access company_holidays" ON public.company_holidays;
    CREATE POLICY "Public full access company_holidays" ON public.company_holidays FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access office_locations" ON public.office_locations;
    CREATE POLICY "Public full access office_locations" ON public.office_locations FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_schedules" ON public.attendance_schedules;
    CREATE POLICY "Public full access attendance_schedules" ON public.attendance_schedules FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_settings" ON public.attendance_settings;
    CREATE POLICY "Public full access attendance_settings" ON public.attendance_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_records" ON public.attendance_records;
    CREATE POLICY "Public full access attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access leave_requests" ON public.leave_requests;
    CREATE POLICY "Public full access leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access overtime_requests" ON public.overtime_requests;
    CREATE POLICY "Public full access overtime_requests" ON public.overtime_requests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_correction_requests" ON public.attendance_correction_requests;
    CREATE POLICY "Public full access attendance_correction_requests" ON public.attendance_correction_requests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access reimbursements" ON public.reimbursements;
    CREATE POLICY "Public full access reimbursements" ON public.reimbursements FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_requests" ON public.attendance_requests;
    CREATE POLICY "Public full access attendance_requests" ON public.attendance_requests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access user_activity_logs" ON public.user_activity_logs;
    CREATE POLICY "Public full access user_activity_logs" ON public.user_activity_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access company_employees" ON public.company_employees;
    CREATE POLICY "Public full access company_employees" ON public.company_employees FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 13. INITIAL SEED DATA
-- ==============================================================================

-- Companies
INSERT INTO public.companies (name, code)
VALUES 
    ('The Gesit Companies', 'GESIT'),
    ('PT Gesit Alami', 'GNA'),
    ('PT Gesit Sarana Properti', 'GSP')
ON CONFLICT (name) DO NOTHING;

-- Departments
INSERT INTO public.departments (name)
VALUES 
    ('Human Resources'),
    ('Information Technology'),
    ('Finance & Accounting'),
    ('Operations'),
    ('Legal'),
    ('General Affairs')
ON CONFLICT (name) DO NOTHING;

-- Office Location
INSERT INTO public.office_locations (name, address, latitude, longitude, radius_meters, is_active)
SELECT 'Kantor Pusat Gesit', 'Jl. Jend. Sudirman Kav. 25, Jakarta Selatan', -6.215160, 106.820350, 200, true
WHERE NOT EXISTS (SELECT 1 FROM public.office_locations WHERE name = 'Kantor Pusat Gesit');

-- Attendance Schedule (Default: Flexible Hours 07:00 - 10:00, Wajib 9 Jam Kerja)
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_active)
SELECT 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)', '07:00:00', '19:00:00', 180, true
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_schedules LIMIT 1);

-- Attendance Settings
INSERT INTO public.attendance_settings (allow_wfh, require_selfie, require_location, max_radius_meters)
SELECT true, true, true, 200
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_settings LIMIT 1);

-- Sample 2026 Holidays
INSERT INTO public.company_holidays (holiday_date, holiday_name, name, holiday_type, year, is_active)
VALUES
    ('2026-01-01', 'Tahun Baru Masehi', 'Tahun Baru Masehi', 'national_holiday', 2026, true),
    ('2026-01-16', 'Isra Miraj Nabi Muhammad SAW', 'Isra Miraj Nabi Muhammad SAW', 'national_holiday', 2026, true),
    ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'Tahun Baru Imlek 2577 Kongzili', 'national_holiday', 2026, true),
    ('2026-03-20', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'national_holiday', 2026, true),
    ('2026-03-21', 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', 'national_holiday', 2026, true),
    ('2026-03-22', 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', 'national_holiday', 2026, true),
    ('2026-03-23', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'joint_leave', 2026, true),
    ('2026-03-24', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'joint_leave', 2026, true),
    ('2026-04-03', 'Wafat Yesus Kristus', 'Wafat Yesus Kristus', 'national_holiday', 2026, true),
    ('2026-05-01', 'Hari Buruh Internasional', 'Hari Buruh Internasional', 'national_holiday', 2026, true),
    ('2026-05-14', 'Kenaikan Yesus Kristus', 'Kenaikan Yesus Kristus', 'national_holiday', 2026, true),
    ('2026-05-28', 'Hari Raya Idul Adha 1447 H', 'Hari Raya Idul Adha 1447 H', 'national_holiday', 2026, true),
    ('2026-06-01', 'Hari Lahir Pancasila', 'Hari Lahir Pancasila', 'national_holiday', 2026, true),
    ('2026-06-16', 'Tahun Baru Islam 1448 H', 'Tahun Baru Islam 1448 H', 'national_holiday', 2026, true),
    ('2026-08-17', 'Hari Kemerdekaan Republik Indonesia', 'Hari Kemerdekaan Republik Indonesia', 'national_holiday', 2026, true),
    ('2026-08-25', 'Maulid Nabi Muhammad SAW', 'Maulid Nabi Muhammad SAW', 'national_holiday', 2026, true),
    ('2026-12-25', 'Hari Raya Natal', 'Hari Raya Natal', 'national_holiday', 2026, true),
    ('2026-12-26', 'Cuti Bersama Hari Raya Natal', 'Cuti Bersama Hari Raya Natal', 'joint_leave', 2026, true)
ON CONFLICT DO NOTHING;

-- Seed Default Admin & Sample Employees
INSERT INTO public.user_accounts (
    username, email, full_name, nickname, role, groups,
    company, department, job_title, employee_code, status,
    employment_status, employment_type, join_date
)
VALUES 
    (
        'admin.hr', 'admin.hr@gesit.co.id', 'Administrator HRIS', 'Admin',
        'Super Admin', ARRAY['admin', 'hr', 'hrd', 'employee-data']::TEXT[],
        'The Gesit Companies', 'Human Resources', 'HR System Administrator',
        '2610001', 'Active', 'Active', 'PKWTT', '2026-10-12'
    ),
    (
        'nisa', 'nisa@gesit.co.id', 'Nisa', 'Nisa',
        'Admin', ARRAY['hr', 'hrd', 'employee-data']::TEXT[],
        'The Gesit Companies', 'Human Resources', 'HR Specialist',
        '2610002', 'Active', 'Active', 'PKWT', '2026-10-12'
    )
ON CONFLICT (email) DO UPDATE SET
    employee_code = COALESCE(user_accounts.employee_code, EXCLUDED.employee_code),
    company = COALESCE(user_accounts.company, EXCLUDED.company),
    department = COALESCE(user_accounts.department, EXCLUDED.department),
    job_title = COALESCE(user_accounts.job_title, EXCLUDED.job_title);

-- Compat & migration for company_employees
ALTER TABLE public.company_employees ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.company_employees ALTER COLUMN job_title DROP NOT NULL;
ALTER TABLE public.company_employees ALTER COLUMN department DROP NOT NULL;

-- Seed company_employees compatibility record
INSERT INTO public.company_employees (user_account_id, employee_code, full_name, department, job_title, status)
SELECT 
    id, 
    employee_code, 
    full_name, 
    COALESCE(department, 'Human Resources'), 
    COALESCE(job_title, 'HR System Administrator'), 
    status 
FROM public.user_accounts 
WHERE email = 'admin.hr@gesit.co.id'
LIMIT 1
ON CONFLICT DO NOTHING;

-- =========================================================================
-- OFFICE LOCATIONS (GEOFENCE & RADIUS PRESENSI MOBILE)
-- =========================================================================
DROP TABLE IF EXISTS public.office_locations CASCADE;

CREATE TABLE public.office_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  radius_meters integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT office_locations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.office_locations ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses RLS untuk public/anon dan authenticated
DROP POLICY IF EXISTS "Allow select office_locations" ON public.office_locations;
CREATE POLICY "Allow select office_locations"
  ON public.office_locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert office_locations" ON public.office_locations;
CREATE POLICY "Allow insert office_locations"
  ON public.office_locations FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update office_locations" ON public.office_locations;
CREATE POLICY "Allow update office_locations"
  ON public.office_locations FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete office_locations" ON public.office_locations;
CREATE POLICY "Allow delete office_locations"
  ON public.office_locations FOR DELETE
  USING (true);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_office_locations_is_active ON public.office_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_office_locations_name ON public.office_locations(name);

-- Seed / Insert 7 Titik Lokasi Kantor Gesit
INSERT INTO public.office_locations (id, name, address, latitude, longitude, radius_meters, is_active, created_at)
VALUES
  ('274c3712-dbc8-44d7-9290-3606095176f5', 'Rheem Office', 'Jl. TB Simatupang No.18, Cilandak, Jakarta Selatan', -6.2912, 106.8134, 50, true, '2026-09-13 15:39:27.803191+00'),
  ('2b60bab0-3502-4a9c-959a-169800406704', 'AI', 'Jl. Pulogadung, Jakarta Timur', -6.185906066493317, 106.9166238387673, 50, true, '2026-10-06 10:28:57.690619+00'),
  ('36c0fc85-a06c-45a6-b722-3b5e2ddc4f52', 'The City Tower', 'Jl. MH Thamrin No.81, RT.1/RW.6, Dukuh Atas, Menteng, Kec. Menteng, Kota Jakarta Pusat, Daerah Khusus Ibukota Jakarta 10310', -6.1991, 106.823628, 50, true, '2026-09-13 15:39:27.803191+00'),
  ('7a4891b6-09b1-4044-84bb-ba1ad0a45787', 'PPHUI', 'Jl. H. R. Rasuna Said No.22 Kavling C, Jakarta Selatan', -6.222027409239421, 106.83307848478911, 50, true, '2026-10-06 10:28:57.690619+00'),
  ('82901ced-d36f-411d-b98f-c4d6566b352f', 'Trinity Tower', 'Jl. H. R. Rasuna Said No.Kav. C22, Kuningan, Jakarta Selatan', -6.225018, 106.8336, 50, true, '2026-09-13 15:39:27.803191+00'),
  ('b6c2142b-bab1-4bb7-a540-6d6ae2a37e70', 'Sircon', 'Jl. Sircon, Grogol Utara, Kebayoran Lama, Jakarta Selatan', -6.2175883135583545, 106.7838018541081, 50, true, '2026-10-06 10:29:38.150755+00'),
  ('f87fc7d1-d5a3-424e-b16a-5742ebb110a7', 'Testing Rumah Rudi', 'Jl. Jengki, Jakarta Timur', -6.257024, 106.880056, 50, true, '2026-09-13 03:49:18.532616+00')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius_meters = EXCLUDED.radius_meters,
  is_active = EXCLUDED.is_active;





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
