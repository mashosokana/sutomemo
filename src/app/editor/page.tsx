//src/app/editor/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthMe } from '../hooks/useAuthMe'; 
import BlurredTextPreview from '../_components/BlurredTextPreview';

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return 'Unknown error'; }
}

export default function EditorPage() {
  const router = useRouter();
  const { data, loading, error, status } = useAuthMe();
  const isGuest = data?.isGuest ?? false;

  useEffect(() => {
    if (!loading && (status === 401 || status === 403)) {
      router.replace('/login');
    }
  }, [loading, status, router]);

  // 最小の編集ステート（必要に応じて既存のエディタに置き換え）
  const [caption, setCaption] = useState('');
  const [why, setWhy] = useState('');
  const [what, setWhat] = useState('');
  const [next, setNext] = useState('');

  const previewText = useMemo(
    () => [caption, why, what, next].filter(Boolean).join('\n\n'),
    [caption, why, what, next]
  );

  const handleSave = async (): Promise<void> => {
    if (isGuest) {
      alert('お試し編集はサーバ保存・ダウンロード不可です。登録すると下書きを引き継げます。');
      return;
    }
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ caption, memo: { why, what, next } }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert('保存しました');
      router.replace('/dashboard');
    } catch (e: unknown) {
      alert(`保存に失敗しました：${getErrorMessage(e)}`);
    }
  };

  if (loading) return <p>読み込み中…</p>;
  if (error) return <p className="text-red-600">エラー: {error}</p>;

  return (
    <div className="space-y-4 p-4">
      <input
        value={caption}
        onChange={(ev) => setCaption(ev.target.value)}
        placeholder="キャプション"
        className="w-full border rounded p-2"
      />
      <textarea
        value={why}
        onChange={(ev) => setWhy(ev.target.value)}
        placeholder="Why（なぜ？）"
        className="w-full border rounded p-2 min-h-24"
      />
      <textarea
        value={what}
        onChange={(ev) => setWhat(ev.target.value)}
        placeholder="What（何をした？）"
        className="w-full border rounded p-2 min-h-24"
      />
      <textarea
        value={next}
        onChange={(ev) => setNext(ev.target.value)}
        placeholder="Next（次にすること）"
        className="w-full border rounded p-2 min-h-24"
      />

      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">プレビュー</h3>
        {isGuest ? (
          <BlurredTextPreview text={previewText} onUnlock={() => router.push('/signup')} />
        ) : (
          <pre className="whitespace-pre-wrap">{previewText}</pre>
        )}
      </div>

      <div className="fixed bottom-4 inset-x-0 flex justify-center">
        <button
          onClick={handleSave}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 disabled:opacity-70"
        >
          {isGuest ? '登録して保存へ' : '保存する'}
        </button>
      </div>
    </div>
  );
}
