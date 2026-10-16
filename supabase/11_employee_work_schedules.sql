-- ==============================================================================
-- GESIT HCM SYSTEM: MIGRATION 11 - PER-EMPLOYEE WORK SCHEDULES (NON-FLEXIBLE & SHIFTS)
-- ==============================================================================
-- Fitur:
-- 1. Penugasan jadwal jam kerja tetap / non-fleksibel per karyawan tertentu
--    Contoh: Karyawan A masuk 07:00 - 16:00, Karyawan B masuk 09:00 - 18:00
-- 2. Master shift / attendance_schedules mendukung banyak shift bersamaan
-- 3. clock_in_attendance() otomatis mengevaluasi keterlambatan berdasarkan
--    jadwal khusus karyawan masing-masing (atau fallback ke default fleksibel)
-- ==============================================================================

BEGIN;

-- 1. Tambah kolom jadwal ke public.user_accounts jika belum ada
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS schedule_id BIGINT REFERENCES public.attendance_schedules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_schedule_type TEXT DEFAULT 'default', -- 'default', 'shift', 'custom'
  ADD COLUMN IF NOT EXISTS custom_work_start TIME,
  ADD COLUMN IF NOT EXISTS custom_work_end TIME,
  ADD COLUMN IF NOT EXISTS custom_grace_period_minutes INTEGER DEFAULT 15;

CREATE INDEX IF NOT EXISTS idx_user_accounts_schedule_id ON public.user_accounts(schedule_id);

-- 2. Pastikan tabel public.attendance_schedules memiliki master shift standar
-- Shift Pagi 07:00 - 16:00 (Non-Fleksibel / Jam Tetap)
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Shift Pagi (07:00 - 16:00)', '07:00:00', '16:00:00', 15, false, '07:00:00', '10:00:00', 9, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.attendance_schedules WHERE name ILIKE '%07:00 - 16:00%' OR name ILIKE '%Shift Pagi%'
);

-- Shift Siang 09:00 - 18:00 (Non-Fleksibel / Jam Tetap)
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Shift Siang (09:00 - 18:00)', '09:00:00', '18:00:00', 15, false, '09:00:00', '11:00:00', 9, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.attendance_schedules WHERE name ILIKE '%09:00 - 18:00%' OR name ILIKE '%Shift Siang%'
);

-- Shift Normal 08:30 - 17:30 (Non-Fleksibel / Jam Tetap)
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Shift Normal (08:30 - 17:30)', '08:30:00', '17:30:00', 15, false, '08:30:00', '10:00:00', 9, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.attendance_schedules WHERE name ILIKE '%08:30 - 17:30%' OR name ILIKE '%Shift Normal%'
);

-- Pastikan ada Jadwal Fleksibel Default jika belum ada
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)', '07:00:00', '19:00:00', 180, true, '07:00:00', '10:00:00', 9, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.attendance_schedules WHERE is_flexible = true
);


-- 3. Perbarui fungsi clock_in_attendance() untuk mengenali jadwal per karyawan
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
  v_user_rec record;
  v_office public.office_locations;
  v_row public.attendance_records;
  v_distance double precision;
  v_schedule record;
  v_sch_json jsonb;
  v_status text := 'present';
  v_is_flex boolean := true;
  v_cutoff time;
  v_work_start time;
  v_grace integer := 15;
BEGIN
  PERFORM public.validate_attendance_date(p_date);

  -- Dapatkan user_id dan record user_accounts lengkap
  SELECT * INTO v_user_rec 
  FROM public.user_accounts 
  WHERE id::text = v_user_text 
     OR lower(email) = lower(auth.jwt()->>'email')
  LIMIT 1;

  IF v_user_rec.id IS NULL THEN
    BEGIN
      v_user_id := v_user_text::bigint;
      SELECT * INTO v_user_rec FROM public.user_accounts WHERE id = v_user_id LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_rec := NULL;
    END;
  END IF;

  IF v_user_rec.id IS NULL THEN 
    RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND: Akun pengguna tidak ditemukan.'; 
  END IF;

  v_user_id := v_user_rec.id;
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

  -- Cari kantor aktif terdekat yang mengizinkan akun user ini
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

  -- ==============================================================================
  -- Evaluasi Jadwal Kerja (Prioritas: Custom User -> Shift User -> Default Global)
  -- ==============================================================================
  IF v_user_rec.work_schedule_type = 'custom' AND v_user_rec.custom_work_start IS NOT NULL THEN
    -- Karyawan menggunakan jam khusus manual (Tetap / Non-Fleksibel)
    v_is_flex := false;
    v_work_start := v_user_rec.custom_work_start;
    v_grace := COALESCE(v_user_rec.custom_grace_period_minutes, 15);
    v_cutoff := (v_work_start + make_interval(mins => v_grace))::time;
  ELSIF v_user_rec.schedule_id IS NOT NULL THEN
    -- Karyawan ditugaskan ke Shift tertentu pada attendance_schedules
    SELECT * INTO v_schedule FROM public.attendance_schedules WHERE id = v_user_rec.schedule_id;
    IF v_schedule IS NOT NULL THEN
      v_sch_json := to_jsonb(v_schedule);
      v_is_flex := COALESCE((v_sch_json->>'is_flexible')::boolean, false);
      IF v_is_flex THEN
        v_cutoff := COALESCE((v_sch_json->>'flex_end')::time, '10:00:00'::time);
      ELSE
        v_work_start := COALESCE((v_sch_json->>'work_start')::time, '08:00:00'::time);
        v_grace := COALESCE((v_sch_json->>'grace_period_minutes')::integer, 15);
        v_cutoff := (v_work_start + make_interval(mins => v_grace))::time;
      END IF;
    END IF;
  END IF;

  -- Jika belum didapatkan dari user (default/null), gunakan jadwal aktif global
  IF v_cutoff IS NULL THEN
    SELECT * INTO v_schedule FROM public.attendance_schedules WHERE is_active ORDER BY created_at LIMIT 1;
    IF v_schedule IS NOT NULL THEN
      v_sch_json := to_jsonb(v_schedule);
      v_is_flex := COALESCE((v_sch_json->>'is_flexible')::boolean, true);
      IF v_is_flex THEN
        v_cutoff := COALESCE((v_sch_json->>'flex_end')::time, '10:00:00'::time);
      ELSE
        v_work_start := COALESCE((v_sch_json->>'work_start')::time, '08:00:00'::time);
        v_grace := COALESCE((v_sch_json->>'grace_period_minutes')::integer, 15);
        v_cutoff := (v_work_start + make_interval(mins => v_grace))::time;
      END IF;
    ELSE
      v_cutoff := '10:00:00'::time;
    END IF;
  END IF;

  -- Penentuan status keterlambatan (WIB / Asia/Jakarta)
  IF (now() AT TIME ZONE 'Asia/Jakarta')::time > v_cutoff THEN
    v_status := 'late';
  ELSE
    v_status := 'present';
  END IF;

  INSERT INTO public.attendance_records(
    user_id, date, clock_in, clock_in_lat, clock_in_lng, status, notes, photo_url, work_mode, 
    clock_in_office_id, clock_in_office_name, clock_in_distance_meters
  )
  VALUES (
    v_user_id, p_date, now(), p_lat, p_lng, v_status, p_notes, p_photo_url, p_work_mode, 
    v_office.id, v_office.name, v_distance
  ) 
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION 
  WHEN unique_violation THEN RAISE EXCEPTION 'ATTENDANCE_ALREADY_EXISTS';
END; 
$$;

GRANT EXECUTE ON FUNCTION public.clock_in_attendance TO authenticated, anon;

-- Refresh cache PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
