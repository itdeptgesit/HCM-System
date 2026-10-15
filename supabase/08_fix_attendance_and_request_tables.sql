-- ==============================================================================
-- 08_fix_attendance_and_request_tables.sql
-- Memperbaiki error pada app-absen:
-- "Struktur data belum lengkap di server. Hubungi admin/HR"
-- 
-- Melengkapi kolom-kolom pada tabel pengajuan presensi & cuti agar kompatibel 
-- dengan app-absen dan app-hr.
-- ==============================================================================

-- 1. Lengkapi kolom pada attendance_correction_requests (Koreksi Presensi)
ALTER TABLE public.attendance_correction_requests
  ADD COLUMN IF NOT EXISTS attendance_date date,
  ADD COLUMN IF NOT EXISTS clock_in_time timestamptz,
  ADD COLUMN IF NOT EXISTS clock_out_time timestamptz,
  ADD COLUMN IF NOT EXISTS requested_check_in timestamptz,
  ADD COLUMN IF NOT EXISTS requested_check_out timestamptz,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Sinkronisasi data jika ada baris lama (menggunakan kolom date / requested_check_in)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_correction_requests' AND column_name = 'date') THEN
    UPDATE public.attendance_correction_requests
    SET attendance_date = COALESCE(attendance_date, date)
    WHERE attendance_date IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_correction_requests' AND column_name = 'requested_check_in') THEN
    UPDATE public.attendance_correction_requests
    SET clock_in_time = COALESCE(clock_in_time, requested_check_in)
    WHERE clock_in_time IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_correction_requests' AND column_name = 'requested_check_out') THEN
    UPDATE public.attendance_correction_requests
    SET clock_out_time = COALESCE(clock_out_time, requested_check_out)
    WHERE clock_out_time IS NULL;
  END IF;
END $$;

-- Pastikan ada UNIQUE constraint untuk user_id dan attendance_date (dibutuhkan saat ON CONFLICT upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_correction_requests_user_date_key'
  ) THEN
    -- Hapus duplikasi jika ada sebelum membuat constraint unik
    DELETE FROM public.attendance_correction_requests a
    USING public.attendance_correction_requests b
    WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND a.attendance_date = b.attendance_date;

    ALTER TABLE public.attendance_correction_requests 
      ADD CONSTRAINT attendance_correction_requests_user_date_key UNIQUE (user_id, attendance_date);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Abaikan jika constraint sudah ada dalam bentuk lain
  NULL;
END $$;


-- 2. Lengkapi kolom pada attendance_requests (Dinas Luar / Absen Luar Radius)
ALTER TABLE public.attendance_requests
  ADD COLUMN IF NOT EXISTS request_date date,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text,
  ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_requests' AND column_name = 'start_date') THEN
    UPDATE public.attendance_requests
    SET request_date = COALESCE(request_date, start_date)
    WHERE request_date IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_requests_user_request_date_key'
  ) THEN
    DELETE FROM public.attendance_requests a
    USING public.attendance_requests b
    WHERE a.id < b.id 
      AND a.user_id = b.user_id 
      AND a.request_date = b.request_date;

    ALTER TABLE public.attendance_requests 
      ADD CONSTRAINT attendance_requests_user_request_date_key UNIQUE (user_id, request_date);
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;


-- 3. Pastikan tabel attendance_request_settings ada dan memiliki nilai default
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


-- 4. Pastikan leave_requests dan overtime_requests memiliki kolom approval bertingkat
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text;

ALTER TABLE public.overtime_requests
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS current_approval_level integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewer_id text,
  ADD COLUMN IF NOT EXISTS reviewer_note text;


-- 5. Hak Akses (Permissions & RLS)
ALTER TABLE public.attendance_request_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read attendance_request_settings" ON public.attendance_request_settings;
CREATE POLICY "Public read attendance_request_settings" ON public.attendance_request_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public full access attendance_request_settings" ON public.attendance_request_settings;
CREATE POLICY "Public full access attendance_request_settings" ON public.attendance_request_settings FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.attendance_request_settings TO authenticated, anon;
GRANT ALL ON public.attendance_correction_requests TO authenticated, anon;
GRANT ALL ON public.attendance_requests TO authenticated, anon;
GRANT ALL ON public.leave_requests TO authenticated, anon;
GRANT ALL ON public.overtime_requests TO authenticated, anon;

-- Refresh cache skema PostgREST agar app-absen langsung mendeteksi kolom baru
NOTIFY pgrst, 'reload schema';
