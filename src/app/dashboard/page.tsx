// app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react";
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
};

export default function DashboardPage() {
  const { session, token, isLoading } =useSupabaseSession();
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
          throw new Error(data.error || "投稿に失敗しました");
        }

        setPosts(data.posts || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("不明なエラーが発生しました");
        }
      } finally {
        setLoadingPosts(false);
      }
    };

    if (token) fetchPosts();
  }, [token]);

  if (isLoading || loadingPosts) {
    return <div className="p-4 text-red-500">エラー: {error}</div>;
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="mb-4 text-center">
        <Link
          href="/compose/input"
          className="inline-block bg-green-500 text-white text-xl px-8py-2 rounded font-bold hover:bg-green-600"
        >
          +新規作成
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">投稿一覧</h1>

      {posts.length === 0 ? (
        <p>まだ投稿がありません</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id} className="border border-gray-300 rounded p-4 bg-white">
              <h2 className="text-xl font-semibold text-black">{post.caption}</h2>
              <Link href={`/compose/input/${post.id}`}>
                <button className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600">
                  編集
                </button>
              </Link>
              {post.memo && (
                <div className="mt-2 text-sm text-black">
                  <p><strong>なぜ：</strong>{post.memo.answerWhy}</p>
                  <p><strong>何が：</strong>{post.memo.answerWhat}</p>
                  <p><strong>次に：</strong>{post.memo.answerNext}</p>
                </div>
              )}
            </li>
          ))}
        </ul> 
      )}
    </main>
  );
}