//api/posts/route.ts
import { NextResponse, NextRequest } from "next/server"
import { supabase } from "@/utils/supabase"
import { prisma } from "@/utils/prisma"

export const GET = async (request: NextRequest) => {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = data.user.id
  const posts = await prisma.post.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      images: true,
      memo: true,
    }
  })

  const result = posts.map(post => ({
    id: post.id,
    caption: post.caption,
    status: post.status,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    images: post.images.map(img => ({
      id: img.id,
      url: img.url,
    })),
    memo: post.memo
      ? {
          freeMemo: post.memo.freeMemo,
          answerWhy: post.memo.answerWhy,
          answerWhat: post.memo.answerWhat,
          answerNext: post.memo.answerNext,
        }
      : null,
  }))

  return NextResponse.json(result)
}

export const POST = async (request: NextRequest) => {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")
  const { data, error } = await supabase.auth.getUser(token);

  if ( error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json()
  const {
    caption,
    status = 'draft',
    memo: memoInput = {},      // ← memo が無い場合は空オブジェクト
  }: {
    caption: string
    status?: 'draft' | 'published'
    memo?: {
      freeMemo?: string
      answerWhy?: string
      answerWhat?: string
      answerNext?: string
    }
  } = body

  /* ② DB へ保存 */
  const newPost = await prisma.post.create({
    data: {
      userId: data.user.id,
      caption,
      status,
      memo: {
        create: {
          freeMemo: memoInput.freeMemo ?? '',
          answerWhy: memoInput.answerWhy ?? '',
          answerWhat: memoInput.answerWhat ?? '',
          answerNext: memoInput.answerNext ?? '',
        },
      },
      images: {
        create: [], // 画像は後で追加予定
      },
    },
    include: { memo: true, images: true },
  })

  return NextResponse.json(newPost, { status: 201 })
}