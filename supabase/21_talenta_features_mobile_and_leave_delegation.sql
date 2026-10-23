-- ==============================================================================
-- MIGRASI: FITUR TALENTA - LIVE ATTENDANCE MOBILE SETUP & LEAVE DELEGATION
-- ==============================================================================

BEGIN;

-- 1. Penambahan Kolom Mobile Live Attendance pada attendance_settings
ALTER TABLE public.attendance_settings
  ADD COLUMN IF NOT EXISTS require_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_recognition boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS strict_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sunglasses_masks_validation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS liveness_detection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS live_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_break_start boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apply_break_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rule_target text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS selected_employee_ids jsonb DEFAULT '[]'::jsonb;

-- 2. Penambahan Kolom Delegasi Approval & Tipe Pengajuan (Half-day) pada leave_requests
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS delegate_user_id text,
  ADD COLUMN IF NOT EXISTS delegate_user_name text,
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'full_day',
  ADD COLUMN IF NOT EXISTS delegate_notes text;

COMMIT;
