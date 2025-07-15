// app/dashboard/page.tsx

import { prisma } from "@/utils/prisma";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation"; 
import Link from "next/link";

export default async function DashboardPage(){
  const supabase = createServerComponentClient({ cookies });

  const{ 
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  
  console.log("ログインユーザー:", user)
  
  const posts = await prisma.post.findMany({
    where: {
      userId: user.id,
    },
    include: {
      memo: {
        select: {
          answerWhy: true,
          answerWhat: true,
          answerNext: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc"
    },
  });

  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="mb-0 text-center">
        <Link 
          href="/compose/input"
          className="inline-block bg-green-500 text-white text-xl px-8 py-2 rounded font-bold hover:bg-green-600"
        >
          +新規作成  
        </Link>  
      </div>
      <h1 className="text-2xl font-bold mb-6">投稿一覧</h1>

      {posts.length === 0 ? (
        <p>まだ投稿がありません</p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id} className="border border-gray-300 rounded p-4 bg-white">
              <h2 className="text-xl font-semibold text-black"> {post.caption}</h2>
                <Link 
                  href={`/compose/input/${post.id}`}>
                  <button className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    編集
                  </button>
                </Link>
              {post.memo && (
                <div className="mt-2 text-sm text-black ">
                  <p><strong>なぜ：</strong>{post.memo.answerWhy}</p>
                  <p><strong>何が：</strong>{post.memo.answerWhat}</p>
                  <p><strong>次に：</strong>{post.memo.answerNext}</p>
                </div>
              )}
            </li>
            ))}
        </ul>
      )}
    </main>
  )
}