import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Employee = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  project_region: string;
  group_name: string;
  role: 'employee' | 'manager';
  created_at: string;
};

export type DailyReport = {
  id: string;
  employee_id: string;
  report_date: string;
  project_name: string;
  leak_count: number;
  note: string;
  created_at: string;
};

export type MonthlyTarget = {
  id: string;
  employee_id: string;
  target_month: string;
  monthly_target: number;
  week1_target: number;
  week2_target: number;
  week3_target: number;
  week4_target: number;
  week5_target: number;
  created_at: string;
};
