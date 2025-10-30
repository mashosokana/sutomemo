// src/hooks/useAuthMe.ts
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type AuthMe = {
  role: 'USER' | 'ADMIN';
  isGuest: boolean;
  planTier: 'FREE' | 'PRO' | 'ENTERPRISE';
  isPaid: boolean;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return 'Unknown error'; }
}

export function useAuthMe() {
  const fallbackGuest: AuthMe = { role: 'USER', isGuest: true, planTier: 'FREE', isPaid: false };
  const [data, setData] = useState<AuthMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const res = await fetch('/api/auth/me', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: 'no-store',
          signal: ac.signal,
        });
        setStatus(res.status);
        if (!res.ok) {
          if (!ac.signal.aborted) setData(fallbackGuest);
          throw new Error(await res.text());
        }
        const json = (await res.json()) as AuthMe;
        if (!ac.signal.aborted) setData(json);
      } catch (e: unknown) {
        if (!ac.signal.aborted) {
          setError(getErrorMessage(e));
          setData((prev) => prev ?? fallbackGuest);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  return { data, error, loading, status };
}
