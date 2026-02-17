// app/posts/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";

type MemoType = {
  answerWhy: string;
  answerWhat: string;
  answerNext: string;
};

type PostType = {
  id: number;
  caption: string;
  memo: MemoType | null;
  createdAt: string;
};

type DeleteResponse = {
  success?: boolean;
  deletedId?: number;
  error?: string;
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (!token) return;

    const ac = new AbortController();

    const fetchPosts = async () => {
      setLoadingPosts(true);
      setError(null);
      try {
        const res = await fetch("/api/posts", {
          headers: { Authorization: `Bearer ${token}` },
          signal: ac.signal,
          cache: "no-store",
        });
        const data: { posts?: PostType[]; error?: string } = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(data.error || "投稿取得に失敗しました");
        }

        const list = Array.isArray(data.posts) ? data.posts : [];
        
        list.sort((a, b) => {
          const tb = Date.parse(b.createdAt);
          const ta = Date.parse(a.createdAt);
          return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });
        setPosts(list);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
    return () => ac.abort();
  }, [token, router]);

  const handleDelete = useCallback(
    async (postId: number) => {
      if (!token) return;
      if (!confirm("この投稿を削除しますか？")) return;

      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const result: DeleteResponse = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(result.error || "削除に失敗しました");
        }

        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "不明なエラーが発生しました");
      }
    },
    [token, router]
  );

  if (!isLoading && !session) {
    return <div className="p-4">ログインページへ移動します...</div>;
  }
  if (loadingPosts) {
    return <div className="p-4">読み込み中...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-6">
        <Link
          href="/simple-memo"
          className="block w-full bg-black text-white text-lg py-3 rounded-md font-bold text-center hover:bg-gray-800"
        >
          新規作成
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-gray-600">まだ投稿がありません</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => {
            const content = [
              post.caption,
              post.memo?.answerWhy,
              post.memo?.answerWhat,
              post.memo?.answerNext,
            ]
              .filter(Boolean)
              .join("\n");

            return (
              <li key={post.id} className="border rounded-lg p-4 text-black">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold">
                    {new Date(post.createdAt).toLocaleDateString("ja-JP")}
                  </p>
                  <div className="flex gap-3 text-sm">
                    <Link href={`/posts/${post.id}`} className="text-gray-700 hover:underline">
                      開く
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-500 hover:underline"
                    >
                      削除
                    </button>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {content || "（内容なし）"}
                </pre>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
