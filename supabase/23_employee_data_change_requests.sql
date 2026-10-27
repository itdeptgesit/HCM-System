-- ==============================================================================
-- 23_employee_data_change_requests.sql
-- Tabel untuk mengelola persetujuan (approval) perubahan data karyawan oleh HR Manager
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.employee_data_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id bigint NOT NULL REFERENCES public.user_accounts(id) ON DELETE CASCADE,
  employee_name text NOT NULL,
  employee_code text,
  department text,
  company text,
  requested_by_id text NOT NULL,
  requested_by_name text NOT NULL,
  requested_by_role text,
  source text NOT NULL DEFAULT 'profile', -- 'self_service' | 'hr_data_manager'
  status text NOT NULL DEFAULT 'Pending', -- 'Pending' | 'Approved' | 'Rejected'
  original_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_fields text[] DEFAULT '{}',
  review_notes text,
  reviewed_by_id text,
  reviewed_by_name text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index untuk performa query
CREATE INDEX IF NOT EXISTS idx_emp_change_requests_status ON public.employee_data_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_emp_change_requests_employee ON public.employee_data_change_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_change_requests_created ON public.employee_data_change_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.employee_data_change_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Akses penuh employee_data_change_requests" ON public.employee_data_change_requests;
DROP POLICY IF EXISTS "employee_data_change_requests_policy" ON public.employee_data_change_requests;

-- RLS Policy: Akses untuk authenticated dan service_role
CREATE POLICY "Akses penuh employee_data_change_requests"
  ON public.employee_data_change_requests
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- Grant privileges
GRANT ALL ON TABLE public.employee_data_change_requests TO anon, authenticated, service_role;
