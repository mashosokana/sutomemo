// src/app/api/posts/[id]/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";

export async function PUT(req: Request, { params }: { params: { id: string } })  {
  
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.upsert({
    where: { id: user.id},
    update: {},
    create: {
      id: user.id,
    },
  });

  const postId = Number(params.id);
  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  const existingPost = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });
  
  if (!existingPost) {
    return NextResponse.json({ error: 'Post not found' }, {status: 404})
  }

  if (existingPost.userId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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
      memo: true,
    },
  });

  return NextResponse.json(updatedPost)
  
} 
