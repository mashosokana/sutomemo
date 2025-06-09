// app/dashboard/page.tsx
"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase"

type Post = {
  id: number
  userId: string
  caption: string
  status: "draft" | "published" | "archived" | "deleted"
  createdAt: string
  updatedAt: string
}


export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    const fetchPosts = async () => {
      
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) return
        
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false })

        if (error) {
          console.error("投稿取得エラー:", error)
        } else {
          setPosts(data)
        }
        
        console.log("ログインユーザーID:", user.id)
        console.log("取得した投稿データ:", data)

    }    
    
    fetchPosts()
  }, [])

  return (
    <main className="p-4">
      {posts.length === 0 ? (
        <p>投稿がありません</p>
      ) : (
        posts.map((post) => (
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
