'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase, type Employee } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { Users, Pencil, Plus, Trash2 } from 'lucide-react';

type EmployeeForm = {
  name: string;
  phone: string;
  project_region: string;
  group_name: string;
  role: 'employee' | 'manager';
};

const emptyForm: EmployeeForm = {
  name: '',
  phone: '',
  project_region: '',
  group_name: '',
  role: 'employee',
};

export default function AdminEmployeesPage() {
  const { user, employee, loading, refreshEmployee } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<EmployeeForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!employee) {
      router.replace('/');
    } else if (employee.role !== 'manager') {
      router.replace('/report');
    }
  }, [user, employee, loading, router]);

  const fetchEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('name');
    if (data) setEmployees(data as Employee[]);
  }, []);

  useEffect(() => {
    if (employee?.role === 'manager') fetchEmployees();
  }, [employee, fetchEmployees]);

  const handleEdit = (emp: Employee) => {
    setEditId(emp.id);
    setEditForm({
      name: emp.name,
      phone: emp.phone,
      project_region: emp.project_region,
      group_name: emp.group_name,
      role: emp.role,
    });
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    if (!editForm.name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    if (!editForm.phone.trim()) {
      toast.error('请输入手机号');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          project_region: editForm.project_region.trim(),
          group_name: editForm.group_name.trim(),
          role: editForm.role,
        })
        .eq('id', editId);

      if (error) throw error;
      toast.success('员工信息已更新');
      setEditId(null);
      fetchEmployees();
      refreshEmployee();
    } catch (err: any) {
      toast.error(err.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) {
      toast.error('请输入姓名');
      return;
    }
    if (!addForm.phone.trim()) {
      toast.error('请输入手机号');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('employees').insert({
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        project_region: addForm.project_region.trim(),
        group_name: addForm.group_name.trim(),
        role: addForm.role,
      });

      if (error) throw error;
      toast.success('员工已添加');
      setShowAdd(false);
      setAddForm(emptyForm);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || '添加失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
      toast.success('员工已删除');
      setDeleteConfirm(null);
      fetchEmployees();
    } catch (err: any) {
      toast.error(err.message || '删除失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || !employee || employee.role !== 'manager') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Get unique regions and groups
  const regions = Array.from(new Set(employees.map((e) => e.project_region).filter(Boolean)));
  const groups = Array.from(new Set(employees.map((e) => e.group_name).filter(Boolean)));

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">员工管理</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              主管权限
            </Badge>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-4 w-4" />
              添加
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {employees.map((emp) => (
            <Card key={emp.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{emp.name}</span>
                      {emp.role === 'manager' && (
                        <Badge variant="default" className="text-xs">
                          主管
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {emp.phone}
                      {emp.project_region && <> / {emp.project_region}</>}
                      {emp.group_name && <> / {emp.group_name}</>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirm(emp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {employees.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">暂无员工</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
                  添加第一个员工
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>编辑员工</DialogTitle>
              <DialogDescription>修改员工信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>项目区域</Label>
                <Input
                  value={editForm.project_region}
                  onChange={(e) =>
                    setEditForm({ ...editForm, project_region: e.target.value })
                  }
                />
                {regions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {regions.map((r) => (
                      <Button
                        key={r}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          setEditForm({ ...editForm, project_region: r })
                        }
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>小组</Label>
                <Input
                  value={editForm.group_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, group_name: e.target.value })
                  }
                />
                {groups.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {groups.map((g) => (
                      <Button
                        key={g}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() =>
                          setEditForm({ ...editForm, group_name: g })
                        }
                      >
                        {g}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(v) =>
                    setEditForm({
                      ...editForm,
                      role: v as 'employee' | 'manager',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">员工</SelectItem>
                    <SelectItem value="manager">主管</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setEditId(null)}>
                取消
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>添加员工</DialogTitle>
              <DialogDescription>创建新员工账号</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  placeholder="请输入姓名"
                />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm({ ...addForm, phone: e.target.value })
                  }
                  placeholder="请输入手机号"
                />
              </div>
              <div className="space-y-2">
                <Label>项目区域</Label>
                <Input
                  value={addForm.project_region}
                  onChange={(e) =>
                    setAddForm({ ...addForm, project_region: e.target.value })
                  }
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label>小组</Label>
                <Input
                  value={addForm.group_name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, group_name: e.target.value })
                  }
                  placeholder="可选"
                />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(v) =>
                    setAddForm({
                      ...addForm,
                      role: v as 'employee' | 'manager',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">员工</SelectItem>
                    <SelectItem value="manager">主管</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setShowAdd(false)}>
                取消
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? '添加中...' : '添加'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog
          open={!!deleteConfirm}
          onOpenChange={(open) => !open && setDeleteConfirm(null)}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                删除员工将同时删除其所有日报记录，此操作不可撤销。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                disabled={saving}
              >
                {saving ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
