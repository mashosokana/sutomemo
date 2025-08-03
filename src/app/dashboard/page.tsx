// app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
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
  images: ImageData[];
};

export default function DashboardPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();

  const [posts, setPosts] = useState<PostType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");

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
      console.log("削除開始: ", postId);
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

  const filteredPosts = posts.filter((post) => {
    const text = 
    `${post.caption}, 
    ${post.memo?.answerWhy ?? ""},
    ${post.memo?.answerWhat ?? ""},
    ${post.memo?.answerNext ?? ""},
    ${new Date(post.createdAt).toLocaleDateString("ja-JP")}`;
    return text.includes(searchQuery);
  });

  if (isLoading || loadingPosts) {
    return <div className="p-4 text-red-500">読み込み中...: {error}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">エラー: {error}</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      <div className="mb-4 text-black">
        <input
          type="text"
          placeholder="検索（日付や内容"
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
          {filteredPosts.map((post) => (
            <li key={post.id} className="border-b pb-6">
              <DashboardPostCard
                date={new Date(post.createdAt).toLocaleDateString("ja-JP")}
                content={`${post.caption}\n${post.memo?.answerWhy ?? ""}\n${
                  post.memo?.answerWhat ?? ""
                }\n${post.memo?.answerNext ?? ""}`}
                imageUrl={post.imageUrl}
                onEdit={() => router.push(`/posts/${post.id}`)}
                onDelete={() => handleDelete(post.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
