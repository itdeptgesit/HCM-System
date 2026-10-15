-- ==============================================================================
-- 09_master_fix_all_bugs.sql
-- SOLUSI LENGKAP & MENYELURUH (ZERO-BUG FIX)
-- Menyelaraskan seluruh tabel, kolom, fungsi, constraint, dan izin akses
-- antara app-hr, app-absen, dan database Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABEL attendance_correction_requests (KOREKSI PRESENSI)
-- ------------------------------------------------------------------------------
-- Hapus batasan NOT NULL pada kolom lama "date" yang menyebabkan error:
-- "null value in column 'date' of relation 'attendance_correction_requests' violates not-null constraint"
ALTER TABLE public.attendance_correction_requests 
  ALTER COLUMN "date" DROP NOT NULL,
  ALTER COLUMN "date" SET DEFAULT CURRENT_DATE;

-- Tambah kolom-kolom standar yang dibutuhkan
ALTER TABLE public.attendance_correction_requests
  ADD COLUMN IF NOT EXISTS attendance_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS clock_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS clock_out_time timestamptz,
  ADD COLUMN IF NOT EXISTS requested_check_in timestamptz,
  ADD COLUMN IF NOT EXISTS requested_check_out timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS line1_approved_by text,
  ADD COLUMN IF NOT EXISTS line1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS line2_approved_by text,
  ADD COLUMN IF NOT EXISTS line2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS senior_approved_by text,
  ADD COLUMN IF NOT EXISTS senior_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS office_approved_by text,
  ADD COLUMN IF NOT EXISTS office_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Sinkronisasi otomatis data lama jika ada
UPDATE public.attendance_correction_requests
SET attendance_date = COALESCE(attendance_date, date),
    date = COALESCE(date, attendance_date),
    clock_in_time = COALESCE(clock_in_time, requested_check_in),
    requested_check_in = COALESCE(requested_check_in, clock_in_time),
    clock_out_time = COALESCE(clock_out_time, requested_check_out),
    requested_check_out = COALESCE(requested_check_out, clock_out_time);

-- Trigger untuk sinkronisasi otomatis kolom date <-> attendance_date saat insert/update
CREATE OR REPLACE FUNCTION public.sync_attendance_correction_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.attendance_date := COALESCE(NEW.attendance_date, NEW.date, CURRENT_DATE);
  NEW.date := COALESCE(NEW.date, NEW.attendance_date, CURRENT_DATE);
  NEW.clock_in_time := COALESCE(NEW.clock_in_time, NEW.requested_check_in);
  NEW.requested_check_in := COALESCE(NEW.requested_check_in, NEW.clock_in_time);
  NEW.clock_out_time := COALESCE(NEW.clock_out_time, NEW.requested_check_out);
  NEW.requested_check_out := COALESCE(NEW.requested_check_out, NEW.clock_out_time);
  NEW.requested_at := COALESCE(NEW.requested_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_correction_columns ON public.attendance_correction_requests;
CREATE TRIGGER trg_sync_attendance_correction_columns
BEFORE INSERT OR UPDATE ON public.attendance_correction_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_correction_columns();

-- Constraint unik untuk user_id dan attendance_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_correction_requests_user_date_key'
  ) THEN
    DELETE FROM public.attendance_correction_requests a
    USING public.attendance_correction_requests b
    WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND COALESCE(a.attendance_date, a.date) = COALESCE(b.attendance_date, b.date);

    ALTER TABLE public.attendance_correction_requests 
      ADD CONSTRAINT attendance_correction_requests_user_date_key UNIQUE (user_id, attendance_date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 2. TABEL attendance_requests (DINAS LUAR / ABSEN LUAR RADIUS)
-- ------------------------------------------------------------------------------
-- Hilangkan batasan NOT NULL pada kolom lama (start_date, end_date, type)
ALTER TABLE public.attendance_requests
  ALTER COLUMN "start_date" DROP NOT NULL,
  ALTER COLUMN "end_date" DROP NOT NULL,
  ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "type" SET DEFAULT 'dinas';

ALTER TABLE public.attendance_requests
  ADD COLUMN IF NOT EXISTS request_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS latitude double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longitude double precision DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS line1_approved_by text,
  ADD COLUMN IF NOT EXISTS line1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS line2_approved_by text,
  ADD COLUMN IF NOT EXISTS line2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS senior_approved_by text,
  ADD COLUMN IF NOT EXISTS senior_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS office_approved_by text,
  ADD COLUMN IF NOT EXISTS office_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Sinkronisasi data lama
UPDATE public.attendance_requests
SET request_date = COALESCE(request_date, start_date, CURRENT_DATE),
    start_date = COALESCE(start_date, request_date, CURRENT_DATE),
    end_date = COALESCE(end_date, request_date, CURRENT_DATE),
    type = COALESCE(type, 'dinas');

-- Trigger sinkronisasi request_date <-> start_date
CREATE OR REPLACE FUNCTION public.sync_attendance_requests_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.request_date := COALESCE(NEW.request_date, NEW.start_date, CURRENT_DATE);
  NEW.start_date := COALESCE(NEW.start_date, NEW.request_date, CURRENT_DATE);
  NEW.end_date := COALESCE(NEW.end_date, NEW.request_date, CURRENT_DATE);
  NEW.type := COALESCE(NEW.type, 'dinas');
  NEW.requested_at := COALESCE(NEW.requested_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_requests_columns ON public.attendance_requests;
CREATE TRIGGER trg_sync_attendance_requests_columns
BEFORE INSERT OR UPDATE ON public.attendance_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_requests_columns();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_requests_user_request_date_key'
  ) THEN
    DELETE FROM public.attendance_requests a
    USING public.attendance_requests b
    WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND COALESCE(a.request_date, a.start_date) = COALESCE(b.request_date, b.start_date);

    ALTER TABLE public.attendance_requests 
      ADD CONSTRAINT attendance_requests_user_request_date_key UNIQUE (user_id, request_date);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ------------------------------------------------------------------------------
-- 3. TABEL attendance_request_settings (PENGATURAN PERIODE REQUEST)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_request_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK(id), 
  period_type text NOT NULL DEFAULT 'weekly' CHECK(period_type IN ('weekly','monthly','custom')),
  period_days integer NOT NULL DEFAULT 7 CHECK(period_days BETWEEN 1 AND 31), 
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(), 
  updated_by text
);

