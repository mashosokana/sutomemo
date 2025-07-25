// app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import DashboardPostCard from "./DashboardPostCard";
import PostImageManager from "../posts/[id]/PostImageManager";

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
  images: ImageData[];
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!token) return;

      try {
        const res = await fetch("/api/posts", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "投稿取得に失敗しました");
        }

        setPosts(data.posts || []);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "不明なエラーが発生しました"
        );
      } finally {
        setLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [token]);

  type DeleteResponse = {
    success?: boolean;
    deletedId?: number;
    error?: string;
  };

  const handleDelete = async (postId: number) => {
    if (!token) return;
    if (!confirm("この投稿を削除しますか？")) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const result: DeleteResponse = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "削除に失敗しました");
      }

      setPosts((prev) => prev.filter((post) => post.id !== postId));
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "不明なエラーが発生しました"
      );
    }
  };

  if (isLoading || loadingPosts) {
    return <div className="p-4 text-red-500">読み込み中...: {error}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-4 text-center">
        <Link
          href="/compose/input"
          className="inline-block bg-green-500 text-white text-xl px-8 py-2 rounded font-bold hover:bg-green-600"
        >
          +新規作成
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-black">投稿一覧</h1>

      {posts.length === 0 ? (
        <p className="text-gray-600">まだ投稿がありません</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id} className="border-b pb-6">
              <DashboardPostCard
                date={new Date(post.createdAt).toLocaleDateString("ja-JP")}
                content={`${post.caption}\n${post.memo?.answerWhy ?? ""}\n${
                  post.memo?.answerWhat ?? ""
                }\n${post.memo?.answerNext ?? ""}`}
                imageUrl={post.imageUrl}
                onEdit={() => router.push(`/compose/input/${post.id}`)}
                onDelete={() => handleDelete(post.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
