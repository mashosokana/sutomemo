// app/dashboard/page.tsx
"use client"

import useSWR from "swr"
import { fetcher } from "@/utils/fetcher"


type Post = {
  id: number
  userId: string
  caption: string
  status: "draft" | "published" | "archived" | "deleted"
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {

  const { data: posts = [], 
    error, 
    isLoading,
   } = useSWR<Post []>("/api/posts", fetcher)

   if (isLoading) return <main className="p-4">読み込み中...</main>
   if (error) return <main className="p-4 text-red-600">取得失敗</main>

  return (
    <main className="p-4">
      {posts!.length === 0 ? (
        <p>投稿がありません</p>
      ) : (
        posts!.map((post) => (
          <div key={post.id} className="border p-4 rounded-lg shadow mb-4">
            <p className="font-bold">{post.caption}</p>
            <p className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleString()}
            </p>
            <a
              href={`/posts/${post.id}`}
              className="inline-block mt-2 text-blue-600 hover:underline"
              >
              投稿詳細へ
            </a>
          </div>
        ))
      )}    
    </main>
  ) 
}