INSERT INTO public.attendance_request_settings (id, period_type, period_days, enabled)
VALUES (true, 'weekly', 7, true)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 4. TABEL attendance_schedules & attendance_settings
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance_schedules 
  ADD COLUMN IF NOT EXISTS is_flexible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS flex_start time NOT NULL DEFAULT '07:00:00',
  ADD COLUMN IF NOT EXISTS flex_end time NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS required_work_hours numeric NOT NULL DEFAULT 9;

UPDATE public.attendance_schedules 
SET is_flexible = COALESCE(is_flexible, true),
    flex_start = COALESCE(flex_start, '07:00:00'::time),
    flex_end = COALESCE(flex_end, '10:00:00'::time),
    required_work_hours = COALESCE(required_work_hours, 9)
WHERE is_flexible IS NULL OR flex_start IS NULL OR flex_end IS NULL;

INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)', '07:00:00', '10:00:00', 180, true, '07:00:00', '10:00:00', 9, true
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_schedules WHERE is_active);

CREATE TABLE IF NOT EXISTS public.attendance_settings (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  allow_wfh boolean NOT NULL DEFAULT true,
  require_selfie boolean NOT NULL DEFAULT true,
  require_location boolean NOT NULL DEFAULT true,
  max_radius_meters integer NOT NULL DEFAULT 200,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.attendance_settings (id, allow_wfh, require_selfie, require_location, max_radius_meters)
SELECT 1, true, true, true, 200
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_settings);


-- ------------------------------------------------------------------------------
-- 5. TABEL attendance_records (SINKRONISASI KOLOM LAMA & BARU)
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS clock_in timestamptz,
  ADD COLUMN IF NOT EXISTS clock_out timestamptz,
  ADD COLUMN IF NOT EXISTS check_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS check_out_time timestamptz,
  ADD COLUMN IF NOT EXISTS clock_in_lat double precision,
  ADD COLUMN IF NOT EXISTS clock_in_lng double precision,
  ADD COLUMN IF NOT EXISTS clock_out_lat double precision,
  ADD COLUMN IF NOT EXISTS clock_out_lng double precision,
  ADD COLUMN IF NOT EXISTS clock_in_office_id uuid,
  ADD COLUMN IF NOT EXISTS clock_in_office_name text,
  ADD COLUMN IF NOT EXISTS clock_in_distance_meters double precision,
  ADD COLUMN IF NOT EXISTS clock_out_office_id uuid,
  ADD COLUMN IF NOT EXISTS clock_out_office_name text,
  ADD COLUMN IF NOT EXISTS clock_out_distance_meters double precision,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS check_in_photo_url text,
  ADD COLUMN IF NOT EXISTS check_out_photo_url text,
  ADD COLUMN IF NOT EXISTS work_mode text DEFAULT 'wfo',
  ADD COLUMN IF NOT EXISTS total_work_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_duration_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_overtime_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Trigger sinkronisasi otomatis kolom clock_in <-> check_in_time pada attendance_records
CREATE OR REPLACE FUNCTION public.sync_attendance_records_timestamps()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.clock_in := COALESCE(NEW.clock_in, NEW.check_in_time);
  NEW.check_in_time := COALESCE(NEW.check_in_time, NEW.clock_in);
  NEW.clock_out := COALESCE(NEW.clock_out, NEW.check_out_time);
  NEW.check_out_time := COALESCE(NEW.check_out_time, NEW.clock_out);
  NEW.photo_url := COALESCE(NEW.photo_url, NEW.check_in_photo_url);
  NEW.check_in_photo_url := COALESCE(NEW.check_in_photo_url, NEW.photo_url);
  NEW.total_work_minutes := COALESCE(NEW.total_work_minutes, NEW.work_duration_minutes, 0);
  NEW.work_duration_minutes := COALESCE(NEW.work_duration_minutes, NEW.total_work_minutes, 0);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_attendance_records_timestamps ON public.attendance_records;
CREATE TRIGGER trg_sync_attendance_records_timestamps
BEFORE INSERT OR UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.sync_attendance_records_timestamps();


-- ------------------------------------------------------------------------------
-- 6. TABEL leave_requests (CUTI), overtime_requests (LEMBUR), reimbursements
-- ------------------------------------------------------------------------------
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS line1_approved_by text,
  ADD COLUMN IF NOT EXISTS line1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS line2_approved_by text,
  ADD COLUMN IF NOT EXISTS line2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS senior_approved_by text,
  ADD COLUMN IF NOT EXISTS senior_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS office_approved_by text,
  ADD COLUMN IF NOT EXISTS office_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.overtime_requests
  ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS project_or_task text DEFAULT 'Pekerjaan Operasional',
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS line1_approved_by text,
  ADD COLUMN IF NOT EXISTS line1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS line2_approved_by text,
  ADD COLUMN IF NOT EXISTS line2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS senior_approved_by text,
  ADD COLUMN IF NOT EXISTS senior_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS office_approved_by text,
  ADD COLUMN IF NOT EXISTS office_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.reimbursements
  ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS line1_approved_by text,
  ADD COLUMN IF NOT EXISTS line1_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS line2_approved_by text,
  ADD COLUMN IF NOT EXISTS line2_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS senior_approved_by text,
  ADD COLUMN IF NOT EXISTS senior_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS office_approved_by text,
  ADD COLUMN IF NOT EXISTS office_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.reimbursements SET attachment_url = COALESCE(attachment_url, receipt_url);
