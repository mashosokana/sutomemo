//app/compose/input/[id]/page.tsx

"use client"

import { useEffect, useState } from "react";
import EditForm from "@/app/_components/EditForm";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";

type EditPageProps = {
  params: { id: string }
}

type PostType = {
  id: number;
  caption: string;
  memo: {
    answerWhy: string;
    answerWhat: string;
    anserNext: string;
  } | null;
};

export default function EditPage({ params }: EditPageProps) {
  const { session } = useSupabaseSession();
  const [post, setPost] = useState<PostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const postId = Number(params.id);

  useEffect(() => {
    if (!session) return;

    const fetchPost = async () => {
      setLoading(true);

      try {
        const res = await fetch(`/api/posts/${params.id}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        });
  
        const data = await res.json();
  
        if (!res.ok) {
          throw new Error(data.error || '登校の取得に失敗しました');
        }
  
        setPost(data.post);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("予期せぬエラーが発生しました")
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [session, params.id]);

  if (loading) return <main className="p-6">読み込み中...</main>;
  if (error) return <main className="p-6 text-red-500">エラー: {error}</main>;
  if (!post) return <main className="p-6">投稿が見つかりません</main>;

  return (
    <main className="max-w-xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">保存の編集</h1>
      <EditForm  id={postId} />
    </main>
  );
}