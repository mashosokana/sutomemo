'use client';

import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Role = 'USER' | 'ADMIN';

type AuthContextValue = {
  session: Session | null;
  token: string | null;
  role: Role | null;
  isGuest: boolean;
  loading: boolean;
  status: number | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

function parseAuthMePayload(value: unknown): { role: Role; isGuest: boolean } | null {
  if (!value || typeof value !== 'object') return null;

  const role = (value as { role?: unknown }).role;
  const isGuest = (value as { isGuest?: unknown }).isGuest;
  if ((role === 'USER' || role === 'ADMIN') && typeof isGuest === 'boolean') {
    return { role, isGuest };
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchMe = useCallback(async (accessToken: string | null) => {
    const requestId = ++requestIdRef.current;

    controllerRef.current?.abort();
    const ac = new AbortController();
    controllerRef.current = ac;

    if (!accessToken) {
      if (requestId === requestIdRef.current) {
        setRole(null);
        setIsGuest(false);
        setStatus(401);
        setError(null);
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
        signal: ac.signal,
      });

      if (requestId !== requestIdRef.current) return;

      setStatus(res.status);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const parsed = parseAuthMePayload(await res.json());
      if (!parsed) {
        throw new Error('Invalid auth payload');
      }

      setRole(parsed.role);
      setIsGuest(parsed.isGuest);
      setError(null);
    } catch (e: unknown) {
      if (ac.signal.aborted || requestId !== requestIdRef.current) return;
      setRole(null);
      setIsGuest(false);
      setError(getErrorMessage(e));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const syncSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      const nextToken = nextSession?.access_token ?? null;
      setToken(nextToken);
      setLoading(true);
      await fetchMe(nextToken);
    },
    [fetchMe]
  );

  const refresh = useCallback(async () => {
    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setSession(null);
      setToken(null);
      setRole(null);
      setIsGuest(false);
      setStatus(401);
      setError(sessionError.message);
      setLoading(false);
      return;
    }
    await syncSession(data.session ?? null);
  }, [syncSession]);

  useEffect(() => {
    void refresh();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
      listener.subscription.unsubscribe();
    };
  }, [refresh, syncSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      token,
      role,
      isGuest,
      loading,
      status,
      error,
      refresh,
    }),
    [session, token, role, isGuest, loading, status, error, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
