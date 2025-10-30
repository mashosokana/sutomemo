// src/app/compose/input/Form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MemoForm from "@/app/_components/MemoForm";
import { useAuthMe } from "@/app/hooks/useAuthMe";

type Props = { userId: string; token: string | null; initialCaption?: string };

function saveGuestDraft(d: { caption: string; answerWhy: string; answerWhat: string; answerNext: string }) {
  try { sessionStorage.setItem("guestDraft", JSON.stringify(d)); } catch {}
}

/* ---------------- 型ガード ---------------- */
type CreatePostResponse = { post?: { id?: number }; error?: string };

function extractCreatedId(json: unknown): number | null {
  const obj = (json as Partial<CreatePostResponse>) ?? null;
  const id = obj?.post?.id;
  return typeof id === 'number' ? id : null;
}

function extractError(json: unknown): string | null {
  const obj = (json as Partial<CreatePostResponse>) ?? null;
  return typeof obj?.error === 'string' ? obj.error : null;
}

export default function ComposeInputForm({ token, initialCaption }: Props) {
  const [caption, setCaption] = useState(initialCaption || "");
  const [answerWhy, setAnswerWhy] = useState("");
  const [answerWhat, setAnswerWhat] = useState("");
  const [answerNext, setAnswerNext] = useState("");
  const router = useRouter();
  const { data: me } = useAuthMe();
  const isGuest = me?.isGuest ?? false;

  const handleSubmit = async (): Promise<void> => {
    // ★ ゲスト：新規投稿を作成し、trial 付きで遷移
    if (isGuest) {
      saveGuestDraft({ caption, answerWhy, answerWhat, answerNext });

      if (!token) {
        alert("認証トークンが見つかりません。ログインし直して下さい。");
        return;
      }

      // ゲストセッションIDを取得
      const guestSessionId = typeof window !== 'undefined'
        ? sessionStorage.getItem('guestSessionId')
        : null;

      const postData = {
        caption,
        memo: { answerWhy, answerWhat, answerNext },
        guestSessionId, // ゲストセッションIDを送信
      };

      try {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(postData),
        });

        const data: unknown = await res.json();
        if (!res.ok) {
          throw new Error(extractError(data) ?? "投稿に失敗しました");
        }

        const postId = extractCreatedId(data);
        if (!postId) throw new Error("投稿IDが取得できませんでした");
        router.push(`/posts/${postId}?trial=1`);
      } catch (err) {
        console.error("投稿エラー", err);
        alert("送信中にエラーが発生しました");
      }
      return;
    }

    // ★ 会員：通常の作成 → 新IDへ
    if (!token) {
      alert("認証トークンが見つかりません。ログインし直して下さい。");
      return;
    }
    const postData = { caption, memo: { answerWhy, answerWhat, answerNext } };

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(postData),
      });

      const data: unknown = await res.json();           // any禁止
      if (!res.ok) {
        throw new Error(extractError(data) ?? "投稿に失敗しました");
      }

      const postId = extractCreatedId(data);            // any禁止
      if (!postId) throw new Error("投稿IDが取得できませんでした");
      router.push(`/posts/${postId}`);
    } catch (err) {
      console.error("投稿エラー", err);
      alert("送信中にエラーが発生しました");
    }
  };

  return (
    <main className="max-w-xl mx-auto p-6 bg-white text-black min-h-screen">
      <h1 className="text-2xl font-bold mb-6">メモする</h1>
      <MemoForm
        caption={caption}
        answerWhy={answerWhy}
        answerWhat={answerWhat}
        answerNext={answerNext}
        onCaptionChange={setCaption}
        onWhyChange={setAnswerWhy}
        onWhatChange={setAnswerWhat}
        onNextChange={setAnswerNext}
        onSubmit={handleSubmit}
        submitLabel="文章を書き出す"
        gate={false}  
      />
    </main>
  );
}
