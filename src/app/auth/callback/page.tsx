//src/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function getHashParams() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const p = new URLSearchParams(hash);
  return {
    access_token: p.get('access_token'),
    refresh_token: p.get('refresh_token'),
    type: p.get('type'), // 'recovery' など
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { access_token, refresh_token, type } = getHashParams();

      // 1) メールリンク由来のトークンでセッションを確立
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }

      // 2) パスワード再設定（recovery）のときは専用画面へ
      if (type === 'recovery') {
        router.replace('/auth/reset');
        return;
      }

      // 3) それ以外は好きな場所へ
      router.replace('/dashboard');
    })().catch(() => router.replace('/'));
  }, [router]);

  return <p className="p-4">処理中…</p>;
}
