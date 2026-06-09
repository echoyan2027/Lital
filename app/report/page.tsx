'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, type DailyReport } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { Trash2, CalendarDays } from 'lucide-react';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ReportPage() {
  const { user, employee, loading } = useAuth();
  const router = useRouter();
  const [reportDate, setReportDate] = useState(todayStr());
  const [projectName, setProjectName] = useState('');
  const [leakCount, setLeakCount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reports, setReports] = useState<DailyReport[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!employee) {
      router.replace('/');
    }
  }, [user, employee, loading, router]);

  useEffect(() => {
    if (employee) fetchReports();
  }, [employee]);

  const fetchReports = async () => {
    if (!employee) return;
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('employee_id', employee.id)
      .order('report_date', { ascending: false })
      .limit(30);
    if (error) {
      console.error('[report] fetch error:', error.message);
    } else if (data) {
      setReports(data as DailyReport[]);
    }
  };

  const handleSubmit = async () => {
    if (!employee) return;
    if (!projectName.trim()) {
      toast.error('请输入项目名称');
      return;
    }
    if (!leakCount || Number(leakCount) < 0) {
      toast.error('请输入漏点数');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('daily_reports').insert({
        employee_id: employee.id,
        report_date: reportDate,
        project_name: projectName.trim(),
        leak_count: Number(leakCount),
        note: note.trim(),
      });
      if (error) throw error;
      toast.success('日报提交成功');
      setProjectName('');
      setLeakCount('');
      setNote('');
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('daily_reports').delete().eq('id', id);
    if (error) {
      toast.error('删除失败');
    } else {
      toast.success('已删除');
      fetchReports();
    }
  };

  if (loading || !user || !employee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">填写日报</h2>

        <Card>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input
                placeholder="请输入项目名称"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>漏点数</Label>
              <Input
                type="number"
                placeholder="请输入漏点数"
                value={leakCount}
                onChange={(e) => setLeakCount(e.target.value)}
                min={0}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label>备注</Label>
              <Textarea
                placeholder="可选备注信息"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '提交日报'}
            </Button>
          </CardContent>
        </Card>

        <h3 className="pt-2 text-base font-semibold">最近记录</h3>
        {reports.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无日报记录
          </p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id} className="group">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{r.report_date}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {r.project_name}
                    </p>
                    {r.note && (
                      <p className="text-xs text-muted-foreground">{r.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-base font-bold">
                      {r.leak_count} 点
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
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