UPDATE public.reimbursements SET receipt_url = COALESCE(receipt_url, attachment_url);


-- ------------------------------------------------------------------------------
-- 7. TABEL approval_records & company_news
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type text NOT NULL,
  request_id text NOT NULL,
  level_number integer NOT NULL DEFAULT 1,
  approver_id text,
  approver_name text,
  status text NOT NULL,
  notes text,
  decided_at timestamptz DEFAULT now()
);

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


-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET (medical-docs & attendance-selfies)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-docs', 'medical-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-selfies', 'attendance-selfies', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Medical docs access" ON storage.objects;
CREATE POLICY "Medical docs access" ON storage.objects
FOR ALL TO authenticated, anon
USING (bucket_id = 'medical-docs') WITH CHECK (bucket_id = 'medical-docs');

DROP POLICY IF EXISTS "Attendance selfies access" ON storage.objects;
CREATE POLICY "Attendance selfies access" ON storage.objects
FOR ALL TO authenticated, anon
USING (bucket_id = 'attendance-selfies') WITH CHECK (bucket_id = 'attendance-selfies');


-- ------------------------------------------------------------------------------
-- 9. PERBARUI SELURUH RPC FUNCTIONS (BEBAS TYPECAST ERROR & COMPATIBLE)
-- ------------------------------------------------------------------------------

