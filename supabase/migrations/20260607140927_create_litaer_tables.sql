/*
# Create Litaer Project Management Tables

1. New Tables
- `employees`: Staff records linked to auth.users. Columns: id (uuid PK), user_id (uuid FK→auth.users), name, phone (unique), project_region, group_name, role (employee/manager), created_at.
- `daily_reports`: Daily leak-point reports. Columns: id (uuid PK), employee_id (uuid FK→employees), report_date, project_name, leak_count, note, created_at.
- `monthly_targets`: Monthly & weekly targets per employee. Columns: id (uuid PK), employee_id (uuid FK→employees), target_month, monthly_target, week1-5 targets, created_at.
- `phone_verifications`: OTP codes for phone login. Columns: id (uuid PK), phone, code, expires_at, used (boolean), created_at.

2. Security
- RLS enabled on all tables.
- employees: users read/update own profile; managers read/insert/update/delete all.
- daily_reports: employees CRUD own reports; managers read all, delete any.
- monthly_targets: employees read own; managers full CRUD.
- phone_verifications: service-role only (via edge function); no direct user access.

3. Indexes
- employees.user_id, employees.phone
- daily_reports.employee_id, daily_reports.report_date
- monthly_targets.employee_id, monthly_targets.target_month
- phone_verifications.phone+code (for lookup)
*/

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  project_region text NOT NULL DEFAULT '',
  group_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_phone ON employees(phone);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a manager?
-- (We inline this check in policies since helper functions can't reference auth.uid() easily)

DROP POLICY IF EXISTS "employees_select_own" ON employees;
CREATE POLICY "employees_select_own" ON employees FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "employees_insert_manager" ON employees;
CREATE POLICY "employees_insert_manager" ON employees FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "employees_update_own_or_manager" ON employees;
CREATE POLICY "employees_update_own_or_manager" ON employees FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "employees_delete_manager" ON employees;
CREATE POLICY "employees_delete_manager" ON employees FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

-- Daily reports table
CREATE TABLE IF NOT EXISTS daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT current_date,
  project_name text NOT NULL DEFAULT '',
  leak_count integer NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_employee_id ON daily_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_report_date ON daily_reports(report_date);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_own_or_manager" ON daily_reports;
CREATE POLICY "reports_select_own_or_manager" ON daily_reports FOR SELECT
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "reports_insert_own" ON daily_reports;
CREATE POLICY "reports_insert_own" ON daily_reports FOR INSERT
  TO authenticated WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_update_own" ON daily_reports;
CREATE POLICY "reports_update_own" ON daily_reports FOR UPDATE
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  ) WITH CHECK (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_delete_own_or_manager" ON daily_reports;
CREATE POLICY "reports_delete_own_or_manager" ON daily_reports FOR DELETE
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

-- Monthly targets table
CREATE TABLE IF NOT EXISTS monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  target_month date NOT NULL,
  monthly_target integer NOT NULL DEFAULT 0,
  week1_target integer NOT NULL DEFAULT 0,
  week2_target integer NOT NULL DEFAULT 0,
  week3_target integer NOT NULL DEFAULT 0,
  week4_target integer NOT NULL DEFAULT 0,
  week5_target integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, target_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_targets_employee_id ON monthly_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_month ON monthly_targets(target_month);

ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "targets_select_own_or_manager" ON monthly_targets;
CREATE POLICY "targets_select_own_or_manager" ON monthly_targets FOR SELECT
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "targets_insert_manager" ON monthly_targets;
CREATE POLICY "targets_insert_manager" ON monthly_targets FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "targets_update_manager" ON monthly_targets;
CREATE POLICY "targets_update_manager" ON monthly_targets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

DROP POLICY IF EXISTS "targets_delete_manager" ON monthly_targets;
CREATE POLICY "targets_delete_manager" ON monthly_targets FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM employees e WHERE e.user_id = auth.uid() AND e.role = 'manager')
  );

-- Phone verifications table (for OTP login)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_lookup ON phone_verifications(phone, code);

-- Phone verifications: only service role (edge function) should access
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pv_no_user_access" ON phone_verifications;
-- No user-level policies; edge function uses service_role key which bypasses RLS
