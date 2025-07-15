// app/compose/input/form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
};

export default function ComposeInputForm({ userId }: Props){
  const [caption, setCaption] = useState("")
  const [answerWhy, setAnswerWhy] = useState("")
  const [answerWhat, setAnswerWhat] = useState("")
  const [answerNext, setAnswerNext] = useState("")

  const router = useRouter();

  const handleSubmit = async () => {
    const postData = {
      userId,
      caption,
      memo: {
        answerWhy,
        answerWhat,
        answerNext,           
      },
    };

    console.log("送信データ:",postData);

    try { 
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:JSON.stringify(postData),
      });
    
      if (!res.ok) {
        throw new Error("投稿に失敗しました")
      }

      const post = await res.json();
      router.push(`/posts/${post.id}`);

      } catch (err) {
      console.error(err)
      alert("送信中にエラーが発生しました")
      }
    };
    
    return (
      <main className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font- bold mb-6">メモする</h1>
    
        <div className="mb-4">
          <label className="block font-semibold mb-1">今日のやったこと学んだことをメモ</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full border rounded px-3 py-2 text-black"
            placeholder="短いタイトルを入力"
          />
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">なぜこの内容をメモしたのか？（→ 背景やきっかけを明確化する）</label>
          <textarea
          value={answerWhy}
          onChange={(e) => setAnswerWhy(e.target.value)}
          className="w-full border rounded px-3 py-2 text-black"
          rows={2}
        />
        </div>
    
        <div className="mb-4">
          <label className="block font-semibold mb-1">何が起きた／どう感じたのか？（→ 起こった出来事や自分の気づき・感情を具体化）</label>
          <textarea
            value={answerWhat}
            onChange={(e) => setAnswerWhat(e.target.value)}
            className="w-full border rounded px-3 py-2 text-black"
            rows={2}
          />
        </div>
    
        <div className="mb-6">
          <label className="block font-semibold mb-1">次に何をする／学んだ教訓は？（→ 今後のアクションや得られた示唆を整理）</label>
          <textarea
            value={answerNext}
            onChange={(e) => setAnswerNext(e.target.value)}
            className="w-full border rounded px-3 py-2 text-black"
            rows={2}
          />
        </div>
    
        <button
          onClick={handleSubmit}
          className="bg-black text-white px-4 py-2 rounded hover:opacity-80 transition"
        >
          メモを保存する
        </button>
      </main>
    )
}