-- A. submit_attendance_correction_request (Koreksi Absen)
DROP FUNCTION IF EXISTS public.submit_attendance_correction_request(date, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.submit_attendance_correction_request CASCADE;

CREATE OR REPLACE FUNCTION public.submit_attendance_correction_request(
  p_attendance_date date,
  p_clock_in timestamptz DEFAULT NULL,
  p_clock_out timestamptz DEFAULT NULL,
  p_reason text DEFAULT ''
) RETURNS public.attendance_correction_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_text text := public.current_account_id();
  v_user_id bigint;
  v_row public.attendance_correction_requests;
BEGIN
  SELECT id INTO v_user_id 
  FROM public.user_accounts 
  WHERE id::text = v_user_text 
     OR lower(email) = lower(auth.jwt()->>'email')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := v_user_text::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND: Akun pengguna tidak ditemukan.'; 
  END IF;

  -- Batas aturan: Hanya boleh 7 hari ke belakang dan sebelum hari ini
  IF p_attendance_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Pengajuan koreksi presensi hanya berlaku untuk hari-hari sebelumnya (hari ini masih berlangsung).';
  END IF;

  IF p_attendance_date < (CURRENT_DATE - INTERVAL '7 days')::date THEN
    RAISE EXCEPTION 'Batas waktu pengajuan koreksi absen maksimal 7 hari ke belakang. Pengajuan untuk tanggal tersebut sudah melewati batas (kedaluwarsa).';
  END IF;

  IF p_clock_in IS NULL AND p_clock_out IS NULL THEN
    RAISE EXCEPTION 'Wajib mengisi jam masuk atau jam pulang yang ingin dikoreksi.';
  END IF;

  IF p_clock_in IS NOT NULL AND p_clock_out IS NOT NULL AND p_clock_out < p_clock_in THEN
    RAISE EXCEPTION 'Jam pulang tidak boleh lebih awal dari jam masuk.';
  END IF;

  IF TRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Alasan pengajuan koreksi presensi wajib diisi.';
  END IF;

  INSERT INTO public.attendance_correction_requests(
    user_id, attendance_date, "date", clock_in_time, clock_out_time, 
    requested_check_in, requested_check_out, reason, status, requested_at,
    reviewer_id, reviewed_at, reviewer_note
  ) VALUES (
    v_user_id, p_attendance_date, p_attendance_date, p_clock_in, p_clock_out, 
    p_clock_in, p_clock_out, TRIM(p_reason), 'pending', now(),
    NULL, NULL, NULL
  )
  ON CONFLICT (user_id, attendance_date) DO UPDATE
    SET clock_in_time = EXCLUDED.clock_in_time,
        clock_out_time = EXCLUDED.clock_out_time,
        requested_check_in = EXCLUDED.requested_check_in,
        requested_check_out = EXCLUDED.requested_check_out,
        reason = EXCLUDED.reason,
        status = 'pending',
        requested_at = now(),
        reviewer_id = NULL,
        reviewed_at = NULL,
        reviewer_note = NULL
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_attendance_correction_request TO authenticated, anon;


-- B. submit_outside_radius_attendance (Live Dinas Luar)
DROP FUNCTION IF EXISTS public.submit_outside_radius_attendance(date, double precision, double precision, text, text);
DROP FUNCTION IF EXISTS public.submit_outside_radius_attendance CASCADE;

CREATE OR REPLACE FUNCTION public.submit_outside_radius_attendance(
  p_date date,
  p_lat double precision,
  p_lng double precision,
  p_photo_url text DEFAULT NULL,
  p_reason text DEFAULT ''
) RETURNS public.attendance_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_text text := public.current_account_id();
  v_user_id bigint;
  v_row public.attendance_requests;
BEGIN
  SELECT id INTO v_user_id 
  FROM public.user_accounts 
  WHERE id::text = v_user_text 
     OR lower(email) = lower(auth.jwt()->>'email')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := v_user_text::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND: Akun pengguna tidak ditemukan.'; 
  END IF;
  
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'INVALID_COORDINATES: Koordinat GPS tidak valid.';
  END IF;

  INSERT INTO public.attendance_requests(
    user_id, request_date, start_date, end_date, type, latitude, longitude, photo_url, reason, status, requested_at,
    reviewer_id, reviewed_at, reviewer_note
  ) VALUES (
    v_user_id, p_date, p_date, p_date, 'dinas', p_lat, p_lng, p_photo_url, TRIM(COALESCE(p_reason, 'Dinas Luar / Luar Radius')), 'pending', now(),
    NULL, NULL, NULL
  )
  ON CONFLICT (user_id, request_date) DO UPDATE
    SET latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        photo_url = EXCLUDED.photo_url,
        reason = EXCLUDED.reason,
        status = 'pending',
        requested_at = now(),
        reviewer_id = NULL,
        reviewed_at = NULL,
        reviewer_note = NULL
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_outside_radius_attendance TO authenticated, anon;


-- B.1. review_attendance_correction_request (Persetujuan Koreksi Presensi)
DROP FUNCTION IF EXISTS public.review_attendance_correction_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.review_attendance_correction_request(bigint, text, text);
DROP FUNCTION IF EXISTS public.review_attendance_correction_request(text, text, text);
DROP FUNCTION IF EXISTS public.review_attendance_correction_request CASCADE;

CREATE OR REPLACE FUNCTION public.review_attendance_correction_request(
  p_request_id text,
  p_status text,
  p_reviewer_note text DEFAULT NULL
) RETURNS public.attendance_correction_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.attendance_correction_requests;
  v_reviewer text := public.current_account_id();
  v_existing_rec public.attendance_records;
  v_final_in timestamptz;
  v_final_out timestamptz;
  v_work_minutes integer := 0;
  v_is_auth boolean := false;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN 
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS: Status hanya boleh approved atau rejected.'; 
  END IF;

  SELECT * INTO v_row FROM public.attendance_correction_requests 
  WHERE id::text = p_request_id OR id::text = TRIM(p_request_id) 
  FOR UPDATE;

  IF v_row.id IS NULL THEN 
    RAISE EXCEPTION 'REQUEST_NOT_FOUND: Pengajuan koreksi presensi tidak ditemukan.'; 
  END IF;

  IF v_row.status <> 'pending' THEN 
    RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: Pengajuan sudah pernah ditinjau sebelumnya.'; 
  END IF;

  -- Verifikasi hak wewenang (HR/Admin, Atasan Langsung/Supervisor/Manager karyawan, atau akun role Supervisor/Manager)
  IF public.is_hr_admin() THEN
    v_is_auth := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_accounts u 
    WHERE u.id::text = v_reviewer 
      AND lower(u.role) IN ('admin','super admin','super_admin','hr','hr manager','hr staff','supervisor','manager','vp','director')
  ) THEN
    v_is_auth := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_accounts u
    WHERE u.id::text = v_row.user_id::text
      AND v_reviewer IN (u.supervisor_id::text, u.attendance_supervisor_id::text, u.manager_id::text, u.attendance_manager_id::text, u.vp_id::text, u.attendance_vp_id::text, u.attendance_hr_id::text)
  ) THEN
    v_is_auth := true;
  END IF;

  IF NOT v_is_auth THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Anda tidak memiliki wewenang untuk menyetujui pengajuan koreksi presensi ini.';
  END IF;

  IF p_status = 'approved' THEN
    SELECT * INTO v_existing_rec 
    FROM public.attendance_records 
    WHERE user_id::text = v_row.user_id::text 
      AND date = COALESCE(v_row.attendance_date, v_row.date)
    FOR UPDATE;

    v_final_in := COALESCE(v_row.clock_in_time, v_row.requested_check_in, v_existing_rec.clock_in);
    v_final_out := COALESCE(v_row.clock_out_time, v_row.requested_check_out, v_existing_rec.clock_out);

    IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL AND v_final_out < v_final_in THEN
      RAISE EXCEPTION 'INVALID_TIME_RANGE: Jam pulang tidak boleh lebih awal dari jam masuk.';
    END IF;

    IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL THEN
      v_work_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_final_out - v_final_in)) / 60)::integer);
    ELSE
      v_work_minutes := COALESCE(v_existing_rec.total_work_minutes, v_existing_rec.work_duration_minutes, 0);
    END IF;

    IF v_existing_rec.id IS NOT NULL THEN
      UPDATE public.attendance_records
      SET clock_in = COALESCE(v_final_in, clock_in),
          clock_out = COALESCE(v_final_out, clock_out),
          check_in_time = COALESCE(v_final_in, check_in_time),
          check_out_time = COALESCE(v_final_out, check_out_time),
          total_work_minutes = v_work_minutes,
          work_duration_minutes = v_work_minutes,
          status = 'Present',
          notes = TRIM(COALESCE(notes, '') || ' [Koreksi Disetujui: ' || COALESCE(v_row.reason, '') || ']'),
          approved_by = v_reviewer,
          approved_at = now(),
          updated_at = now()
      WHERE id = v_existing_rec.id;
    ELSE
      INSERT INTO public.attendance_records(
        user_id, date, clock_in, clock_out, check_in_time, check_out_time,
        status, total_work_minutes, work_duration_minutes, notes,
        approved_by, approved_at, work_mode
      ) VALUES (
        v_row.user_id, COALESCE(v_row.attendance_date, v_row.date), v_final_in, v_final_out, v_final_in, v_final_out,
        'Present', v_work_minutes, v_work_minutes, 'Koreksi Presensi Disetujui: ' || COALESCE(v_row.reason, ''),
        v_reviewer, now(), 'wfo'
      );
    END IF;
  END IF;

  UPDATE public.attendance_correction_requests 
  SET status = p_status, 
      reviewer_id = v_reviewer, 
      reviewed_at = now(), 
      reviewer_note = p_reviewer_note 
  WHERE id = v_row.id 
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_attendance_correction_request TO authenticated, anon;


