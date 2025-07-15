//app/posts/[id]/EditButton.tsx
'use client'

import { useRouter } from "next/navigation"

export default function EditButton ({ postId }: { postId: number }) {
  const router = useRouter()

  return (
    <button
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      onClick={() => router.push(`/compose/input/${postId}`)}
    >
      編集する
    </button>
  )
}