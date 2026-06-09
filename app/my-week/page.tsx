'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, type DailyReport, type MonthlyTarget } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { TrendingUp, Target, CalendarDays } from 'lucide-react';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: formatDate(monday), end: formatDate(sunday) };
}

function getWeekOfMonth(): number {
  return Math.ceil(new Date().getDate() / 7);
}

function getMonthStart(): string {
  const now = new Date();
  return formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

export default function MyWeekPage() {
  const { user, employee, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [target, setTarget] = useState<MonthlyTarget | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!employee) {
      router.replace('/');
    }
  }, [user, employee, loading, router]);

  useEffect(() => {
    if (employee) fetchData();
  }, [employee]);

  const fetchData = async () => {
    if (!employee) return;
    const { start, end } = getWeekRange();

    const { data: weekReports, error: rErr } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('report_date', start)
      .lte('report_date', end)
      .order('report_date', { ascending: false });

    if (rErr) console.error('[my-week] reports error:', rErr.message);
    if (weekReports) setReports(weekReports as DailyReport[]);

    const monthStr = getMonthStart();
    const { data: targets, error: tErr } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('target_month', monthStr)
      .maybeSingle();

    if (tErr) console.error('[my-week] target error:', tErr.message);
    if (targets) setTarget(targets as MonthlyTarget);
  };

  if (loading || !user || !employee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const { start, end } = getWeekRange();
  const totalLeakCount = reports.reduce((sum, r) => sum + r.leak_count, 0);
  const weekOfMonth = getWeekOfMonth();
  const weekTargetKey = `week${weekOfMonth}_target` as keyof MonthlyTarget;
  const currentWeekTarget = target ? (target[weekTargetKey] as number) : 0;
  const monthlyProgress = target
    ? Math.round((totalLeakCount / Math.max(currentWeekTarget, 1)) * 100)
    : 0;

  const groupedByDate = reports.reduce<Record<string, DailyReport[]>>((acc, r) => {
    const key = r.report_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">本周统计</h2>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {start.slice(5).replace('-', '/')} - {end.slice(5).replace('-', '/')}
                </p>
                <p className="mt-1 text-3xl font-bold text-primary">
                  {totalLeakCount}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">漏点</span>
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-7 w-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {target && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-primary" />
                第{weekOfMonth}周目标
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {totalLeakCount} / {currentWeekTarget} 点
                </span>
                <span className={monthlyProgress >= 100 ? 'font-semibold text-green-600' : 'font-semibold'}>
                  {monthlyProgress}%
                </span>
              </div>
              <Progress value={Math.min(monthlyProgress, 100)} className="h-2" />
              {target.monthly_target > 0 && (
                <p className="pt-1 text-xs text-muted-foreground">
                  月度总目标：{target.monthly_target} 点
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <h3 className="pt-2 text-base font-semibold">每日明细</h3>
        {Object.keys(groupedByDate).length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            本周暂无记录
          </p>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayReports]) => (
                <Card key={date}>
                  <CardContent className="py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{date}</span>
                      </div>
                      <Badge variant="secondary" className="font-bold">
                        {dayReports.reduce((s, r) => s + r.leak_count, 0)} 点
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {dayReports.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
                        >
                          <span className="text-sm">{r.project_name}</span>
                          <span className="text-sm font-medium">{r.leak_count} 点</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
