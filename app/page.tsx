'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { user, employee, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    console.log('[home] loading=false, user=', !!user, 'employee=', !!employee);
    if (user) {
      if (employee) {
        console.log('[home] redirecting to /report');
        router.replace('/report');
      }
      // If user exists but no employee record, stay here and show setup message
    } else {
      console.log('[home] redirecting to /login');
      router.replace('/login');
    }
  }, [user, employee, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // User is logged in but has no employee record
  if (user && !employee) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">账号未关联员工</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            您的手机号尚未录入系统，请联系主管在「员工管理」中添加您的信息。
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-4 text-sm text-primary underline"
          >
            退出登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
