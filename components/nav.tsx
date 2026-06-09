'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  FileEdit,
  BarChart3,
  Trophy,
  Users,
  Target,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const navItems = [
  { href: '/report', label: '填日报', icon: FileEdit },
  { href: '/my-week', label: '本周统计', icon: BarChart3 },
  { href: '/ranking', label: '排行榜', icon: Trophy },
];

const adminItems = [
  { href: '/admin/targets', label: '月度目标', icon: Target },
  { href: '/admin/employees', label: '员工管理', icon: Users },
];

export function AppNav() {
  const { employee, signOut } = useAuth();
  const pathname = usePathname();
  const isManager = employee?.role === 'manager';
  const [open, setOpen] = React.useState(false);

  const allItems = isManager ? [...navItems, ...adminItems] : navItems;

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="text-lg font-bold">利塔尔项目管理</span>
                  <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col gap-1 p-3">
                  {allItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        pathname === item.href
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="my-2 border-t" />
                  <button
                    onClick={() => { signOut(); setOpen(false); }}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="text-base font-bold">利塔尔项目管理</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{employee?.name}</span>
            {isManager && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                主管
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around py-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors',
                pathname === item.href
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          {isManager && (
            <Link
              href="/admin/targets"
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs transition-colors',
                pathname.startsWith('/admin')
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Target className="h-5 w-5" />
              管理
            </Link>
          )}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:left-0 md:top-14 md:flex md:h-[calc(100vh-3.5rem)] md:w-56 md:flex-col md:border-r md:bg-background">
        <nav className="flex flex-col gap-1 p-3">
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <div className="my-2 border-t" />
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </nav>
      </aside>
    </>
  );
}
