// src/app/api/posts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPublicThumbUrl, createSignedUrl } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 60 * 60; 
const IMAGE_BUCKET = "post-images"; 

const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

function isGuestUser(email?: string | null): boolean {
  const a = email?.toLowerCase() ?? "";
  const b = (process.env.GUEST_USER_EMAIL ?? "").toLowerCase();
  return a === b;
}

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

    if (isGuestUser(user.email)) {
      return NextResponse.json({ error: "ゲストユーザーは新規作成できません" }, { status: 403 });
    }

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
        memo: {
          select: {
            id: true,
            postId: true,
            answerWhy: true,
            answerWhat: true,
            answerNext: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        images: {
          orderBy: { generatedAt: "desc" },
          select: { id: true, imageKey: true }, 
        },
      },
    });

    const postsWithUrls = await Promise.all(
      posts.map(async (post) => {

        const thumbKey =
          (post as unknown as { thumbnailImageKey?: string | null })?.thumbnailImageKey ?? undefined;

        const images: Array<{ id: number; imageKey: string }> = post.images;

        
        const nonHeic: Array<{ id: number; imageKey: string }> = images.filter(
          (img: { id: number; imageKey: string }) => !/\.hei(c|f)$/i.test(img.imageKey)
        );

        const thumbUrl = getPublicThumbUrl(thumbKey, 120, 120);

        let fallbackUrl: string | undefined = undefined;
        if (!thumbUrl) {
          const firstKey = nonHeic[0]?.imageKey;
          if (firstKey) {
            const tinySigned = await createSignedUrl(IMAGE_BUCKET, firstKey, SIGNED_URL_TTL, {
              width: 120,
              height: 120,
              resize: "cover",
            });
            fallbackUrl = nonEmpty(tinySigned);
          }
        }

        const signedImages = await Promise.all(
          nonHeic.map(async (img: { id: number; imageKey: string }) => {
            const url = await createSignedUrl(IMAGE_BUCKET, img.imageKey, SIGNED_URL_TTL);
            return { id: img.id, imageKey: img.imageKey, signedUrl: nonEmpty(url) };
          })
        );

        const imageUrl = thumbUrl ?? fallbackUrl;

        return {
          id: post.id,
          caption: post.caption,
          createdAt: post.createdAt,
          memo: post.memo, 
          ...(imageUrl ? { imageUrl } : {}), 
          images: signedImages.filter((i: { signedUrl?: string }) => i.signedUrl),
        };
      })
    );

    return NextResponse.json({ posts: postsWithUrls }, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return NextResponse.json({ error: "投稿一覧の取得に失敗しました" }, { status: 500 });
  }
}
