-- ==============================================================================
-- GESIT HCM — PEMBATASAN LOKASI ABSENSI PER AKUN KARYAWAN (LOCATION RESTRICTIONS)
-- File: supabase/05_office_location_restrictions.sql
-- ==============================================================================

-- 1. Tambah Kolom Mode Penugasan & Daftar Karyawan yang Diizinkan pada office_locations
ALTER TABLE public.office_locations 
ADD COLUMN IF NOT EXISTS assignment_mode text NOT NULL DEFAULT 'all' 
CHECK (assignment_mode IN ('all', 'restricted'));

ALTER TABLE public.office_locations 
ADD COLUMN IF NOT EXISTS assigned_user_ids text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_office_locations_assignment_mode ON public.office_locations(assignment_mode);

-- 2. Update Fungsi clock_in_attendance untuk Memvalidasi Penugasan Akun
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
  v_user text := public.current_account_id();
  v_office public.office_locations;
  v_row public.attendance_records;
  v_distance double precision;
  v_schedule public.attendance_schedules;
  v_status text;
BEGIN
  PERFORM public.validate_attendance_date(p_date);
  IF v_user IS NULL THEN RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND'; END IF;
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
  -- (yaitu kantor yang assignment_mode = 'all' ATAU v_user terdaftar dalam assigned_user_ids)
  SELECT * INTO v_office 
  FROM public.office_locations 
  WHERE is_active 
    AND (
      assignment_mode = 'all' 
      OR v_user = ANY(assigned_user_ids)
      OR (address LIKE '%[RESTRICTED_USERS:%' AND address LIKE '%' || v_user || '%')
    )
  ORDER BY public.distance_meters(p_lat, p_lng, latitude, longitude) 
  LIMIT 1;

  IF v_office.id IS NOT NULL THEN 
    v_distance := public.distance_meters(p_lat, p_lng, v_office.latitude, v_office.longitude); 
  END IF;

  IF p_work_mode = 'wfo' THEN
    IF v_office.id IS NULL THEN 
      -- Cek apakah ada kantor terdekat tetapi user tidak diizinkan di situ
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
  v_status := CASE 
    WHEN v_schedule.id IS NOT NULL AND (now() AT TIME ZONE 'Asia/Jakarta')::time >
      (CASE WHEN v_schedule.is_flexible THEN v_schedule.flex_end ELSE (v_schedule.work_start + make_interval(mins=>v_schedule.grace_period_minutes))::time END) 
    THEN 'late' 
    ELSE 'present' 
  END;

  INSERT INTO public.attendance_records(
    user_id, date, clock_in, clock_in_lat, clock_in_lng, status, notes, photo_url, work_mode, 
    clock_in_office_id, clock_in_office_name, clock_in_distance_meters
  )
  VALUES (
    v_user, p_date, now(), p_lat, p_lng, v_status, p_notes, p_photo_url, p_work_mode, 
    v_office.id, v_office.name, v_distance
  ) 
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION 
  WHEN unique_violation THEN RAISE EXCEPTION 'ATTENDANCE_ALREADY_EXISTS';
END; 
$$;

-- 3. Update Fungsi clock_out_attendance
CREATE OR REPLACE FUNCTION public.clock_out_attendance(
  p_date date,
  p_lat double precision,
  p_lng double precision
)
RETURNS public.attendance_records LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_user text := public.current_account_id();
  v_office public.office_locations;
  v_row public.attendance_records;
  v_distance double precision;
BEGIN
  PERFORM public.validate_attendance_date(p_date);
  IF v_user IS NULL THEN RAISE EXCEPTION 'USER_ACCOUNT_NOT_FOUND'; END IF;
  IF p_lat IS NULL OR p_lng IS NULL OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180 THEN 
    RAISE EXCEPTION 'INVALID_COORDINATES'; 
  END IF;

  SELECT * INTO v_row FROM public.attendance_records WHERE user_id = v_user AND date = p_date FOR UPDATE;
  IF v_row.id IS NULL OR v_row.clock_in IS NULL OR v_row.clock_out IS NOT NULL THEN 
    RAISE EXCEPTION 'CLOCK_IN_NOT_FOUND_OR_ALREADY_OUT'; 
  END IF;

  SELECT * INTO v_office 
  FROM public.office_locations 
  WHERE is_active 
    AND (
      assignment_mode = 'all' 
      OR v_user = ANY(assigned_user_ids)
      OR (address LIKE '%[RESTRICTED_USERS:%' AND address LIKE '%' || v_user || '%')
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