-- B.2. review_outside_radius_attendance (Persetujuan Live Dinas Luar)
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance(uuid, text, text);
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance(bigint, text, text);
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance(text, text, text);
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance CASCADE;

CREATE OR REPLACE FUNCTION public.review_outside_radius_attendance(
  p_request_id text,
  p_status text,
  p_reviewer_note text DEFAULT NULL
) RETURNS public.attendance_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.attendance_requests;
  v_reviewer text := public.current_account_id();
  v_existing_rec public.attendance_records;
  v_is_auth boolean := false;
BEGIN
  IF p_status NOT IN ('approved', 'rejected') THEN 
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS: Status hanya boleh approved atau rejected.'; 
  END IF;

  SELECT * INTO v_row FROM public.attendance_requests 
  WHERE id::text = p_request_id OR id::text = TRIM(p_request_id) 
  FOR UPDATE;

  IF v_row.id IS NULL THEN 
    RAISE EXCEPTION 'REQUEST_NOT_FOUND: Pengajuan presensi dinas luar tidak ditemukan.'; 
  END IF;

  IF v_row.status <> 'pending' THEN 
    RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: Pengajuan sudah pernah ditinjau sebelumnya.'; 
  END IF;

  -- Verifikasi hak wewenang
  IF public.is_hr_admin() THEN
    v_is_auth := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_accounts u 
    WHERE u.id::text = v_reviewer 
      AND lower(u.role) IN ('admin','super admin','super_admin','hr','hr manager','hr staff','supervisor','manager','vp','director')
  ) THEN
    v_is_auth := true;
  ELSIF EXISTS (
    SELECT 1 FROM public.user_accounts u
    WHERE u.id::text = v_row.user_id::text
      AND v_reviewer IN (u.supervisor_id::text, u.attendance_supervisor_id::text, u.manager_id::text, u.attendance_manager_id::text, u.vp_id::text, u.attendance_vp_id::text, u.attendance_hr_id::text)
  ) THEN
    v_is_auth := true;
  END IF;

  IF NOT v_is_auth THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED: Anda tidak memiliki wewenang untuk menyetujui pengajuan presensi ini.';
  END IF;

  IF p_status = 'approved' THEN
    SELECT * INTO v_existing_rec 
    FROM public.attendance_records 
    WHERE user_id::text = v_row.user_id::text 
      AND date = COALESCE(v_row.request_date, v_row.start_date)
    FOR UPDATE;

    IF v_existing_rec.id IS NOT NULL THEN
      UPDATE public.attendance_records
      SET clock_in = COALESCE(clock_in, v_row.requested_at),
          check_in_time = COALESCE(check_in_time, v_row.requested_at),
          clock_in_lat = COALESCE(clock_in_lat, v_row.latitude),
          clock_in_lng = COALESCE(clock_in_lng, v_row.longitude),
          photo_url = COALESCE(v_row.photo_url, photo_url),
          check_in_photo_url = COALESCE(v_row.photo_url, check_in_photo_url),
          work_mode = 'dinas',
          status = 'Present',
          notes = TRIM(COALESCE(notes, '') || ' [Dinas Luar Disetujui: ' || COALESCE(v_row.reason, '') || ']'),
          approved_by = v_reviewer,
          approved_at = now(),
          updated_at = now()
      WHERE id = v_existing_rec.id;
    ELSE
      INSERT INTO public.attendance_records(
        user_id, date, clock_in, check_in_time, clock_in_lat, clock_in_lng,
        photo_url, check_in_photo_url, work_mode, status, notes,
        approved_by, approved_at
      ) VALUES (
        v_row.user_id, COALESCE(v_row.request_date, v_row.start_date), v_row.requested_at, v_row.requested_at, v_row.latitude, v_row.longitude,
        v_row.photo_url, v_row.photo_url, 'dinas', 'Present', 'Dinas Luar Disetujui: ' || COALESCE(v_row.reason, ''),
        v_reviewer, now()
      );
    END IF;
  END IF;

  UPDATE public.attendance_requests 
  SET status = p_status, 
      reviewer_id = v_reviewer, 
      reviewed_at = now(), 
      reviewer_note = p_reviewer_note 
  WHERE id = v_row.id 
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
GRANT EXECUTE ON FUNCTION public.review_outside_radius_attendance TO authenticated, anon;


-- C. clock_in_attendance & clock_out_attendance
DROP FUNCTION IF EXISTS public.clock_in_attendance(date, double precision, double precision, text, text, text, text);
DROP FUNCTION IF EXISTS public.clock_in_attendance CASCADE;

CREATE OR REPLACE FUNCTION public.clock_in_attendance(
  p_date date,
  p_lat double precision,
  p_lng double precision,
  p_status text DEFAULT 'present',
  p_notes text DEFAULT null,
  p_photo_url text DEFAULT null,
  p_work_mode text DEFAULT 'wfo'
)
RETURNS public.attendance_records LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user_text text := public.current_account_id();
  v_user_id bigint;
  v_office public.office_locations;
  v_row public.attendance_records;
  v_distance double precision;
  v_schedule record;
  v_sch_json jsonb;
  v_status text := 'present';
  v_is_flex boolean;
  v_cutoff time;
