// src/app/api/posts/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma, Image as DbImage } from "@prisma/client";
import { IMAGE_BUCKET } from "@/lib/buckets";
import { getPublicThumbUrl } from "@/lib/images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_EXPIRY = 60 * 60; // 1h

function isGuestUser(email?: string | null): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (process.env.GUEST_USER_EMAIL ?? "").trim().toLowerCase();
  return a !== "" && a === b;
}

function parsePostId(params: { id: string }) {
  const postId = Number(params.id);
  if (!Number.isFinite(postId)) {
    return { postId: null as number | null, error: "不正なIDです" };
  }
  return { postId, error: null as string | null };
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) {
    return { user: null, error: "Unauthorized", status: 401 as const };
  }
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) {
    return { user: null, error: "Unauthorized", status: 401 as const };
  }
  return { user: userData.user, error: null, status: 200 as const };
}

const isNonHeic = (key: string) => !/\.hei(c|f)$/i.test(key);
const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return NextResponse.json({ error: idError }, { status: 400 });

    const post = (await prisma.post.findFirst({
      where: { id: postId, userId: user.id },
      include: {
        memo: true,
        images: { orderBy: { generatedAt: "desc" } },
      },
    })) as Prisma.PostGetPayload<{ include: { memo: true; images: true } }> | null;

    if (!post) {
      return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
    }

    const nonHeicImages = post.images.filter((img: DbImage) => isNonHeic(img.imageKey));
    const imagesWithSignedUrls = await Promise.all(
      nonHeicImages.map(async (img: DbImage) => {
        const { data, error } = await supabaseAdmin.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(img.imageKey, SIGNED_URL_EXPIRY);
        if (error) {
          console.warn(`Failed to create signed URL for ${img.imageKey}`, error.message);
        }
        return {
          ...img,
          signedUrl: data?.signedUrl ?? "",
        };
      })
    );

    const thumbUrl = getPublicThumbUrl(post.thumbnailImageKey ?? undefined, 600, 600);
    const firstSigned = nonEmpty(imagesWithSignedUrls[0]?.signedUrl);
    const imageUrl = nonEmpty(thumbUrl) ?? firstSigned;

    return NextResponse.json(
      {
        post: {
          ...post,
          images: imagesWithSignedUrls,
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /posts/[id] error:", e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return NextResponse.json({ error: idError }, { status: 400 });

    const existingPost = await prisma.post.findFirst({
      where: { id: postId, userId: user.id },
      select: { id: true, userId: true },
    });
    if (!existingPost) {
      return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
    }

    if (isGuestUser(user.email)) {
      return NextResponse.json({ error: "ゲストユーザーは更新できません" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const caption =
      typeof body.caption === "string" ? body.caption.trim() : undefined;

    const thumbnailImageKey =
      typeof body.thumbnailImageKey === "string" ? body.thumbnailImageKey : undefined;

    const memoLike = isObject(body.memo) ? (body.memo as Record<string, unknown>) : undefined;
    const answerWhy =
      typeof memoLike?.answerWhy === "string" ? (memoLike.answerWhy as string) : null;
    const answerWhat =
      typeof memoLike?.answerWhat === "string" ? (memoLike.answerWhat as string) : null;
    const answerNext =
      typeof memoLike?.answerNext === "string" ? (memoLike.answerNext as string) : null;

    if (caption === undefined && thumbnailImageKey === undefined && memoLike === undefined) {
      return NextResponse.json({ error: "更新項目がありません" }, { status: 400 });
    }

    const data: Prisma.PostUpdateInput = {};
    if (caption !== undefined) data.caption = caption;
    if (thumbnailImageKey !== undefined) data.thumbnailImageKey = thumbnailImageKey;
    if (memoLike !== undefined) {
      data.memo = {
        upsert: {
          create: { answerWhy, answerWhat, answerNext },
          update: { answerWhy, answerWhat, answerNext },
        },
      };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data,
      include: { memo: true, images: true },
    });

    return NextResponse.json({ post: updatedPost }, { status: 200 });
  } catch (e) {
    console.error("PUT /posts/[id] error:", e);
    return NextResponse.json(
      { error: "更新処理で予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}



export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return NextResponse.json({ error: idError }, { status: 400 });

    const post = await prisma.post.findFirst({
      where: { id: postId, userId: user.id },
      include: { images: true },
    });

    if (!post) {
      return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
    }

    if (isGuestUser(user.email)) {
      return NextResponse.json(
        { error: "ゲストユーザーは投稿を削除できません" },
        { status: 403 }
      );
    }

    const imageKeys = post.images.map((img) => img.imageKey).filter((k) => !!k);
    if (imageKeys.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(IMAGE_BUCKET)
        .remove(imageKeys);
      if (storageError) {
        console.warn("画像削除に失敗:", storageError.message);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.image.deleteMany({ where: { postId } });
      await tx.memo.deleteMany({ where: { postId } });
      await tx.post.delete({ where: { id: postId } });
    });

    return NextResponse.json({ success: true, deletedId: postId }, { status: 200 });
  } catch (e) {
    console.error("DELETE /posts/[id] error:", e);
    return NextResponse.json(
      { error: "削除処理で予期しないエラーが発生しました" },
      { status: 500 }
    );
  }
}

