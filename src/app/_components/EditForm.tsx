"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSupabaseSession } from "../hooks/useSupabaseSession"
import MemoForm from "./MemoForm"

type Props = {
  id: number;
};

export default function EditForm({ id }: Props) {
const router = useRouter()
const { token, isLoading: authLoading } = useSupabaseSession()

  const [caption, setCaption] = useState("")
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

        const { post } = await res.json();

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
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption,
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
    <MemoForm
      caption={caption}
      answerWhy={answerWhy}
      answerWhat={answerWhat}
      answerNext={answerNext}
      onCaptionChange={setCaption}
      onWhyChange={setAnswerWhy}
      onWhatChange={setAnswerWhat}
      onNextChange={setAnswerNext}
      onSubmit={handleUpdate}
      submitLabel="更新する"
    />
  );
}