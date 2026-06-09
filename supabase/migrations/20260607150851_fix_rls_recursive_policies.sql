/*
# Fix RLS recursive policies on employees table

1. Problem
   The employees table RLS policies check `EXISTS (SELECT 1 FROM employees ...)` 
   which causes recursive policy evaluation. This means:
   - A manager cannot see the employees list because the subquery re-triggers the SELECT policy
   - An employee cannot see their own row if the recursive check fails

2. Solution
   - Create a `SECURITY DEFINER` function `is_manager()` that queries employees 
     with system privileges (bypasses RLS). This breaks the recursion.
   - Rewrite all employees policies to use `is_manager()` instead of the self-referencing subquery.
   - Also fix daily_reports and monthly_targets policies to use the same function.

3. Changes
   - New function: `is_manager()` returns boolean
   - Drop and recreate all employees RLS policies
   - Drop and recreate daily_reports RLS policies
   - Drop and recreate monthly_targets RLS policies
*/

-- Create helper function that runs as superuser (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.user_id = auth.uid() 
    AND e.role = 'manager'
  );
$$;

-- =====================
-- EMPLOYEES TABLE
-- =====================

DROP POLICY IF EXISTS "employees_select_own" ON employees;
CREATE POLICY "employees_select_own" ON employees FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR is_manager()
  );

DROP POLICY IF EXISTS "employees_insert_manager" ON employees;
CREATE POLICY "employees_insert_manager" ON employees FOR INSERT
  TO authenticated WITH CHECK (is_manager());

DROP POLICY IF EXISTS "employees_update_own_or_manager" ON employees;
CREATE POLICY "employees_update_own_or_manager" ON employees FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid() OR is_manager()
  ) WITH CHECK (is_manager());

DROP POLICY IF EXISTS "employees_delete_manager" ON employees;
CREATE POLICY "employees_delete_manager" ON employees FOR DELETE
  TO authenticated USING (is_manager());

-- =====================
-- DAILY_REPORTS TABLE
-- =====================

DROP POLICY IF EXISTS "reports_select_own_or_manager" ON daily_reports;
CREATE POLICY "reports_select_own_or_manager" ON daily_reports FOR SELECT
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR is_manager()
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
    OR is_manager()
  );

-- =====================
-- MONTHLY_TARGETS TABLE
-- =====================

DROP POLICY IF EXISTS "targets_select_own_or_manager" ON monthly_targets;
CREATE POLICY "targets_select_own_or_manager" ON monthly_targets FOR SELECT
  TO authenticated USING (
    employee_id = (SELECT id FROM employees WHERE user_id = auth.uid())
    OR is_manager()
  );

DROP POLICY IF EXISTS "targets_insert_manager" ON monthly_targets;
CREATE POLICY "targets_insert_manager" ON monthly_targets FOR INSERT
  TO authenticated WITH CHECK (is_manager());

DROP POLICY IF EXISTS "targets_update_manager" ON monthly_targets;
CREATE POLICY "targets_update_manager" ON monthly_targets FOR UPDATE
  TO authenticated USING (is_manager()) WITH CHECK (is_manager());

DROP POLICY IF EXISTS "targets_delete_manager" ON monthly_targets;
CREATE POLICY "targets_delete_manager" ON monthly_targets FOR DELETE
  TO authenticated USING (is_manager());
