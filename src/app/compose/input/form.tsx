// src/app/compose/input/Form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MemoForm from "@/app/_components/MemoForm";
import { useAuthMe } from "@/app/hooks/useAuthMe";
import { supabase } from "@/lib/supabase";

type Props = { userId: string; token: string | null };

const ENV_SANDBOX_ID = Number(process.env.NEXT_PUBLIC_GUEST_SANDBOX_POST_ID ?? "0");

function saveGuestDraft(d: { caption: string; answerWhy: string; answerWhat: string; answerNext: string }) {
  try { sessionStorage.setItem("guestDraft", JSON.stringify(d)); } catch {}
}

/* ---------------- 型ガード ---------------- */
type PostSummary = { id: number };
function isPostSummary(x: unknown): x is PostSummary {
  return typeof (x as { id?: unknown })?.id === "number";
}
function pickFirstId(json: unknown): number | null {
  // 返り値が配列パターン
  if (Array.isArray(json)) {
    const hit = json.find(isPostSummary);
    return hit?.id ?? null;
  }
  // 返り値が { items: [...] } パターン
  if (json && typeof json === "object") {
    const items = (json as { items?: unknown }).items;
    if (Array.isArray(items)) {
      const hit = items.find(isPostSummary);
      return hit?.id ?? null;
    }
  }
  return null;
}
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

/* ---------------------------------------------------- */

// ゲスト遷移先のIDを解決（env → /api/posts 先頭）
async function resolveGuestPostId(): Promise<number | null> {
  if (ENV_SANDBOX_ID > 0) return ENV_SANDBOX_ID;

  const { data: sess } = await supabase.auth.getSession();
  const t = sess.session?.access_token;
  if (!t) return null;

  try {
    const res = await fetch("/api/posts", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return pickFirstId(json);
  } catch {
    return null;
  }
}

export default function ComposeInputForm({ token }: Props) {
  const [caption, setCaption] = useState("");
  const [answerWhy, setAnswerWhy] = useState("");
  const [answerWhat, setAnswerWhat] = useState("");
  const [answerNext, setAnswerNext] = useState("");
  const router = useRouter();
  const { data: me } = useAuthMe();
  const isGuest = me?.isGuest ?? false;

  const handleSubmit = async (): Promise<void> => {
    // ★ ゲスト：DB保存せず、既存の投稿IDに trial 付きで遷移
    if (isGuest) {
      saveGuestDraft({ caption, answerWhy, answerWhat, answerNext });
    
      const pid = await resolveGuestPostId(); 
      const targetId = pid ?? 0;              
      router.push(`/posts/${targetId}?trial=1`);
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
