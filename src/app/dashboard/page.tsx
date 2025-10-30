// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";

type PostType = {
  id: number;
  caption: string;
  status: string;
  createdAt: string;
  memo?: {
    answerWhy?: string;
    answerWhat?: string;
    answerNext?: string;
  };
  images?: Array<{
    signedUrl?: string;
  }>;
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [totalPosts, setTotalPosts] = useState(0);
  const [recentPosts, setRecentPosts] = useState<PostType[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (!token) return;

    const fetchDashboardData = async () => {
      setLoadingData(true);
      try {
        // ゲストセッションIDを取得
        const guestSessionId = typeof window !== 'undefined'
          ? sessionStorage.getItem('guestSessionId')
          : null;

        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        if (guestSessionId) {
          headers['X-Guest-Session-Id'] = guestSessionId;
        }

        // 統計データを取得
        const statsRes = await fetch("/api/dashboard/stats", {
          headers,
          cache: "no-store",
        });
        const statsData = await statsRes.json();

        if (statsRes.ok) {
          setTotalPosts(statsData.totalPosts || 0);
        }

        // 最近の投稿3件を取得
        const postsRes = await fetch("/api/dashboard/recent-posts?limit=3", {
          headers,
          cache: "no-store",
        });
        const postsData = await postsRes.json();

        if (postsRes.ok) {
          setRecentPosts(postsData.posts || []);
        }
      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (!isLoading && !session) {
    return <div className="p-4">ログインページへ移動します...</div>;
  }

  if (loadingData) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-600 mt-1">今日の活動概要と投稿状況</p>
      </div>

      {/* 統計カード */}
      <div className="space-y-4 mb-6">
        {/* 総投稿数 */}
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">総投稿数</p>
              <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 最近の投稿 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">最近の投稿</h2>
          <Link
            href="/posts"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            すべて見る →
          </Link>
        </div>

        {recentPosts.length > 0 ? (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="block p-4 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all"
              >
                <p className="text-sm text-gray-900 line-clamp-2 mb-2">{post.caption}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{new Date(post.createdAt).toLocaleDateString("ja-JP")}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
            <p>まだ投稿がありません</p>
            <Link
              href="/compose/input"
              className="mt-4 inline-block px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              最初の投稿を作成
            </Link>
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div className="mb-6 space-y-3">
        <Link
          href="/ideas"
          className="block w-full bg-black text-white text-lg py-3 rounded-md font-bold text-center hover:bg-gray-800"
        >
          次の投稿ネタを探す
        </Link>
        <Link
          href="/compose/input"
          className="block w-full bg-gray-200 text-gray-900 text-lg py-3 rounded-md font-bold text-center hover:bg-gray-300"
        >
          新規作成
        </Link>
        <Link
          href="/reels/new"
          className="block w-full bg-white border border-gray-300 text-gray-900 text-lg py-3 rounded-md font-bold text-center hover:bg-gray-100"
        >
          かんたんリール
        </Link>
      </div>
    </main>
  );
}