BEGIN
  PERFORM public.validate_attendance_date(p_date);

  SELECT id INTO v_user_id 
  FROM public.user_accounts 
  WHERE id::text = v_user_text 
     OR lower(email) = lower(auth.jwt()->>'email')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := v_user_text::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND: Akun pengguna tidak ditemukan.'; 
  END IF;

  v_user_text := v_user_id::text;

  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN 
    RAISE EXCEPTION 'INVALID_COORDINATES'; 
  END IF;
  IF p_work_mode NOT IN ('wfo','wfh','dinas','client') THEN RAISE EXCEPTION 'INVALID_WORK_MODE'; END IF;
  IF LENGTH(COALESCE(p_notes,'')) > 500 OR LENGTH(COALESCE(p_photo_url,'')) > 2000000 THEN 
    RAISE EXCEPTION 'ATTENDANCE_INPUT_TOO_LARGE'; 
  END IF;
  IF p_work_mode = 'wfh' AND EXISTS (SELECT 1 FROM public.attendance_settings WHERE NOT allow_wfh) THEN 
    RAISE EXCEPTION 'WFH_DISABLED'; 
  END IF;

  SELECT * INTO v_office 
  FROM public.office_locations 
  WHERE is_active 
    AND (
      assignment_mode = 'all' 
      OR v_user_text = ANY(assigned_user_ids)
      OR (address LIKE '%[RESTRICTED_USERS:%' AND address LIKE '%' || v_user_text || '%')
    )
  ORDER BY public.distance_meters(p_lat, p_lng, latitude, longitude) 
  LIMIT 1;

  IF v_office.id IS NOT NULL THEN 
    v_distance := public.distance_meters(p_lat, p_lng, v_office.latitude, v_office.longitude); 
  END IF;

  IF p_work_mode = 'wfo' THEN
    IF v_office.id IS NULL THEN 
      IF EXISTS (SELECT 1 FROM public.office_locations WHERE is_active) THEN
        RAISE EXCEPTION 'LOCATION_RESTRICTED_FOR_USER: Akun Anda tidak ditugaskan pada lokasi kantor ini.';
      ELSE
        RAISE EXCEPTION 'NO_ACTIVE_OFFICE'; 
      END IF;
    END IF;

    IF v_distance > v_office.radius_meters THEN 
      RAISE EXCEPTION 'OUTSIDE_OFFICE_RADIUS: Anda berada di luar radius %m dari % (jarak saat ini: %m)', 
        v_office.radius_meters, v_office.name, ROUND(v_distance::numeric); 
    END IF;
  ELSIF NULLIF(TRIM(p_notes),'') IS NULL THEN 
    RAISE EXCEPTION 'WORK_MODE_NOTE_REQUIRED'; 
  END IF;

  SELECT * INTO v_schedule FROM public.attendance_schedules WHERE is_active ORDER BY created_at LIMIT 1;
  IF v_schedule IS NOT NULL THEN
    v_sch_json := to_jsonb(v_schedule);
    v_is_flex := COALESCE((v_sch_json->>'is_flexible')::boolean, true);
    
    IF v_is_flex THEN
      v_cutoff := COALESCE((v_sch_json->>'flex_end')::time, '10:00:00'::time);
    ELSE
      v_cutoff := (COALESCE((v_sch_json->>'work_start')::time, '08:00:00'::time) + 
                   make_interval(mins => COALESCE((v_sch_json->>'grace_period_minutes')::integer, 15)))::time;
    END IF;

    IF (now() AT TIME ZONE 'Asia/Jakarta')::time > v_cutoff THEN
      v_status := 'late';
    ELSE
      v_status := 'present';
    END IF;
  ELSE
    v_status := 'present';
  END IF;

  INSERT INTO public.attendance_records(
    user_id, date, clock_in, check_in_time, clock_in_lat, clock_in_lng, status, notes, photo_url, work_mode, 
    clock_in_office_id, clock_in_office_name, clock_in_distance_meters
  )
  VALUES (
    v_user_id, p_date, now(), now(), p_lat, p_lng, v_status, p_notes, p_photo_url, p_work_mode, 
    v_office.id, v_office.name, v_distance
  ) 
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION 
  WHEN unique_violation THEN RAISE EXCEPTION 'ATTENDANCE_ALREADY_EXISTS';
END; 
$$;
GRANT EXECUTE ON FUNCTION public.clock_in_attendance TO authenticated, anon;

DROP FUNCTION IF EXISTS public.clock_out_attendance(date, double precision, double precision);
DROP FUNCTION IF EXISTS public.clock_out_attendance CASCADE;

CREATE OR REPLACE FUNCTION public.clock_out_attendance(
  p_date date,
  p_lat double precision,
  p_lng double precision
)
RETURNS public.attendance_records LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user_text text := public.current_account_id();
  v_user_id bigint;
  v_office public.office_locations;
  v_row public.attendance_records;
  v_distance double precision;
BEGIN
  PERFORM public.validate_attendance_date(p_date);

  SELECT id INTO v_user_id 
  FROM public.user_accounts 
  WHERE id::text = v_user_text 
     OR lower(email) = lower(auth.jwt()->>'email')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    BEGIN
      v_user_id := v_user_text::bigint;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  IF v_user_id IS NULL THEN 
    RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND: Akun pengguna tidak ditemukan.'; 
  END IF;

  v_user_text := v_user_id::text;

  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN 
    RAISE EXCEPTION 'INVALID_COORDINATES'; 
  END IF;

  SELECT * INTO v_row 
  FROM public.attendance_records 
  WHERE user_id = v_user_id AND date = p_date 
  FOR UPDATE;

  IF v_row.id IS NULL OR v_row.clock_in IS NULL OR v_row.clock_out IS NOT NULL THEN 
    RAISE EXCEPTION 'CLOCK_IN_NOT_FOUND_OR_ALREADY_OUT'; 
  END IF;

  SELECT * INTO v_office 
  FROM public.office_locations 
  WHERE is_active 
    AND (
      assignment_mode = 'all' 
      OR v_user_text = ANY(assigned_user_ids)
      OR (address LIKE '%[RESTRICTED_USERS:%' AND address LIKE '%' || v_user_text || '%')
    )
  ORDER BY public.distance_meters(p_lat, p_lng, latitude, longitude) 
  LIMIT 1;

  IF v_office.id IS NOT NULL THEN 
    v_distance := public.distance_meters(p_lat, p_lng, v_office.latitude, v_office.longitude); 
  END IF;

  IF v_row.work_mode = 'wfo' AND (v_office.id IS NULL OR v_distance > v_office.radius_meters) THEN 
    RAISE EXCEPTION 'OUTSIDE_OFFICE_RADIUS: Anda berada di luar radius kantor yang ditugaskan.'; 
  END IF;

  UPDATE public.attendance_records 
  SET clock_out = now(),
      check_out_time = now(),
      clock_out_lat = p_lat,
      clock_out_lng = p_lng,
      clock_out_office_id = v_office.id,
      clock_out_office_name = v_office.name,
      clock_out_distance_meters = v_distance,
      total_work_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - clock_in)) / 60)::integer),
      work_duration_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - clock_in)) / 60)::integer),
      updated_at = now()
  WHERE id = v_row.id 
  RETURNING * INTO v_row;

  RETURN v_row;
