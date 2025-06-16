//app/compose/input/page.tsx
"use client" 

import { useRouter } from "next/navigation"
import { FormEvent, useState } from 'react'
import PrimaryButton from "@/app/components/PrimaryButton"

export default function ComposePage() {
  const router = useRouter()

  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [freeMemo,   setFreeMemo]   = useState('')
  const [answerWhy,  setAnswerWhy]  = useState('')
  const [answerWhat, setAnswerWhat] = useState('')
  const [answerNext, setAnswerNext] = useState('')
  const [loading,setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const token = localStorage.getItem('token')

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ 
        caption: freeMemo,
        status,
        memo: {
          freeMemo,
          answerWhy,
          answerWhat,
          answerNext,
        },  
      }),
    })

    setLoading(false)
    
    if (!res.ok) {
      alert('保存失敗')
      return
    }

    router.push("/dashboard")
  }

  return (
    <main className="p-4 max-w-phone mx-auto">
      <h1 className="text-lg font-bold mb-4">新規メモ</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* フリーメモ（＝キャプション兼用） */}
        <textarea
          value={freeMemo}
          onChange={(e) => setFreeMemo(e.target.value)}
          placeholder="学んだこと・振り返りメモ（ここが一覧の見出しになります）"
          className="border w-full p-2 rounded-md"
          rows={3}
        />

        {/* 3 つの質問 */}
        <input
          value={answerWhy}
          onChange={(e) => setAnswerWhy(e.target.value)}
          placeholder="Why?（なぜ）"
          className="border w-full p-2 rounded-md"
        />
        <input
          value={answerWhat}
          onChange={(e) => setAnswerWhat(e.target.value)}
          placeholder="What?（何を学んだか）"
          className="border w-full p-2 rounded-md"
        />
        <input
          value={answerNext}
          onChange={(e) => setAnswerNext(e.target.value)}
          placeholder="Next?（次にやること）"
          className="border w-full p-2 rounded-md"
        />

        {/* ステータス */}
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as 'draft' | 'published')
          }
          className="border p-2 rounded-md"
        >
          <option value="draft">下書き</option>
          <option value="published">公開</option>
        </select>

        {/* 送信ボタン */}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? '送信中…' : '投稿する'}
        </PrimaryButton>
      </form>
    </main>
  )
}