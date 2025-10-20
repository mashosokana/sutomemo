// app/ideas/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";

type IdeaType = {
  id: number;
  title: string;
  description: string;
  priority: number;
  createdAt: string;
  suggestedHashtags?: string[];
};

type GeneratedPost = {
  caption: string;
  hashtags: string[];
  pattern: string;
};

type TabType = "posts" | "ideas";

export default function IdeasPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    // 初期ロード完了
    if (!isLoading) {
      setLoadingData(false);
    }
  }, [isLoading]);

  const handleGeneratePosts = async () => {
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

  const handleGenerateIdeas = async () => {
    if (!token || generating) return;

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json();

      if (res.ok) {
        // 新しい提案を追加
        setIdeas((prev) => [...data.ideas, ...prev]);
      } else {
        setError(data.error || "AI提案の生成に失敗しました");
      }
    } catch (error) {
      console.error("Generate ideas error:", error);
      setError("AI提案の生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleCreatePost = (caption: string, hashtags: string[]) => {
    const fullCaption = hashtags.length > 0
      ? `${caption}\n\n${hashtags.map((tag) => `#${tag}`).join(" ")}`
      : caption;
    const params = new URLSearchParams({ caption: fullCaption });
    router.push(`/compose/input?${params.toString()}`);
  };

  if (!isLoading && !session) {
    return <div className="p-4">ログインページへ移動します...</div>;
  }

  if (loadingData) {
    return <div className="p-4">読み込み中...</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">次の投稿ネタを探す</h1>
        <p className="text-gray-600 mt-1">
          AIがあなたの投稿履歴から次に投稿できる内容を提案します
        </p>
      </div>

      {/* タブUI */}
      <div className="mb-6">
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => setActiveTab("posts")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "posts"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            完成した投稿文
          </button>
          <button
            onClick={() => setActiveTab("ideas")}
            className={`flex-1 py-3 text-center font-medium transition-colors ${
              activeTab === "ideas"
                ? "border-b-2 border-black text-black"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            アイデアのみ
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {activeTab === "posts"
            ? "今すぐ使える投稿文を3パターン生成します"
            : "次の投稿アイデアをヒント形式で提案します"}
        </p>
      </div>

      {/* 生成ボタン */}
      <div className="mb-6">
        <button
          onClick={activeTab === "posts" ? handleGeneratePosts : handleGenerateIdeas}
          disabled={generating}
          className="w-full bg-black text-white text-lg py-3 rounded-md font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "生成中..." : activeTab === "posts" ? "投稿文を生成" : "アイデアを生成"}
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* 完成した投稿文タブ */}
      {activeTab === "posts" && (
        <>
          {posts.length > 0 ? (
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
          ) : (
            <div className="text-center py-12 border border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">まだ投稿文が生成されていません</p>
              <p className="text-sm text-gray-400">
                「投稿文を生成」ボタンを押して、今すぐ使える投稿文を作成しましょう
              </p>
            </div>
          )}
        </>
      )}

      {/* アイデアのみタブ */}
      {activeTab === "ideas" && (
        <>
          {ideas.length > 0 ? (
            <div className="space-y-4">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-4 rounded-lg border border-gray-300 bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-bold text-gray-700 bg-gray-200 rounded">
                      優先度 {idea.priority}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(idea.createdAt).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{idea.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 whitespace-pre-wrap">
                    {idea.description}
                  </p>
                  {idea.suggestedHashtags && idea.suggestedHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {idea.suggestedHashtags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-white border border-gray-300 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Link
                      href={`/compose/input?ideaId=${idea.id}`}
                      className="flex-1 text-center px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800"
                    >
                      このアイデアで投稿を作成
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">まだアイデアが生成されていません</p>
              <p className="text-sm text-gray-400">
                「アイデアを生成」ボタンを押して、次の投稿のヒントを得ましょう
              </p>
            </div>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/dashboard"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← ダッシュボードに戻る
        </Link>
      </div>
    </main>
  );
}
