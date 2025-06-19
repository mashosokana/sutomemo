// app/posts/[id]/page.tsx
'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

import MemoForm from '@/app/_components/MemoForm'
import { fetcher } from '@/utils/fetcher'

type ImageObj = {
  id: number
  url: string
}

type Post = {
  id: number
  caption: string
  createdAt: string
  images: ImageObj[]
  memo: {
    freeMemo: string
    answerWhy: string
    answerWhat: string
    answerNext: string
  } | null
}

/* ---------- 画面 ---------- */
export default function PostDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()

  const {
    data: post,
    error,
    isLoading,
    mutate,
  } = useSWR<Post>(`/api/posts/${params.id}`, fetcher)

  /* 投稿そのものを削除 */
  const handleDeletePost = useCallback(async () => {
    if (!confirm('この投稿を削除しますか？')) return
    const token = localStorage.getItem('token')

    const res = await fetch(`/api/posts/${params.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.ok) {
      router.push('/dashboard')
    } else {
     alert('削除に失敗しました')
    }  
  }, [params.id, router])

  /* 画像 1 枚だけ削除（複数対応する場合は引数で id を受け取る） */
  const handleDeleteImage = useCallback(
    async (imageId: number) => {
      if (!confirm('この画像を削除しますか？')) return
      const token = localStorage.getItem('token')

      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        await mutate()
      }else {
        alert('画像の削除に失敗しました')
      }
    },
    [mutate],
  )

  /* ---------- UI ステート ---------- */
  if (isLoading) return <p className="p-4">読み込み中…</p>
  if (error)      return <p className="p-4 text-red-600">取得失敗</p>
  if (!post)      return <p className="p-4">存在しない投稿です</p>

  const firstImg = post.images[0]

  return (
    <main className="p-4 space-y-4 max-w-phone mx-auto">
      {firstImg && (
        <div className="relative">
          <Image
            src={firstImg.url}
            alt={post.caption || 'post image'}
            width={400}
            height={160}
            className="w-full h-40 object-cover rounded-md"
            unoptimized
          />

          <button
            onClick={() => handleDeleteImage(firstImg.id)}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
          >
            ×
          </button>
        </div>
      )}

      <h1 className="text-2xl font-bold">{post.caption}</h1>

      <MemoForm postId={post.id} memo={post.memo} onSaved={mutate} />

      <button
        onClick={handleDeletePost}
        className="text-red-500 hover:underline"
      >
        投稿を削除
      </button>
    </main>
  )
}

