//api/posts/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const { user, error, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error }, { status });
  }

  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  if (!caption || !memo) {
    return NextResponse.json(
      { error: "caption、memoは必須です" },
      { status: 400 }
    );
  }

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      caption,
      memo: {
        create: {
          answerWhy,
          answerWhat,
          answerNext,
        },
      },
    },
    include: { memo: true },
  });

  return NextResponse.json({ post }, { status: 201 }); // 作成時のみ 201
}

export async function GET(req: Request) {
  const { user, error, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error }, { status });
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      caption: true,
      createdAt: true,
      memo: {
        select: {
          answerWhy: true,
          answerWhat: true,
          answerNext: true,
        },
      },
      images: {
        select: {
          id: true,
          imageKey: true,
        },
      },
    },
  });

  const postsWithImages = posts.map((post) => {
    const images = post.images.map((img) => {
      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(img.imageKey);
      return {
        id: img.id,
        key: img.imageKey,
        url: data?.publicUrl || "",
      };
    });

    const firstImageUrl = images[0]?.url ?? null;

    return {
      id: post.id,
      caption: post.caption,
      createdAt: post.createdAt,
      memo: post.memo,
      imageUrl: firstImageUrl, 
      images,                  
    };
  });

  return NextResponse.json({ posts: postsWithImages }, { status: 200 });
}
