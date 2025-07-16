// src/app/_components/EditForm.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseSession } from "../hooks/useSupabaseSession"

type Props = {
  id: number;
};

export default function EditForm({ id }: Props) {
const router = useRouter()
const { token, isLoading: authLoading } = useSupabaseSession()

  const [Caption, setCaption] = useState("")
  const [answerWhy, setAnswerWhy] = useState("")
  const [answerWhat, setAnswerWhat] = useState("")
  const [answerNext, setAnswerNext] = useState("")
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        if (!token) return;

        const res = await fetch(`/api/posts/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error?.error || "投稿取得に失敗しました");
        }

        const post = await res.json();
        setCaption(post.caption || "");
        setAnswerWhy(post.memo?.answerWhy || "");
        setAnswerWhat(post.memo?.answerWhat || "");
        setAnswerNext(post.memo?.answerNext || "");
      }catch (err: unknown) {
        console.error("取得エラー:", err);
        if (err instanceof Error){
          setFetchError(err.message);
        } else {
          setFetchError("不明なエラーが発生しました");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [id,token]);

  const handleUpdate = async () => {
    if (!token) {
      alert("認証トークンが見つかりません。ログインし直して下さい。");
      return;
    }

    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Caption,
          memo: {
            answerWhy,
            answerWhat,
            answerNext
          },
        }),
      });

      if (!res.ok) throw new Error("更新に失敗しました")
      
      router.push(`/posts/${id}`);      
    } catch(err: unknown) {
      console.error(err);
      if (err instanceof Error){
        alert(err.message);
      } else {
        alert("不明なエラーが発生しました");
      }
    }
  };

  if (authLoading || isLoading) return <p className="p-4">読み込み中...</p>;
  if (fetchError) return <p className="p-4 text-red-600">エラー: {fetchError}</p>;

  return (
    <div className="space-y-4">
      <label className="block font-bold mb-1">やったこと学んだことをメモ</label>
     <input
        className="w-full border p-2 text-black"
        value={Caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="タイトル"
      />

      <div>
        <label className="block font-bold mb-1">なぜこの内容をメモしたのか？（→ 背景やきっかけを明確化する）</label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerWhy}
          onChange={(e) => setAnswerWhy(e.target.value)}
        />
      </div>
      <div>
        <label className="block font-bold mb-1">何が起きた／どう感じたのか？（→ 起こった出来事や自分の気づき・感情を具体化）</label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerWhat}
          onChange={(e) => setAnswerWhat(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-bold mb-1">次に何をする／学んだ教訓は？（→ 今後のアクションや得られた示唆を整理）</label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerNext}
          onChange={(e) => setAnswerNext(e.target.value)}
        />
      </div>


      <div className="flex space-x-4">
        <button
          className="bg-black text-white px-4 px-2 rounded hover:opacity-80"
          onClick={handleUpdate}
        >
          更新する
        </button>
      </div>
    </div>
  );
}