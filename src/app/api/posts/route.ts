// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const, error: "Unauthorized" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const, error: "Unauthorized" };
  return { user: data.user, status: 200 as const, error: null };
}

export async function POST(req: Request) {
  try {
    const { user, status, error } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const body = await req.json().catch(() => null);
    const caption: unknown = body?.caption;
    const memo: unknown = body?.memo;

    if (typeof caption !== "string" || caption.trim().length === 0) {
      return NextResponse.json({ error: "captionは必須です" }, { status: 400 });
    }
    type MemoPayload = { answerWhy?: unknown; answerWhat?: unknown; answerNext?: unknown };
    const { answerWhy, answerWhat, answerNext } = (memo ?? {}) as MemoPayload;

    if (
      typeof answerWhy !== "string" ||
      typeof answerWhat !== "string" ||
      typeof answerNext !== "string"
    ) {
      return NextResponse.json({ error: "memoの各項目は必須です" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        caption: caption.trim(),
        memo: {
          create: {
            answerWhy: answerWhy.trim(),
            answerWhat: answerWhat.trim(),
            answerNext: answerNext.trim(),
          },
        },
      },
      include: { memo: true },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    console.error("POST /api/posts error:", e);
    return NextResponse.json({ error: "投稿作成でエラーが発生しました" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { user, status, error } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { 
        memo: true, 
        images: { orderBy: {generatedAt: "desc"} },
      },
    });

    const postsWithSignedUrls = await Promise.all(
      posts.map(async (post) => {
        const nonHeic = post.images.filter(img => !/\.hei(c|f)$/i.test(img.imageKey));
        const signedImages = await Promise.all(
          nonHeic.map(async (img) => {
            const { data: signed, error: signedError } = await supabaseAdmin
              .storage
              .from("post-images")
              .createSignedUrl(img.imageKey, 60 * 60); // 1時間
            if (signedError) {
              console.warn(`Signed URL creation failed: ${signedError.message}`);
            }
            return { id: img.id, imageKey: img.imageKey, signedUrl: signed?.signedUrl ?? "" };
          })
        );

        const imageUrl = signedImages[0]?.signedUrl ?? null;

        return {
          id: post.id,
          caption: post.caption,
          createdAt: post.createdAt,
          memo: post.memo,
          imageUrl, 
          images: signedImages,
        };
      })
    );

    return NextResponse.json({ posts: postsWithSignedUrls }, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return NextResponse.json({ error: "投稿一覧の取得に失敗しました" }, { status: 500 });
  }
}
