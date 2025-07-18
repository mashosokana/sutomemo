//api/posts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "認証トークンがありません" }, {status: 401});
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;
  if (error || !user) {
    console.error("認証エラー:", error);
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 401 });
  }
    
  await prisma.user.upsert({
    where: {id: user.id },
    update: {},
    create: {
      id: user.id,
    },
  });

  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  if (!caption || !memo ) {
    return NextResponse.json({ message: 'caption、memoは必須です'}, {status: 400 })
  }

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      caption,
      memo: {
        create:{
          answerWhy,
          answerWhat,
          answerNext,
        },
      },
    },
  });

  return NextResponse.json({ post }, { status: 200 });
}

export async function GET(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "認証トークンがありません" }, { status: 401 });
  }
  
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const user = userData!.user;
  if (error || !user) {
    return NextResponse.json({ error: "認証に失敗しました" }, {status: 401 });
  }

  const posts =await prisma.post.findMany({
    where: {userId: user.id },
    orderBy: {createdAt: "desc" },
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


  return NextResponse.json({ posts }, { status: 200 })
}

  