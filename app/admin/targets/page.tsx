'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Employee, type MonthlyTarget } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { Target, ChevronLeft, ChevronRight, Save } from 'lucide-react';

export default function AdminTargetsPage() {
  const { user, employee, loading } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targets, setTargets] = useState<Record<string, MonthlyTarget>>({});
  const [targetMonth, setTargetMonth] = useState(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + 1);
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [editingValues, setEditingValues] = useState<Record<string, Partial<MonthlyTarget>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || employee?.role !== 'manager')) {
      router.replace('/login');
    }
  }, [user, employee, loading, router]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (data) setEmployees(data as Employee[]);
  }, []);

  const fetchTargets = useCallback(async () => {
    if (employees.length === 0) return;
    const monthDate = `${targetMonth}-01`;
    const { data } = await supabase
      .from('monthly_targets')
      .select('*')
      .eq('target_month', monthDate);

    const map: Record<string, MonthlyTarget> = {};
    if (data) {
      for (const t of data as MonthlyTarget[]) {
        map[t.employee_id] = t;
      }
    }
    setTargets(map);
    setEditingValues({});
  }, [employees, targetMonth]);

  useEffect(() => {
    if (employee?.role === 'manager') fetchEmployees();
  }, [employee, fetchEmployees]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleEdit = (empId: string, field: string, value: string) => {
    setEditingValues((prev) => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: Number(value) || 0,
      },
    }));
  };

  const handleSave = async (empId: string) => {
    const edits = editingValues[empId];
    if (!edits) return;

    setSaving(empId);
    const monthDate = `${targetMonth}-01`;
    const existing = targets[empId];

    try {
      if (existing) {
        const { error } = await supabase
          .from('monthly_targets')
          .update(edits)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('monthly_targets').insert({
          employee_id: empId,
          target_month: monthDate,
          ...edits,
        });
        if (error) throw error;
      }
      toast.success('目标已保存');
      fetchTargets();
    } catch (err: any) {
      toast.error(err.message || '保存失败');
    } finally {
      setSaving(null);
    }
  };

  const getValue = (empId: string, field: string): number => {
    if (editingValues[empId]?.[field as keyof MonthlyTarget] !== undefined) {
      return editingValues[empId]![field as keyof MonthlyTarget] as number;
    }
    const existing = targets[empId];
    if (existing) {
      return existing[field as keyof MonthlyTarget] as number;
    }
    return 0;
  };

  if (loading || !user || !employee || employee.role !== 'manager') {
    if (!loading) {
      if (!user) router.replace('/login');
      else if (!employee) router.replace('/');
      else router.replace('/report');
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const changeMonth = (delta: number) => {
    const [y, m] = targetMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setTargetMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const weekFields = [
    { key: 'monthly_target', label: '月度总目标' },
    { key: 'week1_target', label: '第1周' },
    { key: 'week2_target', label: '第2周' },
    { key: 'week3_target', label: '第3周' },
    { key: 'week4_target', label: '第4周' },
    { key: 'week5_target', label: '第5周' },
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">月度目标管理</h2>
          <Badge variant="outline" className="text-xs">
            主管权限
          </Badge>
        </div>

        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <Button variant="ghost" size="icon" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{targetMonth}</span>
            <Button variant="ghost" size="icon" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    {emp.name}
                  </div>
                  {targets[emp.id] && (
                    <Badge variant="secondary" className="text-xs">
                      已设置
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {weekFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={getValue(emp.id, field.key)}
                        onChange={(e) =>
                          handleEdit(emp.id, field.key, e.target.value)
                        }
                        className="h-8 text-sm"
                        inputMode="numeric"
                      />
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleSave(emp.id)}
                  disabled={saving === emp.id}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {saving === emp.id ? '保存中...' : '保存目标'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {employees.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            请先添加员工
          </p>
        )}
      </div>
    </AppShell>
  );
}
