-- ==============================================================================
-- GESIT HRIS — STANDALONE DATABASE SCHEMA
-- Dedicated PostgreSQL / Supabase Schema for Human Resources & Payroll
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. USER ACCOUNTS & AUTHENTICATION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id BIGSERIAL PRIMARY KEY,
    auth_user_id UUID UNIQUE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    nickname TEXT,
    role TEXT NOT NULL DEFAULT 'Employee', -- 'Super Admin', 'Admin', 'HR Manager', 'HR Staff', 'Employee'
    groups TEXT[] DEFAULT ARRAY['employee']::TEXT[],
    department TEXT,
    job_title TEXT,
    employee_id TEXT UNIQUE,
    phone TEXT,
    avatar_url TEXT,
    e_sign_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive', 'Suspended'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts (lower(email));
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON public.user_accounts (role);

-- ==============================================================================
-- 3. MASTER DATA EMPLOYEES (BIODATA & KEPEGAWAIAN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.company_employees (
    id BIGSERIAL PRIMARY KEY,
    user_account_id BIGINT REFERENCES public.user_accounts(id) ON DELETE SET NULL,
    employee_code TEXT UNIQUE NOT NULL, -- e.g. 'GNR-2026-001'
    full_name TEXT NOT NULL,
    nickname TEXT,
    email TEXT,
    phone TEXT,
    gender TEXT, -- 'Laki-laki', 'Perempuan'
    birth_place TEXT,
    birth_date DATE,
    marital_status TEXT, -- 'Lajang', 'Menikah', 'Cerai'
    religion TEXT,
    blood_type TEXT,
    
    -- Kependudukan & Pajak
    identity_card_number TEXT, -- NIK / No KTP
    tax_id_number TEXT,        -- NPWP
    bpjs_kesehatan TEXT,
    bpjs_ketenagakerjaan TEXT,
    address_ktp TEXT,
    address_domicile TEXT,
    
    -- Kontak Darurat
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    
    -- Organisasi Perusahaan
    company TEXT DEFAULT 'The Gesit Companies',
    department TEXT NOT NULL,
    division TEXT,
    job_title TEXT NOT NULL,
    grade_level TEXT,
    employment_type TEXT NOT NULL DEFAULT 'PKWT', -- 'PKWT', 'PKWTT', 'Internship', 'Probation', 'Freelance'
    
    -- Tanggal Penting
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    contract_end_date DATE,
    permanent_date DATE,
    resignation_date DATE,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Inactive', 'Resigned', 'Terminated', 'On Leave'
    photo_url TEXT,
    e_sign_url TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_employees_code ON public.company_employees (employee_code);
CREATE INDEX IF NOT EXISTS idx_company_employees_dept ON public.company_employees (department);
CREATE INDEX IF NOT EXISTS idx_company_employees_status ON public.company_employees (status);

-- ==============================================================================
-- 4. KONTRAK KERJA & PKWT (EMPLOYMENT CONTRACTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_contracts (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
    contract_number TEXT UNIQUE NOT NULL,
    contract_type TEXT NOT NULL, -- 'PKWT 1', 'PKWT 2', 'PKWTT', 'Addendum', 'Internship'
    start_date DATE NOT NULL,
    end_date DATE,
    document_url TEXT, -- PDF file kontrak
    remuneration_agreed NUMERIC(15,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Renewed', 'Terminated'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_contracts_emp ON public.employee_contracts (employee_id);

-- ==============================================================================
-- 5. PAYROLL & DATA REKENING
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_payrolls (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT UNIQUE NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
    bank_name TEXT DEFAULT 'BCA',
    bank_account_number TEXT,
    bank_account_holder TEXT,
    basic_salary NUMERIC(15,2) DEFAULT 0,
    position_allowance NUMERIC(15,2) DEFAULT 0,
    transport_allowance NUMERIC(15,2) DEFAULT 0,
    meal_allowance NUMERIC(15,2) DEFAULT 0,
    communication_allowance NUMERIC(15,2) DEFAULT 0,
    bpjs_tk_deduction NUMERIC(15,2) DEFAULT 0,
    bpjs_kes_deduction NUMERIC(15,2) DEFAULT 0,
    tax_pph21_deduction NUMERIC(15,2) DEFAULT 0,
    payment_schedule TEXT DEFAULT 'Monthly',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. RIWAYAT MUTASI & PROMOSI (CAREER / TRANSFER HISTORY)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_transfer_histories (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES public.company_employees(id) ON DELETE CASCADE,
    transfer_type TEXT NOT NULL, -- 'Promotion', 'Demotion', 'Transfer', 'Rotation'
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    previous_company TEXT,
    new_company TEXT,
    previous_department TEXT,
    new_department TEXT,
    previous_job_title TEXT,
    new_job_title TEXT,
    sk_number TEXT, -- Nomor Surat Keputusan Direksi/HRD
    sk_document_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. KALENDER LIBUR & CUTI BERSAMA (COMPANY & NATIONAL HOLIDAYS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.company_holidays (
    id BIGSERIAL PRIMARY KEY,
    holiday_date DATE UNIQUE NOT NULL,
    holiday_name TEXT NOT NULL,
    holiday_type TEXT NOT NULL DEFAULT 'national_holiday', -- 'national_holiday', 'joint_leave', 'company_holiday'
    year INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_holidays_date ON public.company_holidays (holiday_date);
CREATE INDEX IF NOT EXISTS idx_company_holidays_year ON public.company_holidays (year);

-- ==============================================================================
-- 8. LOKASI KANTOR & RADIUS ABSEN (ATTENDANCE GEOFENCING)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_offices (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. DATA PRESENSI HARIAN (ATTENDANCE RECORDS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE SET NULL,
    employee_id BIGINT REFERENCES public.company_employees(id) ON DELETE SET NULL,
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
    status TEXT NOT NULL DEFAULT 'Present', -- 'Present', 'Late', 'Half Day', 'Absent', 'On Leave', 'Holiday'
    work_duration_minutes INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records (date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON public.attendance_records (user_id);

-- ==============================================================================
-- 10. PENGAJUAN CUTI, IZIN, SAKIT, & LEMBUR (ATTENDANCE REQUESTS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES public.user_accounts(id) ON DELETE CASCADE,
    employee_id BIGINT REFERENCES public.company_employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'leave', 'sick', 'permission', 'overtime', 'business_trip'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days NUMERIC(4,1) DEFAULT 1,
    reason TEXT NOT NULL,
    attachment_url TEXT, -- Surat dokter / bukti tugas
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_requests_user ON public.attendance_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON public.attendance_requests (status);

-- ==============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_transfer_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;

-- Allow public read for authenticated/anon during development setup
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public full access user_accounts" ON public.user_accounts;
    CREATE POLICY "Public full access user_accounts" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access company_employees" ON public.company_employees;
    CREATE POLICY "Public full access company_employees" ON public.company_employees FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access employee_contracts" ON public.employee_contracts;
    CREATE POLICY "Public full access employee_contracts" ON public.employee_contracts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access employee_payrolls" ON public.employee_payrolls;
    CREATE POLICY "Public full access employee_payrolls" ON public.employee_payrolls FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access employee_transfer_histories" ON public.employee_transfer_histories;
    CREATE POLICY "Public full access employee_transfer_histories" ON public.employee_transfer_histories FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access company_holidays" ON public.company_holidays;
    CREATE POLICY "Public full access company_holidays" ON public.company_holidays FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_offices" ON public.attendance_offices;
    CREATE POLICY "Public full access attendance_offices" ON public.attendance_offices FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_records" ON public.attendance_records;
    CREATE POLICY "Public full access attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public full access attendance_requests" ON public.attendance_requests;
    CREATE POLICY "Public full access attendance_requests" ON public.attendance_requests FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- 12. INITIAL SEED DATA
-- ==============================================================================

-- Seed Default Office Location (Gedung Gesit)
INSERT INTO public.attendance_offices (name, address, latitude, longitude, radius_meters, is_active)
VALUES ('Kantor Pusat Gesit', 'Jl. Jend. Sudirman Kav. 25, Jakarta Selatan', -6.215160, 106.820350, 150, true)
ON CONFLICT DO NOTHING;

-- Seed Sample 2026 Holidays
INSERT INTO public.company_holidays (holiday_date, holiday_name, holiday_type, year, is_active)
VALUES
    ('2026-01-01', 'Tahun Baru Masehi', 'national_holiday', 2026, true),
    ('2026-01-16', 'Isra Miraj Nabi Muhammad SAW', 'national_holiday', 2026, true),
    ('2026-02-17', 'Tahun Baru Imlek 2577 Kongzili', 'national_holiday', 2026, true),
    ('2026-03-20', 'Hari Suci Nyepi Tahun Baru Saka 1948', 'national_holiday', 2026, true),
    ('2026-03-21', 'Hari Raya Idul Fitri 1447 H (Hari Pertama)', 'national_holiday', 2026, true),
    ('2026-03-22', 'Hari Raya Idul Fitri 1447 H (Hari Kedua)', 'national_holiday', 2026, true),
    ('2026-03-23', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'joint_leave', 2026, true),
    ('2026-03-24', 'Cuti Bersama Hari Raya Idul Fitri 1447 H', 'joint_leave', 2026, true),
    ('2026-04-03', 'Wafat Yesus Kristus', 'national_holiday', 2026, true),
    ('2026-05-01', 'Hari Buruh Internasional', 'national_holiday', 2026, true),
    ('2026-05-14', 'Kenaikan Yesus Kristus', 'national_holiday', 2026, true),
    ('2026-05-28', 'Hari Raya Idul Adha 1447 H', 'national_holiday', 2026, true),
    ('2026-06-01', 'Hari Lahir Pancasila', 'national_holiday', 2026, true),
    ('2026-06-16', 'Tahun Baru Islam 1448 H', 'national_holiday', 2026, true),
    ('2026-08-17', 'Hari Kemerdekaan Republik Indonesia', 'national_holiday', 2026, true),
    ('2026-08-25', 'Maulid Nabi Muhammad SAW', 'national_holiday', 2026, true),
    ('2026-12-25', 'Hari Raya Natal', 'national_holiday', 2026, true),
    ('2026-12-26', 'Cuti Bersama Hari Raya Natal', 'joint_leave', 2026, true)
ON CONFLICT (holiday_date) DO NOTHING;

-- Seed Default Admin User
INSERT INTO public.user_accounts (email, full_name, role, groups, department, job_title)
VALUES 
    ('admin.hr@gesit.co.id', 'Administrator HRIS', 'Super Admin', ARRAY['admin', 'hr', 'hrd']::TEXT[], 'Human Resources', 'HR System Administrator'),
    ('nisa@gesit.co.id', 'Nisa', 'Admin', ARRAY['hr', 'hrd', 'employee-data']::TEXT[], 'Human Resources', 'HR Specialist')
ON CONFLICT (email) DO NOTHING;
