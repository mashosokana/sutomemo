//app/compose/input/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import PrimaryButton from '@/app/_components/PrimaryButton'
import ImageUploader from '@/app/_components/ImageUploader'

export default function ComposePage() {
  const router = useRouter()

  /* 投稿フォームの state */
  const [status,     setStatus]     = useState<'draft' | 'published'>('draft')
  const [freeMemo,   setFreeMemo]   = useState('')
  const [answerWhy,  setAnswerWhy]  = useState('')
  const [answerWhat, setAnswerWhat] = useState('')
  const [answerNext, setAnswerNext] = useState('')
  const [loading,    setLoading]    = useState(false)

  /* 投稿作成に成功すると postId が入る */
  const [postId,     setPostId]     = useState<number | null>(null)

  /* ───────── 投稿作成 ───────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!freeMemo.trim()) {
      alert('フリーメモを入力してください')
      return
    }

    setLoading(true)
    const token = localStorage.getItem('token') ?? ''

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        caption: freeMemo,
        status,
        memo: { freeMemo, answerWhy, answerWhat, answerNext },
      }),
    })

    setLoading(false)

    if (!res.ok) {
      alert('保存失敗')
      return
    }

    /* レスポンスから post.id を取り出して保持 */
    const { id } = await res.json()
    setPostId(id)
  }

  /* ───────── 画面 ───────── */
  return (
    <main className="p-4 max-w-phone mx-auto">
      <h1 className="text-lg font-bold mb-4">新規メモ</h1>

      {/* まだ post を作っていないときはフォーム、作成後はアップローダー */}
      {!postId ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* フリーメモ (＝ caption) */}
          <textarea
            value={freeMemo}
            onChange={(e) => setFreeMemo(e.target.value)}
            placeholder="学んだこと・振り返りメモ（ここが一覧の見出しになります）"
            className="border w-full p-2 rounded-md"
            rows={3}
          />

          {/* 3 Questions */}
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

          {/* Status */}
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

          <PrimaryButton type="submit" disabled={loading}>
            {loading ? '送信中…' : '投稿を作成'}
          </PrimaryButton>
        </form>
      ) : (
        /* ───────── 投稿作成後：画像アップロード ───────── */
        <>
          <p className="mb-2 font-semibold">画像を追加</p>

          <ImageUploader
            postId={postId}
            onUploaded={() => router.push('/dashboard')} // 1 枚アップ後に一覧へ戻る
          />

          <button
            className="mt-4 text-blue-600 underline"
            onClick={() => router.push('/dashboard')}
          >
            画像を追加せずにダッシュボードへ戻る
          </button>
        </>
      )}
    </main>
  )
}
