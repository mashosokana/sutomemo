// app/dashboard/page.tsx
"use client"

import useSWR from "swr"
import { fetcher } from "@/utils/fetcher"
import { useRouter } from "next/navigation"
import Card from "../_components/Card"
import PrimaryButton from '@/app/_components/PrimaryButton'  // 今回は使わなくてもOK


type Post = {
  id: number
  userId: string
  caption: string
  status: "draft" | "published" | "archived" | "deleted"
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const router = useRouter()

  const { data: posts = [], 
    error, 
    isLoading,
   } = useSWR<Post []>("/api/posts", fetcher)
  console.log(posts.length)

   if (isLoading) return <main className="p-4">読み込み中...</main>
   if (error) return <main className="p-4 text-red-600">取得失敗</main>

  return (
    <main className="p-4 space-y-6 max-w-phone mx-auto">
      {posts!.length === 0 ? (
        <p>投稿がありません</p>
      ) : (
        posts!.map((post) => {
          console.log('render card', post.id)
          return (
            <Card key={post.id}>
            <p className="font-bold">{post.caption}</p>
            <p className="border border-gray-300 bg-white">
              {new Date(post.createdAt).toLocaleString()}
            </p>
            <a
              href={`/posts/${post.id}`}
              className="inline-block mt-2 text-blue-600 hover:underline"
              >
              投稿詳細へ
            </a>
          </Card>
          ) 
        })
      )}
      <PrimaryButton onClick={() => router.push('/compose/input')}>
        新規投稿
      </PrimaryButton>    
    </main>
  ) 
}
