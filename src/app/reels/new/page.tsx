// src/app/reels/new/page.tsx

'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReelWizard from '@/components/reels/ReelWizard';
import { useAuthMe } from '@/app/hooks/useAuthMe';

/**
 * かんたんリール作成ページ（3ステップウィザード）
 */
export default function ReelsNewPage() {
  const router = useRouter();
  const { data, loading, error, status } = useAuthMe();
  const isGuest = data?.isGuest ?? false;

  useEffect(() => {
    if (!loading && (status === 401 || status === 403)) {
      router.replace('/login');
    }
  }, [loading, status, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-red-600">エラー: {error}</p>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto p-6 text-center space-y-6">
          <h1 className="text-2xl font-bold text-black">かんたんリール</h1>
          <p className="text-sm text-gray-600">
            お試しログインでは「かんたんリール」をご利用いただけません。
          </p>
          <p className="text-sm text-gray-600">
            会員登録すると、リールの生成や保存を含む全機能をお使いいただけます。
          </p>
          <div className="space-y-3 max-w-xs mx-auto">
            <Link
              href="/signup"
              className="block bg-black text-white rounded-md py-3 font-bold hover:bg-gray-900"
            >
              ユーザー登録へ進む
            </Link>
            <button
              onClick={() => router.back()}
              className="w-full border border-gray-300 text-gray-700 rounded-md py-3 font-bold hover:bg-gray-100"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-block text-sm text-gray-600 hover:text-black mb-2"
          >
            ← トップに戻る
          </Link>
          <h1 className="text-2xl font-bold text-black">かんたんリール</h1>
          <p className="text-sm text-gray-600 mt-1">
            3分でリール動画とキャプションを生成
          </p>
        </div>

        {/* ウィザード */}
        <ReelWizard />

        {/* フッター */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>生成後は効果測定を記録できます →{' '}
            <Link href="/reels/log" className="underline hover:text-black">
              効果測定ログ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
