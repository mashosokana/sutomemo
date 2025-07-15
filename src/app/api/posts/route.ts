//api/posts/route.ts

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
    } =await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "認証エラー（ログインしていません）" }, { status: 401 });
    }

    console.log("投稿ユーザーID:", user.id);

    await prisma.user.upsert({
      where: {id: user.id },
      update: {},
      create: {
        id: user.id,
      },
    });

    const body = await req.json();
    const { caption, memo } = body;

    if (!caption || !memo ) {
      return NextResponse.json({ message: 'caption、memoは必須です'}, {status: 400 })
    }

    const { answerWhy, answerWhat, answerNext } = memo

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        caption,
        memo: {
          create:{
            answerWhy,
            answerWhat,
            answerNext,
          }
        }
      },
    })

    return NextResponse.json(post, { status: 200 })
  } catch (error) {
    console.error("投稿中にサーバーエラー:", error);
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }  
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "認証エラー（ログインしてません" }, {status: 401 });
    }

    const posts =await prisma.post.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include:{
        memo: {
          select: {
            answerWhy: true,
            answerWhat: true,
            answerNext: true,
          },
        },
      },
    });

    return NextResponse.json(posts, { status: 200 })
  } catch (error) {
    console.error("GET /api/posts エラー:", error);
    return NextResponse.json({ message: "サーバーエラー" }, { status: 500 })
  }
}

  