'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase, type Employee } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshEmployee: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  employee: null,
  loading: true,
  signOut: async () => {},
  refreshEmployee: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const employeeFetchedRef = useRef(false);

  const fetchEmployee = useCallback(async (userId: string) => {
    console.log('[auth] fetching employee for user', userId);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[auth] employee fetch error:', error.message);
    } else {
      console.log('[auth] employee result:', data ? data.name : 'null');
    }
    setEmployee(data as Employee | null);
    return data as Employee | null;
  }, []);

  const refreshEmployee = useCallback(async () => {
    if (user) {
      await fetchEmployee(user.id);
    }
  }, [user, fetchEmployee]);

  useEffect(() => {
    console.log('[auth] initial session check');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      console.log('[auth] session user:', u ? u.id : 'null');
      setUser(u);
      if (u) {
        employeeFetchedRef.current = true;
        await fetchEmployee(u.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[auth] state change:', event, session?.user?.id ?? 'null');
        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // Don't set loading=false until employee is fetched
          // The IIFE pattern is required by onAuthStateChange to avoid deadlock
          (async () => {
            employeeFetchedRef.current = true;
            const emp = await fetchEmployee(u.id);
            console.log('[auth] employee after state change:', emp ? emp.name : 'null');
            // Only set loading false after employee data is resolved
            setLoading(false);
          })();
        } else {
          setEmployee(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchEmployee]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ user, employee, loading, signOut, refreshEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
