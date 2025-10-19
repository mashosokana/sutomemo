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

export default function IdeasPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (!token) return;

    const fetchIdeas = async () => {
      setLoadingData(true);
      try {
        const res = await fetch("/api/ideas", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = await res.json();

        if (res.ok) {
          setIdeas(data.ideas || []);
        }
      } catch (error) {
        console.error("Ideas fetch error:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchIdeas();
  }, [token]);

  const handleGenerateIdeas = async () => {
    if (!token || generating) return;

    setGenerating(true);
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
        alert(data.error || "AI提案の生成に失敗しました");
      }
    } catch (error) {
      console.error("Generate ideas error:", error);
      alert("AI提案の生成中にエラーが発生しました");
    } finally {
      setGenerating(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">AI投稿提案</h1>
        <p className="text-gray-600 mt-1">
          AIがあなたの投稿履歴から次の投稿アイデアを提案します
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleGenerateIdeas}
          disabled={generating}
          className="w-full bg-black text-white text-lg py-3 rounded-md font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? "生成中..." : "新しい提案を生成"}
        </button>
      </div>

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
                  この提案で投稿を作成
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">まだAI提案がありません</p>
          <p className="text-sm text-gray-400 mb-4">
            投稿を作成すると、AIが次の投稿案を自動で提案します
          </p>
          <button
            onClick={handleGenerateIdeas}
            disabled={generating}
            className="inline-block px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {generating ? "生成中..." : "今すぐ提案を生成"}
          </button>
        </div>
      )}
    </main>
  );
}
