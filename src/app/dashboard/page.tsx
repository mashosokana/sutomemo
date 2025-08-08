// app/dashboard/page.tsx

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import DashboardPostCard from "./DashboardPostCard";

type MemoType = {
  answerWhy: string;
  answerWhat: string;
  answerNext: string;
};

type ImageData = {
  id: number;
  key: string;
  url: string;
};

type PostType = {
  id: number;
  caption: string;
  memo: MemoType | null;
  imageUrl?: string; 
  createdAt: string;
  images?: ImageData[];
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

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

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          throw new Error(data.error || "投稿取得に失敗しました");
        }

        const list: PostType[] = Array.isArray(data.posts) ? data.posts : [];
        list.sort((a, b) => {
          const tb = Date.parse(b.createdAt);
          const ta = Date.parse(a.createdAt);
          return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });
        setPosts(list);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; 
        }
        setError(err instanceof Error ? err.message : "不明なエラーが発生しました");
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
    return () => ac.abort();
  }, [token, router]);

  type DeleteResponse = {
    success?: boolean;
    deletedId?: number;
    error?: string;
  };

  const handleDelete = useCallback(async (postId: number) => {
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
  }, [token, router]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredPosts = useMemo(() => {
    if (!normalizedQuery) return posts;

    return posts.filter((post) => {
      const text = [
        post.caption ?? "",
        post.memo?.answerWhy ?? "",
        post.memo?.answerWhat ?? "",
        post.memo?.answerNext ?? "",
        new Date(post.createdAt).toLocaleDateString("ja-JP"),
      ]
        .filter(Boolean).join(" ")
        .toLowerCase();

      return text.includes(normalizedQuery);
    });
  }, [posts, normalizedQuery]);

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
      <div className="mb-4 text-black">
        <input
          type="text"
          placeholder="検索（日付や内容）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border rounded-md"
        />
      </div>

      <div className="mb-6">
        <Link
          href="/compose/input"
          className="block w-full bg-black text-white text-lg py-3 rounded-md font-bold text-center hover:bg-gray-800"
        >
          +新規作成
        </Link>
      </div>

      {filteredPosts.length === 0 ? (
        <p className="text-gray-600">まだ投稿がありません</p>
      ) : (
        <ul className="space-y-4">
          {filteredPosts.map((post) => {
            const firstImageUrl =
              post.imageUrl || post.images?.[0]?.url || undefined;

            return (
              <li key={post.id} className="border-b pb-6">
                <DashboardPostCard
                  date={new Date(post.createdAt).toLocaleDateString("ja-JP")}
                  content={[
                    post.caption,
                    post.memo?.answerWhy,
                    post.memo?.answerWhat,
                    post.memo?.answerNext,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                  imageUrl={firstImageUrl}
                  onEdit={() => router.push(`/posts/${post.id}`)}
                  onDelete={() => handleDelete(post.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
