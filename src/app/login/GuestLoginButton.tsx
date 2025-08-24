// app/login/GuestLoginButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type GuestLoginResponse = {
  ok?: boolean;
  access_token?: string;
  refresh_token?: string;
  error?: string;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

export default function GuestLoginButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest-login', { method: 'POST' });
      const json: GuestLoginResponse = await res.json();

      if (!res.ok || !json?.ok || !json?.access_token || !json?.refresh_token) {
        throw new Error(json?.error || 'guest login failed');
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: json.access_token,
        refresh_token: json.refresh_token,
      });
      if (setErr) throw setErr;

      router.replace('/dashboard');
    } catch (e: unknown) {
      alert(`お試しログインに失敗しました：${getErrorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGuestLogin}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 disabled:opacity-70 text-white px-4 py-2 rounded"
    >
      {loading ? 'ログイン中…' : 'お試しログイン'}
    </button>
  );
}
