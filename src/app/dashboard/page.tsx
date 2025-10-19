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

type IdeaType = {
  id: number;
  title: string;
  description: string;
  priority: number;
  createdAt: string;
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [totalPosts, setTotalPosts] = useState(0);
  const [publishedPosts, setPublishedPosts] = useState(0);
  const [draftPosts, setDraftPosts] = useState(0);
  const [avgEngagementRate, setAvgEngagementRate] = useState("0.00");
  const [recentPosts, setRecentPosts] = useState<PostType[]>([]);
  const [ideas, setIdeas] = useState<IdeaType[]>([]);
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
        // 統計データを取得
        const statsRes = await fetch("/api/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const statsData = await statsRes.json();

        if (statsRes.ok) {
          setTotalPosts(statsData.totalPosts || 0);
          setPublishedPosts(statsData.publishedPosts || 0);
          setDraftPosts(statsData.draftPosts || 0);
          setAvgEngagementRate(statsData.avgEngagementRate || "0.00");
        }

        // 最近の投稿3件を取得
        const postsRes = await fetch("/api/dashboard/recent-posts?limit=3", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const postsData = await postsRes.json();

        if (postsRes.ok) {
          setRecentPosts(postsData.posts || []);
        }

        // AI提案を取得
        const ideasRes = await fetch("/api/dashboard/ideas?limit=3", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const ideasData = await ideasRes.json();

        if (ideasRes.ok) {
          setIdeas(ideasData.ideas || []);
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

        {/* 公開済み投稿 */}
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">公開済み</p>
              <p className="text-2xl font-bold text-gray-900">{publishedPosts}</p>
            </div>
          </div>
        </div>

        {/* 下書き投稿 */}
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">下書き</p>
              <p className="text-2xl font-bold text-gray-900">{draftPosts}</p>
            </div>
          </div>
        </div>

        {/* 平均反応率 */}
        <div className="bg-white rounded-lg p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">平均反応率（30日間）</p>
              <p className="text-2xl font-bold text-gray-900">{avgEngagementRate}%</p>
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
                  <span
                    className={`px-2 py-1 rounded ${
                      post.status === "published"
                        ? "bg-gray-200 text-gray-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {post.status === "published" ? "公開済み" : "下書き"}
                  </span>
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

      {/* AI投稿提案 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">AI投稿提案</h2>
          <Link
            href="/ideas"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            すべて見る →
          </Link>
        </div>

        {ideas.length > 0 ? (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="p-4 rounded-lg border border-gray-300 bg-gray-50"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs font-bold text-gray-700 bg-gray-200 rounded">
                    優先度 {idea.priority}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{idea.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{idea.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 border border-gray-300 rounded-lg">
            <p>AI提案はまだありません</p>
            <p className="text-sm mt-2">投稿を作成すると、AIが次の投稿案を提案します</p>
          </div>
        )}
      </div>

      {/* クイックアクション */}
      <div className="mb-6 space-y-3">
        <Link
          href="/ai-posts"
          className="block w-full bg-black text-white text-lg py-3 rounded-md font-bold text-center hover:bg-gray-800"
        >
          ✨ AI投稿文を生成
        </Link>
        <Link
          href="/compose/input"
          className="block w-full bg-gray-200 text-gray-900 text-lg py-3 rounded-md font-bold text-center hover:bg-gray-300"
        >
          +新規作成
        </Link>
      </div>
    </main>
  );
}
