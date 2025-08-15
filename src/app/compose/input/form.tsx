"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MemoForm from "@/app/_components/MemoForm";

type Props = {
  userId: string;
  token: string | null;
};

export default function ComposeInputForm({ token }: Props){
  const [caption, setCaption] = useState("");
  const [answerWhy, setAnswerWhy] = useState("");
  const [answerWhat, setAnswerWhat] = useState("");
  const [answerNext, setAnswerNext] = useState("");

  const router = useRouter();

  const handleSubmit = async () => {
    if (!token) {
      alert("認証トークンが見つかりません。ログインし直して下さい。");
      return;
    }

    const postData = {
      caption,
      memo: {
        answerWhy,
        answerWhat,
        answerNext,           
      },
    };

    try { 
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body:JSON.stringify(postData),
      });

      const data = await res.json();
    
      if (!res.ok) {
        throw new Error(data.error || "投稿に失敗しました");
      }

      console.log("保存成功:", data);

      const postId = data.post?.id;
      if (!postId) {
        throw new Error("投稿IDが取得できませんでした")
      }
      router.push(`/posts/${postId}`);
    } catch (err) {
      console.error("投稿エラー",err);
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
        />
    </main>
    );
}