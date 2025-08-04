import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; 

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

  return NextResponse.json({ post }, { status: 201 });
}

export async function GET(req: Request) {
  const { user, error, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error }, { status });
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      memo: true,
      images: true,
    },
  });

  const postsWithSignedUrls = await Promise.all(
    posts.map(async (post) => {
      const signedImages = await Promise.all(
        post.images.map(async (img) => {
          const { data: signed, error: signedError } = await supabaseAdmin
            .storage
            .from("post-images")
            .createSignedUrl(img.imageKey, 60 * 60); // 1時間有効

          if (signedError) {
            console.warn(`Signed URL creation failed: ${signedError.message}`);
          }

          return {
            id: img.id,
            key: img.imageKey,
            url: signed?.signedUrl ?? null,
          };
        })
      );

      return {
        id: post.id,
        caption: post.caption,
        createdAt: post.createdAt,
        memo: post.memo,
        imageUrl: signedImages[0]?.url ?? null, // ダッシュボード表示用
        images: signedImages,
      };
    })
  );

  return NextResponse.json({ posts: postsWithSignedUrls }, { status: 200 });
}
