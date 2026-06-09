'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/app-shell';
import { Trophy, Medal, Users, MapPin } from 'lucide-react';

type GroupBy = 'personal' | 'group' | 'region';
type PeriodBy = 'week' | 'month';

type RankItem = {
  name: string;
  total: number;
  rank: number;
};

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

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return { start, end };
}

export default function RankingPage() {
  const { user, employee, loading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodBy>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('personal');
  const [rankings, setRankings] = useState<RankItem[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (!employee) {
      router.replace('/');
    }
  }, [user, employee, loading, router]);

  const fetchRankings = useCallback(async () => {
    if (!employee) return;

    const range = period === 'week' ? getWeekRange() : getMonthRange();

    const { data, error } = await supabase
      .from('daily_reports')
      .select('leak_count, employee_id, employees(name, group_name, project_region)')
      .gte('report_date', range.start)
      .lte('report_date', range.end);

    if (error) {
      console.error('[ranking] fetch error:', error.message);
      setRankings([]);
      return;
    }
    if (!data) {
      setRankings([]);
      return;
    }

    const aggregated: Record<string, number> = {};

    for (const row of data as any[]) {
      const emp = row.employees;
      if (!emp) continue;

      let key: string;
      if (groupBy === 'personal') {
        key = emp.name;
      } else if (groupBy === 'group') {
        key = emp.group_name || '未分组';
      } else {
        key = emp.project_region || '未分配区域';
      }

      aggregated[key] = (aggregated[key] || 0) + row.leak_count;
    }

    const items: RankItem[] = Object.entries(aggregated)
      .map(([name, total]) => ({ name, total, rank: 0 }))
      .sort((a, b) => b.total - a.total)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    setRankings(items);
  }, [employee, period, groupBy]);

  useEffect(() => {
    if (employee) fetchRankings();
  }, [employee, fetchRankings]);

  if (loading || !user || !employee) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">{rank}</span>;
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">排行榜</h2>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodBy)}>
          <TabsList className="w-full">
            <TabsTrigger value="week" className="flex-1">本周</TabsTrigger>
            <TabsTrigger value="month" className="flex-1">本月</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1">
              <Users className="mr-1 h-3.5 w-3.5" />
              个人
            </TabsTrigger>
            <TabsTrigger value="group" className="flex-1">
              <Users className="mr-1 h-3.5 w-3.5" />
              小组
            </TabsTrigger>
            <TabsTrigger value="region" className="flex-1">
              <MapPin className="mr-1 h-3.5 w-3.5" />
              区域
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {rankings.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无排名数据
          </p>
        ) : (
          <div className="space-y-2">
            {rankings.map((item) => (
              <Card
                key={item.name}
                className={
                  item.rank <= 3
                    ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent'
                    : ''
                }
              >
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center">
                      {getRankIcon(item.rank)}
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge
                    variant={item.rank <= 3 ? 'default' : 'secondary'}
                    className="text-sm font-bold"
                  >
                    {item.total} 点
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
