//src/app/auth/reset/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (): Promise<void> => {
    setErr(null);
    if (pw.length < 8) { setErr('8文字以上で入力してください'); return; }
    if (pw !== pw2)    { setErr('確認用パスワードが一致しません'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setOk(true);
      // 好みで：完了後にダッシュボード/ログインへ
      setTimeout(() => router.replace('/dashboard'), 800);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '予期しないエラー');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-6 text-black bg-white">
      <h1 className="text-xl font-bold mb-4">パスワード再設定</h1>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="新しいパスワード"
        className="w-full border rounded p-2 mb-2"
        disabled={loading}
      />
      <input
        type="password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
        placeholder="新しいパスワード（確認）"
        className="w-full border rounded p-2 mb-2"
        disabled={loading}
      />
      {err && <p className="text-red-600 text-sm mb-2">{err}</p>}
      {ok && <p className="text-green-700 text-sm mb-2">変更しました。自動で遷移します…</p>}
      <button
        onClick={handleSubmit}
        className="w-full bg-black text-white rounded py-2 disabled:opacity-60"
        disabled={loading}
      >
        {loading ? '更新中…' : 'パスワードを更新'}
      </button>
    </main>
  );
}
