// src/app/reels/log/page.tsx

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import MetricsForm, { MetricsFormData } from '@/components/reels/MetricsForm';
import { supabase } from '@/lib/supabase';

interface ReelsLog {
  id: string;
  postLocalId: string;
  industry: string;
  durationSecs: number;
  metrics: {
    views: number;
    saves: number;
    dms: number;
  };
  postedAt: string;
  createdAt: string;
}

interface ReelsOutput {
  id: string;
  postLocalId: string;
  caption: string;
  hook: string;
  problem: string;
  evidence: string;
  action: string;
  hashtags: string[];
  createdAt: string;
}

/**
 * かんたんリール効果測定ログページ（内部コンポーネント）
 */
function ReelsLogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPostLocalId = searchParams.get('postLocalId');
  const [logs, setLogs] = useState<ReelsLog[]>([]);
  const [outputs, setOutputs] = useState<ReelsOutput[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOutputsLoading, setIsOutputsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outputsError, setOutputsError] = useState<string | null>(null);
  const [selectedPostLocalId, setSelectedPostLocalId] = useState(initialPostLocalId ?? '');

  // ログ取得
  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/reels/log', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('ログの取得に失敗しました');
      }

      const result = await response.json();
      setLogs(result.logs || []);
    } catch (err) {
      console.error('Fetch logs error:', err);
      setError(err instanceof Error ? err.message : 'ログの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOutputs = async () => {
    setIsOutputsLoading(true);
    setOutputsError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) {
        router.replace('/login');
        return;
      }

      const response = await fetch('/api/reels/outputs', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('生成済みリールの取得に失敗しました');
      }

      const result = await response.json();
      setOutputs(result.outputs || []);
    } catch (err) {
      console.error('Fetch outputs error:', err);
      setOutputsError(err instanceof Error ? err.message : '生成済みリールの取得に失敗しました');
    } finally {
      setIsOutputsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOutputs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectOutput = (postLocalId: string) => {
    setSelectedPostLocalId(postLocalId);
    const query = postLocalId ? `?postLocalId=${encodeURIComponent(postLocalId)}` : '';
    router.replace(`/reels/log${query}`, { scroll: false });
  };

  // ログ記録
  const handleSubmit = async (data: MetricsFormData) => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    if (!token) {
      throw new Error('ログインしてください');
    }

    const response = await fetch('/api/reels/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postLocalId: data.postLocalId,
        industry: data.industry,
        metrics: {
          views: data.views,
          saves: data.saves,
          dms: data.dms,
        },
        postedAt: data.postedAt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'ログの記録に失敗しました');
    }

    // 再取得
    await fetchLogs();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/reels/new"
            className="inline-block text-sm text-gray-600 hover:text-black mb-2"
          >
            ← リール作成に戻る
          </Link>
          <h1 className="text-2xl font-bold text-black">効果測定ログ</h1>
          <p className="text-sm text-gray-600 mt-1">
            再生数・保存数・DM数を手入力で記録
          </p>
        </div>

        {/* フォーム */}
        {isOutputsLoading ? (
          <div className="mb-8 border border-gray-300 rounded p-4 bg-gray-50">
            <p className="text-sm text-gray-600">生成済みリールを読み込み中...</p>
          </div>
        ) : outputsError ? (
          <div className="mb-8 p-4 bg-red-50 border border-red-300 rounded">
            <p className="text-sm text-red-700">{outputsError}</p>
          </div>
        ) : outputs.length > 0 ? (
          <div className="mb-8 space-y-4">
            <h2 className="text-lg font-bold text-black">最近生成したリール</h2>
            <div className="space-y-3">
              {outputs.map((output) => (
                <div
                  key={output.id}
                  className="border border-gray-300 rounded p-4 bg-white space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1 break-all">
                        投稿ID: {output.postLocalId}
                      </p>
                      <p className="text-sm text-black whitespace-pre-wrap line-clamp-4">
                        {output.caption}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        生成日時: {new Date(output.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectOutput(output.postLocalId)}
                      className="shrink-0 bg-black text-white text-xs font-bold rounded px-3 py-2 hover:bg-gray-900"
                    >
                      このIDを使う
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-8">
          <MetricsForm onSubmit={handleSubmit} prefilledPostLocalId={selectedPostLocalId} />
        </div>

        {/* 一覧 */}
        <div className="border-t border-gray-300 pt-6">
          <h2 className="text-lg font-bold text-black mb-4">直近10件のログ</h2>

          {isLoading && (
            <p className="text-center text-gray-600">読み込み中...</p>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-300 rounded">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!isLoading && !error && logs.length === 0 && (
            <p className="text-center text-gray-600">
              まだログがありません。上のフォームから記録してください。
            </p>
          )}

          {!isLoading && !error && logs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-3 py-2 text-left text-black">
                      業種
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-black">
                      再生数
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-black">
                      保存数
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-right text-black">
                      DM数
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-black">
                      投稿日
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-3 py-2 text-black">
                        {log.industry}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-black">
                        {log.metrics.views.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-black">
                        {log.metrics.saves.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-right text-black">
                        {log.metrics.dms.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-black">
                        {new Date(log.postedAt).toLocaleDateString('ja-JP')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            リール作成に戻る →{' '}
            <Link href="/reels/new" className="underline hover:text-black">
              かんたんリール
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * かんたんリール効果測定ログページ（Suspenseラッパー）
 */
export default function ReelsLogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    }>
      <ReelsLogPageContent />
    </Suspense>
  );
}
