// src/app/_components/EditForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  id: number
  caption: string
  memo: {
    answerWhy: string 
    answerWhat: string
    answerNext: string
  }
}

export default function EditForm({ id, caption,  memo }: Props) {
const router = useRouter()

  const [newCaption, setNewCaption] = useState(caption)
  const [answerWhy, setAnswerWhy] = useState(memo.answerWhy ?? "")
  const [answerWhat, setAnswerWhat] = useState(memo.answerWhat ?? "")
  const [answerNext, setAnswerNext] = useState(memo.answerNext ?? "")

  const handleUpdate = async () => {
    console.log("送信しているid:", id);
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          caption: newCaption,
          memo: {
            answerWhy,
            answerWhat,
            answerNext
          }
        }),
      })

      if (!res.ok) throw new Error("更新に失敗しました")
      
      router.push(`/posts/${id}`)

      
    } catch(err) {
      console.error(err)
      alert("更新に失敗しました")
    }
  }

  return (
    <div className="space-y-4">
      <label className="block font-bold mb-1">やったこと学んだことをメモ</label>
     <input
        className="w-full border p-2 text-black"
        value={newCaption}
        onChange={(e) => setNewCaption(e.target.value)}
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
  )
}