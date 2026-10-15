-- ==============================================================================
-- 06_live_attendance_and_corrections.sql
-- Penanganan Live Attendance Luar Radius (Dinas Luar) & Koreksi Absen (Lupa Absen Masuk/Pulang/Seharian)
-- ==============================================================================

-- 1. Pastikan tabel attendance_requests dan attendance_correction_requests memiliki kolom pendukung
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_requests' AND column_name = 'reviewer_note') THEN
    ALTER TABLE public.attendance_requests ADD COLUMN reviewer_note text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_correction_requests' AND column_name = 'reviewer_note') THEN
    ALTER TABLE public.attendance_correction_requests ADD COLUMN reviewer_note text;
  END IF;
END $$;

-- 2. Fungsi Pengajuan Live Attendance Luar Radius (Dinas Luar)
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


-- 3. Fungsi Approval HR untuk Live Attendance Luar Radius
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance(uuid, text, text);
DROP FUNCTION IF EXISTS public.review_outside_radius_attendance CASCADE;

CREATE OR REPLACE FUNCTION public.review_outside_radius_attendance(
  p_request_id uuid,
  p_status text,
  p_reviewer_note text DEFAULT NULL
) RETURNS public.attendance_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.attendance_requests;
  v_reviewer text := public.current_account_id();
  v_existing_rec public.attendance_records;
BEGIN
  IF NOT public.is_hr_admin() THEN 
    RAISE EXCEPTION 'NOT_AUTHORIZED: Hanya Tim HR / Admin yang dapat menyetujui pengajuan presensi.'; 
  END IF;
  
  IF p_status NOT IN ('approved', 'rejected') THEN 
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS: Status hanya boleh approved atau rejected.'; 
  END IF;

  SELECT * INTO v_row FROM public.attendance_requests WHERE id = p_request_id FOR UPDATE;
  IF v_row.id IS NULL THEN 
    RAISE EXCEPTION 'REQUEST_NOT_FOUND: Pengajuan tidak ditemukan.'; 
  END IF;

  IF v_row.status <> 'pending' THEN 
    RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: Pengajuan sudah pernah ditinjau sebelumnya.'; 
  END IF;

  IF v_row.user_id = v_reviewer THEN 
    RAISE EXCEPTION 'CANNOT_REVIEW_OWN_REQUEST: Anda tidak dapat menyetujui pengajuan Anda sendiri.'; 
  END IF;

  IF p_status = 'approved' THEN
    -- Cek apakah sudah ada record attendance pada tanggal tersebut
    SELECT * INTO v_existing_rec 
    FROM public.attendance_records 
    WHERE user_id = v_row.user_id AND date = v_row.request_date 
    FOR UPDATE;

    IF v_existing_rec.id IS NOT NULL THEN
      -- Update record yang sudah ada
      UPDATE public.attendance_records
      SET clock_in = COALESCE(clock_in, v_row.requested_at),
          clock_in_lat = COALESCE(clock_in_lat, v_row.latitude),
          clock_in_lng = COALESCE(clock_in_lng, v_row.longitude),
          photo_url = COALESCE(v_row.photo_url, photo_url),
          work_mode = 'dinas',
          status = 'present',
          total_work_minutes = CASE 
            WHEN clock_out IS NOT NULL AND COALESCE(clock_in, v_row.requested_at) IS NOT NULL
            THEN GREATEST(0, ROUND(EXTRACT(EPOCH FROM (clock_out - COALESCE(clock_in, v_row.requested_at))) / 60)::integer)
            ELSE total_work_minutes
          END,
          notes = TRIM(COALESCE(notes, '') || ' [Dinas Luar Disetujui HR: ' || COALESCE(v_row.reason, '') || ']'),
          approved_by = v_reviewer,
          approved_at = now(),
          updated_at = now()
      WHERE id = v_existing_rec.id;
    ELSE
      -- Insert record baru jika belum ada
      INSERT INTO public.attendance_records(
        user_id, date, clock_in, clock_in_lat, clock_in_lng, photo_url,
        work_mode, status, notes, approved_by, approved_at
      ) VALUES (
        v_row.user_id,
        v_row.request_date,
        v_row.requested_at,
        v_row.latitude,
        v_row.longitude,
        v_row.photo_url,
        'dinas',
        'present',
        'Dinas Luar Disetujui HR: ' || COALESCE(v_row.reason, ''),
        v_reviewer,
        now()
      );
    END IF;
  END IF;

  UPDATE public.attendance_requests
  SET status = p_status,
      reviewer_id = v_reviewer,
      reviewed_at = now(),
      reviewer_note = p_reviewer_note
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_outside_radius_attendance TO authenticated, anon;


