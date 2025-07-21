// src/app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth"; 

function parsePostId(params: { id: string }) {
  const postId = Number(params.id);
  if (isNaN(postId)) {
    return {postId: null, error: "不正なIDです"};
  }
  return { postId, error: null };
}

export async function PUT(req: Request, { params }: { params: { id: string } })  {
  const { user, error: authError, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: authError }, { status });
  }
  const { postId, error: idError } = parsePostId(params);
  if (!postId) {
    return NextResponse.json({ error: idError }, {status: 400});
  }
  
  const existingPost = await prisma.post.findUnique({
    where: {
      id: postId,
      userId:user.id,
    },
  });
  
  if (!existingPost) {
    return NextResponse.json({ error: "投稿が存在しません" }, {status: 404})
  }
  
  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  if (!caption || !memo) {
    return NextResponse.json({ error: "captionとmemoは必須です" }, { status: 400 });
  }
  
  await prisma.memo.deleteMany({
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
      memo: true,// 詳細用は全memoを返す
    },
  });
  
  return NextResponse.json({ post: updatedPost }, {status: 200 }); 
} 

export async function GET(req: Request, { params }: { params: { id: string}} ) {
  const { user,error: authError, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: authError }, { status });
  }
  
  const { postId, error: idError } = parsePostId(params);
  if (!postId) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }
  
  const post = await prisma.post.findUnique({
    where: { 
      id: postId,
      userId: user.id,
    },
    include: { 
      memo: true // 詳細用は全memoを返す
    },
  });

  if (!post) {
    return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
  }

  return NextResponse.json({ post }, { status: 200 });
}

export async function DELETE(req: Request, { params }: { params: { id: string} }) {
  const { user, error, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error}, { status });
  }
  
  const { postId, error: idError } = parsePostId(params); // ← parsePostIdを使う（tokenの検証が終わってから）
  if (!postId) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
      userId: user.id,
    },
  });
  if (!post) {
    return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
  }

  await prisma.memo.deleteMany({where: { postId } });
  await prisma.post.delete({ where: { id: postId } });

  return NextResponse.json({ postId }, { status: 200 });
}
