// src/app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: Request, { params }: { params: { id: string } })  {
  const postId = Number(params.id);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "ふせいなIDです"}, {status: 400});
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token){
    return NextResponse.json({ error: "トークンがありません"}, { status: 401});
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (error || !user) {
    console.error("認証エラー:", error)
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  await prisma.user.upsert({
    where: { id: user.id},
    update: {},
    create: {
      id: user.id,
    },
  });

  const existingPost = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });
  
  if (!existingPost) {
    return NextResponse.json({ error: "投稿が存在しません" }, {status: 404})
  }

  if (existingPost.userId !== user.id) {
    return NextResponse.json({ error: "この投稿を編集する権限がありません" }, { status: 403 });
  }

  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  if (!caption || !memo) {
    return NextResponse.json({ error: "captionとmemoは必須です" }, { status: 400 });
  }

  await prisma.memo.delete({
    where: { postId }
  });
  
  const updatedPost = await prisma.post.update({
    where: {
       id: postId,
    },
    data: {
      caption,
      memo: {
        create:{
          answerWhy,
          answerWhat,
          answerNext,
        }
      }
    },
    include: {
      memo: true,
    },
  });

  return NextResponse.json({ post: updatedPost }, {status: 200 }); 
} 

export async function GET(req: NextResponse, { params }: { params: { id: string}} ) {
  const postId = Number(params.id);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "不正なIDです" }, {status: 400 });
  }

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "トークンがありません"}, { status: 401 });
  }

  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  const user = userData?.user;

  if (error || !user) {
    console.error("認証エラー", error);
    return NextResponse.json({ error: "認証エラー"}, { status: 401 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId},
    include: {
      memo: true,
    },
  });

  if (!post) {
    return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
  }

  if (post.userId !== user.id) {
    return NextResponse.json({ error: "この投稿にアクセスする権限がありません" },{ status: 403 });
  }
  return NextResponse.json({ post }, { status: 200 });
}