-- 4. Fungsi Pengajuan Koreksi Absen (Lupa Masuk, Lupa Pulang, atau Lupa Seharian)
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


-- 5. Fungsi Approval HR untuk Koreksi Absen (Lupa Masuk/Pulang/Seharian)
DROP FUNCTION IF EXISTS public.review_attendance_correction_request(uuid, text, text);
DROP FUNCTION IF EXISTS public.review_attendance_correction_request CASCADE;

CREATE OR REPLACE FUNCTION public.review_attendance_correction_request(
  p_request_id uuid,
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
BEGIN
  IF NOT public.is_hr_admin() THEN 
    RAISE EXCEPTION 'NOT_AUTHORIZED: Hanya Tim HR / Admin yang dapat menyetujui pengajuan koreksi presensi.'; 
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN 
    RAISE EXCEPTION 'INVALID_REVIEW_STATUS: Status hanya boleh approved atau rejected.'; 
  END IF;

  SELECT * INTO v_row FROM public.attendance_correction_requests WHERE id = p_request_id FOR UPDATE;
  IF v_row.id IS NULL THEN 
    RAISE EXCEPTION 'REQUEST_NOT_FOUND: Pengajuan tidak ditemukan.'; 
  END IF;

  IF v_row.status <> 'pending' THEN 
    RAISE EXCEPTION 'REQUEST_ALREADY_REVIEWED: Pengajuan sudah pernah ditinjau sebelumnya.'; 
  END IF;

  IF v_row.user_id = v_reviewer THEN 
    RAISE EXCEPTION 'CANNOT_REVIEW_OWN_REQUEST: Anda tidak dapat menyetujui pengajuan Anda sendiri.'; 
  END IF;

  IF p_status = 'approved' THEN
    SELECT * INTO v_existing_rec 
    FROM public.attendance_records 
    WHERE user_id = v_row.user_id AND date = v_row.attendance_date 
    FOR UPDATE;

    IF v_existing_rec.id IS NOT NULL THEN
      -- Skenario: Karyawan sudah absen masuk tapi lupa pulang (atau sebaliknya)
      v_final_in := COALESCE(v_row.clock_in_time, v_existing_rec.clock_in);
      v_final_out := COALESCE(v_row.clock_out_time, v_existing_rec.clock_out);

      IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL AND v_final_out < v_final_in THEN
        RAISE EXCEPTION 'INVALID_TIME_RANGE: Jam pulang tidak boleh lebih awal dari jam masuk.';
      END IF;

      IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL THEN
        v_work_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_final_out - v_final_in)) / 60)::integer);
      ELSE
        v_work_minutes := COALESCE(v_existing_rec.total_work_minutes, 0);
      END IF;

      UPDATE public.attendance_records
      SET clock_in = v_final_in,
          clock_out = v_final_out,
          status = 'present',
          total_work_minutes = v_work_minutes,
          notes = TRIM(COALESCE(notes, '') || ' [Koreksi Disetujui HR: ' || COALESCE(v_row.reason, '') || ']'),
          approved_by = v_reviewer,
          approved_at = now(),
          updated_at = now()
      WHERE id = v_existing_rec.id;
    ELSE
      -- Skenario: Karyawan lupa absen seharian (tidak ada clock_in dan clock_out sama sekali)
      v_final_in := v_row.clock_in_time;
      v_final_out := v_row.clock_out_time;

      IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL AND v_final_out < v_final_in THEN
        RAISE EXCEPTION 'INVALID_TIME_RANGE: Jam pulang tidak boleh lebih awal dari jam masuk.';
      END IF;

      IF v_final_in IS NOT NULL AND v_final_out IS NOT NULL THEN
        v_work_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (v_final_out - v_final_in)) / 60)::integer);
      END IF;

      INSERT INTO public.attendance_records(
        user_id, date, clock_in, clock_out, status, notes, total_work_minutes, approved_by, approved_at
      ) VALUES (
        v_row.user_id,
        v_row.attendance_date,
        v_final_in,
        v_final_out,
        'present',
        'Koreksi Presensi Disetujui HR: ' || COALESCE(v_row.reason, ''),
        v_work_minutes,
        v_reviewer,
        now()
      );
    END IF;
  END IF;

  UPDATE public.attendance_correction_requests
  SET status = p_status,
      reviewer_id = v_reviewer,
      reviewed_at = now(),
      reviewer_note = p_reviewer_note
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_attendance_correction_request TO authenticated, anon;
