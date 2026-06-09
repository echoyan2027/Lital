'use client';

import { useAuth } from '@/lib/auth-context';
import { AppNav } from '@/components/nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-lg px-4 pb-20 pt-4 md:ml-56 md:max-w-3xl md:pb-4">
        {children}
      </main>
    </>
  );
}
