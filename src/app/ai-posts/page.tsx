// app/ai-posts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";

type GeneratedPost = {
  caption: string;
  hashtags: string[];
  pattern: string;
};

export default function AIPostsPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  const handleGenerate = async () => {
    if (!token || generating) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || "AI投稿文の生成に失敗しました");
      }
    } catch (err) {
      console.error("Generate posts error:", err);
      setError("AI投稿文の生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreatePost = (caption: string, hashtags: string[]) => {
    // ハッシュタグを文章に追加
    const fullCaption = hashtags.length > 0
      ? `${caption}\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`
      : caption;

    // composeページにリダイレクト（captionをクエリパラメータで渡す）
    const params = new URLSearchParams({ caption: fullCaption });
    router.push(`/compose/input?${params.toString()}`);
  };

  if (!isLoading && !session) {
    return <div className="p-4">ログインページへ移動します...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI投稿文生成</h1>
        <p className="text-gray-600 mt-1">
          過去の投稿を分析して、そのまま使える投稿文を生成します
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 border border-gray-300 rounded-lg">
          <p className="text-gray-600 mb-4">
            AIがあなたの投稿スタイルを学習して、
            <br />
            今日投稿できる文章を3パターン生成します
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-3 bg-black text-white rounded-md font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? "生成中..." : "AI投稿文を生成"}
          </button>
          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {posts.length}パターンの投稿文が生成されました
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
            >
              {generating ? "生成中..." : "再生成"}
            </button>
          </div>

          <div className="space-y-6">
            {posts.map((post, idx) => (
              <div
                key={idx}
                className="p-6 rounded-lg border border-gray-300 bg-gray-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold px-3 py-1 bg-white border border-gray-300 rounded">
                    パターン {idx + 1}: {post.pattern}
                  </span>
                </div>

                <p className="text-gray-900 mb-4 whitespace-pre-wrap leading-relaxed">
                  {post.caption}
                </p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.hashtags.map((tag, tagIdx) => (
                      <span
                        key={tagIdx}
                        className="text-xs px-2 py-1 bg-white border border-gray-300 rounded text-gray-700"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCreatePost(post.caption, post.hashtags)}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    この文章で投稿を作成
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        post.hashtags.length > 0
                          ? `${post.caption}\n\n${post.hashtags.map((tag) => `#${tag}`).join(" ")}`
                          : post.caption
                      );
                      alert("投稿文をコピーしました");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300"
                  >
                    コピー
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← ダッシュボードに戻る
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
