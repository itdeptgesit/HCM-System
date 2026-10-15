-- ==============================================================================
-- 07_fix_attendance_schedule_columns.sql
-- Memperbaiki:
-- 1. Error: record "v_schedule" has no field "is_flexible"
-- 2. Error: column "user_id" is of type bigint but expression of type text
-- ==============================================================================

-- 1. Pastikan kolom fleksibel ada di public.attendance_schedules
ALTER TABLE public.attendance_schedules 
  ADD COLUMN IF NOT EXISTS is_flexible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS flex_start time NOT NULL DEFAULT '07:00:00',
  ADD COLUMN IF NOT EXISTS flex_end time NOT NULL DEFAULT '10:00:00',
  ADD COLUMN IF NOT EXISTS required_work_hours numeric NOT NULL DEFAULT 9;

-- Isi data yang NULL jika ada
UPDATE public.attendance_schedules 
SET is_flexible = COALESCE(is_flexible, true),
    flex_start = COALESCE(flex_start, '07:00:00'::time),
    flex_end = COALESCE(flex_end, '10:00:00'::time),
    required_work_hours = COALESCE(required_work_hours, 9)
WHERE is_flexible IS NULL OR flex_start IS NULL OR flex_end IS NULL;

-- Pastikan minimal ada 1 jadwal aktif
INSERT INTO public.attendance_schedules (name, work_start, work_end, grace_period_minutes, is_flexible, flex_start, flex_end, required_work_hours, is_active)
SELECT 'Jam Kerja Fleksibel (07:00 - 10:00, 9 Jam)', '07:00:00', '10:00:00', 180, true, '07:00:00', '10:00:00', 9, true
WHERE NOT EXISTS (SELECT 1 FROM public.attendance_schedules WHERE is_active);


-- 2. Fungsi clock_in_attendance yang aman dengan tipe user_id BIGINT
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

  -- Dapatkan user_id sebagai BIGINT (sesuai tipe kolom user_id pada tabel attendance_records)
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

  -- Evaluasi jadwal kerja secara aman (kebal terhadap missing field)
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


-- 3. Fungsi clock_out_attendance dengan tipe user_id BIGINT
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

  -- Dapatkan user_id sebagai BIGINT
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
      clock_out_lat = p_lat,
      clock_out_lng = p_lng,
      clock_out_office_id = v_office.id,
      clock_out_office_name = v_office.name,
      clock_out_distance_meters = v_distance,
      total_work_minutes = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - clock_in)) / 60)::integer),
      updated_at = now()
  WHERE id = v_row.id 
  RETURNING * INTO v_row;

  RETURN v_row;
END; 
$$;

GRANT EXECUTE ON FUNCTION public.clock_out_attendance TO authenticated, anon;


-- 4. Fungsi submit_outside_radius_attendance (Dinas Luar) dengan tipe user_id BIGINT
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
    user_id, request_date, latitude, longitude, photo_url, reason, status, requested_at,
    reviewer_id, reviewed_at, reviewer_note
  ) VALUES (
    v_user_id, p_date, p_lat, p_lng, p_photo_url, TRIM(COALESCE(p_reason, 'Dinas Luar / Luar Radius')), 'pending', now(),
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


-- 5. Fungsi submit_attendance_correction_request (Koreksi Absen) dengan tipe user_id BIGINT
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
    user_id, attendance_date, clock_in_time, clock_out_time, reason, status, requested_at,
    reviewer_id, reviewed_at, reviewer_note
  ) VALUES (
    v_user_id, p_attendance_date, p_clock_in, p_clock_out, TRIM(p_reason), 'pending', now(),
    NULL, NULL, NULL
  )
  ON CONFLICT (user_id, attendance_date) DO UPDATE
    SET clock_in_time = EXCLUDED.clock_in_time,
        clock_out_time = EXCLUDED.clock_out_time,
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