END; 
$$;
GRANT EXECUTE ON FUNCTION public.clock_out_attendance TO authenticated, anon;


-- D. get_my_leave_balance (Saldo Cuti Sesuai Ketentuan Resmi & Sinkron dengan Dashboard HR)
CREATE OR REPLACE FUNCTION public.get_my_leave_balance(p_as_of date default current_date)
RETURNS TABLE(
  period_id bigint, period_kind text, period_start date, period_end date, employment_type text,
  entitlement_days numeric, carry_forward_days numeric, collective_leave_days numeric, used_days numeric,
  expired_days numeric, remaining_days numeric, status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user_id text := public.current_account_id();
  v_user record;
  v_b record;
  v_year int := extract(year from p_as_of)::int;
  v_entitlement numeric := 0;
  v_carry_forward numeric := 0;
  v_collective numeric := 0;
  v_used numeric := 0;
  v_expired numeric := 0;
  v_adjustments numeric := 0;
  v_remaining numeric := 0;
  v_join date;
  v_tenure_months int := 0;
  v_contract_kind text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_user FROM public.user_accounts WHERE id::text = v_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 1. Cek bila ada ledger spesifik di tabel leave_balance_periods
  SELECT * INTO v_b FROM public.leave_balance_periods
  WHERE user_id::text = v_user_id AND status = 'active' AND period_start <= p_as_of AND period_end >= p_as_of
  ORDER BY period_start DESC NULLS LAST LIMIT 1;

  IF v_b.id IS NOT NULL THEN
    period_id := v_b.id;
    period_kind := coalesce(v_b.period_kind, 'calendar_year');
    period_start := v_b.period_start;
    period_end := v_b.period_end;
    employment_type := coalesce(v_b.employment_type, v_user.contract_type, 'PKWTT');
    entitlement_days := coalesce(v_b.entitlement_days, 0);
    carry_forward_days := coalesce(v_b.carry_forward_days, 0);
    collective_leave_days := coalesce(v_b.collective_leave_days, 0);
    used_days := coalesce(v_b.used_days, 0);
    expired_days := coalesce(v_b.expired_days, 0);
    remaining_days := coalesce(v_b.remaining_days, greatest(0, entitlement_days + carry_forward_days - collective_leave_days - used_days));
    status := coalesce(v_b.status, 'active');
    RETURN NEXT;
    RETURN;
  END IF;

  -- 2. Hitung otomatis kuota sesuai aturan resmi (sinkron dengan leaveQuotaService di HCM Dashboard)
  period_id := 1;
  period_kind := 'calendar_year';
  period_start := date_trunc('year', p_as_of)::date;
  period_end := (date_trunc('year', p_as_of) + interval '1 year - 1 day')::date;
  employment_type := coalesce(v_user.contract_type, v_user.employment_type, 'PKWTT');

  v_contract_kind := upper(coalesce(employment_type, ''));
  v_join := coalesce(v_user.join_date, v_user.contract_start_date);

  IF v_contract_kind LIKE '%PKWTT%' OR v_contract_kind LIKE '%TETAP%' OR v_contract_kind LIKE '%PERMANENT%' THEN
    IF v_join IS NULL THEN
      v_entitlement := 0;
    ELSE
      v_tenure_months := greatest(0, (extract(year from p_as_of) - extract(year from v_join)) * 12 + (extract(month from p_as_of) - extract(month from v_join)));
      IF v_tenure_months < 12 THEN
        v_entitlement := 0;
      ELSIF (extract(year from v_join) + 1) = v_year THEN
        -- Prorata tahun pertama setelah 1 thn: (12 - bulan join)
        v_entitlement := greatest(0, least(12, 12 - extract(month from v_join)));
      ELSE
        v_entitlement := 12;
      END IF;
    END IF;
  ELSIF v_contract_kind LIKE '%PKWT%' OR v_contract_kind LIKE '%KONTRAK%' THEN
    IF v_user.contract_start_date IS NOT NULL AND v_user.contract_end_date IS NOT NULL AND v_user.contract_end_date > v_user.contract_start_date THEN
      v_entitlement := greatest(1, least(12, round((v_user.contract_end_date - v_user.contract_start_date) / 30.44)));
    ELSE
      v_entitlement := 12;
    END IF;
  ELSIF v_contract_kind LIKE '%PROBATION%' OR v_contract_kind LIKE '%PERCOBAAN%' THEN
    v_entitlement := 3;
  ELSE
    v_entitlement := 0;
  END IF;

  -- Cuti bersama resmi SKB 3 Menteri (Prorata untuk karyawan tahun pertama yang baru genap 1 tahun)
  IF v_contract_kind LIKE '%PKWTT%' AND (extract(year from v_join) + 1) = v_year THEN
    -- Hanya memotong cuti bersama yang jatuh SETELAH tanggal anniversary (genap 1 tahun)
    IF v_year = 2026 THEN
      v_collective := CASE WHEN extract(month from v_join) >= 6 THEN 1 ELSE 8 END;
    ELSIF v_year = 2025 THEN
      v_collective := greatest(0, round(((12 - extract(month from v_join))::numeric / 12) * 10));
    ELSE
      v_collective := greatest(0, round(((12 - extract(month from v_join))::numeric / 12) * 8));
    END IF;
  ELSE
    IF v_year = 2025 THEN
      v_collective := 10;
    ELSIF v_year = 2026 THEN
      v_collective := 8;
    ELSIF v_year = 2027 THEN
      v_collective := 8;
    ELSE
      v_collective := 4;
    END IF;
  END IF;

  -- Cuti terpakai (status approved)
  SELECT coalesce(sum(total_days), 0) INTO v_used
  FROM public.leave_requests
  WHERE user_id::text = v_user_id AND status = 'approved' AND leave_type = 'annual'
    AND extract(year from start_date) = v_year;

  -- Penyesuaian kuota oleh HR
  SELECT coalesce(sum((details->>'adjustment_days')::numeric), 0) INTO v_adjustments
  FROM public.user_activity_logs
  WHERE action = 'LEAVE_QUOTA_ADJUSTMENT' AND user_id::text = v_user_id
    AND coalesce((details->>'year')::int, extract(year from created_at)::int) = v_year;

  v_carry_forward := 0;
  v_expired := 0;
  v_remaining := greatest(0, v_entitlement + v_carry_forward + v_adjustments - v_collective - v_used);

  entitlement_days := v_entitlement;
  carry_forward_days := v_carry_forward;
  collective_leave_days := v_collective;
  used_days := v_used;
  expired_days := v_expired;
  remaining_days := v_remaining;
  status := 'active';

  RETURN NEXT;
  RETURN;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_leave_balance TO authenticated, anon;


-- E. get_my_national_id & update_my_avatar
CREATE OR REPLACE FUNCTION public.get_my_national_id() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(nik, 'Belum diisi') FROM public.user_accounts WHERE id::text = public.current_account_id();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_national_id() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.update_my_avatar(p_avatar_url text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user text := public.current_account_id();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND'; END IF;
  UPDATE public.user_accounts SET avatar_url = p_avatar_url, updated_at = now() WHERE id::text = v_user;
  RETURN p_avatar_url;
END; $$;
GRANT EXECUTE ON FUNCTION public.update_my_avatar TO authenticated, anon;


-- ------------------------------------------------------------------------------
-- 10. IZIN AKSES TABEL (RLS & GRANTS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.attendance_request_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access attendance_request_settings" ON public.attendance_request_settings;
CREATE POLICY "Public full access attendance_request_settings" ON public.attendance_request_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access attendance_correction_requests" ON public.attendance_correction_requests;
CREATE POLICY "Public full access attendance_correction_requests" ON public.attendance_correction_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access attendance_requests" ON public.attendance_requests;
CREATE POLICY "Public full access attendance_requests" ON public.attendance_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access company_news" ON public.company_news;
CREATE POLICY "Public full access company_news" ON public.company_news FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access approval_records" ON public.approval_records;
CREATE POLICY "Public full access approval_records" ON public.approval_records FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.attendance_request_settings TO authenticated, anon;
GRANT ALL ON public.attendance_correction_requests TO authenticated, anon;
GRANT ALL ON public.attendance_requests TO authenticated, anon;
GRANT ALL ON public.attendance_records TO authenticated, anon;
GRANT ALL ON public.leave_requests TO authenticated, anon;
GRANT ALL ON public.overtime_requests TO authenticated, anon;
GRANT ALL ON public.reimbursements TO authenticated, anon;
GRANT ALL ON public.approval_records TO authenticated, anon;
GRANT ALL ON public.company_news TO authenticated, anon;
GRANT ALL ON public.office_locations TO authenticated, anon;
GRANT ALL ON public.user_accounts TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 10. FUNGSI workforce_approval_chain (HIERARKI RESMI 3 TINGKAT: SPV, HR, MANAGER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.workforce_approval_chain(p_user_id text)
RETURNS TABLE(level_number integer, approver_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH raw_slots AS (
    SELECT 
      ord,
      approver_text
    FROM public.user_accounts u
    CROSS JOIN LATERAL (VALUES
      (1, COALESCE(u.attendance_supervisor_id, u.supervisor_id)::text),
      (2, u.attendance_hr_id::text),
      (3, COALESCE(u.attendance_manager_id, u.manager_id)::text),
      (4, CASE 
            WHEN COALESCE(u.attendance_vp_id, u.vp_id)::text <> COALESCE(u.attendance_manager_id, u.manager_id)::text 
            THEN COALESCE(u.attendance_vp_id, u.vp_id)::text 
            ELSE NULL 
          END)
    ) AS s(ord, approver_text)
    WHERE u.id::text = p_user_id AND s.approver_text IS NOT NULL AND TRIM(s.approver_text) <> ''
  ),
  deduped AS (
    SELECT 
      approver_text,
      MIN(ord) AS first_ord
    FROM raw_slots
    GROUP BY approver_text
  )
  SELECT 
    ROW_NUMBER() OVER (ORDER BY first_ord)::integer AS level_number,
    approver_text AS approver_id
  FROM deduped
  ORDER BY first_ord;
$$;
GRANT EXECUTE ON FUNCTION public.workforce_approval_chain TO authenticated, anon;

-- Bersihkan data VP duplikat di user_accounts agar alur approval murni 3 tingkat
UPDATE public.user_accounts
SET vp_id = NULL,
    attendance_vp_id = NULL
WHERE attendance_vp_id IS NOT NULL OR vp_id IS NOT NULL;

-- Refresh cache schema PostgREST agar seluruh aplikasi mendeteksi perubahan seketika
NOTIFY pgrst, 'reload schema';
