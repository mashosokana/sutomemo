// src/app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma, Image as DbImage } from "@prisma/client";

const SIGNED_URL_EXPIRY = 60 * 60; // 1h

function isGuestUser(email?: string | null): boolean {
  const a = email?.toLowerCase() ?? "";
  const b = (process.env.GUEST_USER_EMAIL ?? "").toLowerCase();
  return a === b;
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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return NextResponse.json({ error: idError }, { status: 400 });

    const post = await prisma.post.findFirst({
      where: { id: postId, userId: user.id },
      include: { 
        memo: true,
        images: { orderBy: { generatedAt: 'asc' } },
     },
    }) as Prisma.PostGetPayload<{ include: { memo: true; images: true } }> | null;

    if (!post) {
      return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
    }

    const imagesWithSignedUrls = await Promise.all(
      post.images.map(async (img: DbImage) => {
        const { data, error } = await supabaseAdmin.storage
        .from("post-images")
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

    return NextResponse.json(
      { post: { ...post, images: imagesWithSignedUrls ?? [] } },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /posts/[id] error:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
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
    });
    if (!existingPost) {
      return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
    }

    if (isGuestUser(user.email)) {
      const guestPosts = await prisma.post.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const firstPostId = guestPosts[0]?.id;
      if (!firstPostId || existingPost.id !== firstPostId) {
        return NextResponse.json(
          { error: "ゲストユーザーは最初の投稿のみ編集できます" },
          { status: 403 }
        );
      }
    }

    const body = await req.json().catch(() => null);
    const caption: unknown = body?.caption;
    const memo: unknown = body?.memo;

    if (typeof caption !== "string" || caption.trim().length === 0) {
      return NextResponse.json({ error: "captionは必須です" }, { status: 400 });
    }

    type MemoPayload = {
      answerWhy?: unknown;
      answerWhat?: unknown;
      answerNext?: unknown;
    };

    const { answerWhy, answerWhat, answerNext } = (memo ?? {}) as MemoPayload;

    if (
      typeof answerWhy !== "string" ||
      typeof answerWhat !== "string" ||
      typeof answerNext !== "string"
    ) {
      return NextResponse.json({ error: "memoの各項目は必須です" }, { status: 400 });
    }

    const updatedPost = await prisma.$transaction(async (tx) => {
      await tx.memo.deleteMany({ where: { postId } });
      return tx.post.update({
        where: { id: postId },
        data: {
          caption: caption.trim(),
          memo: {
            create: {
              answerWhy: (answerWhy as string).trim(),
              answerWhat: (answerWhat as string).trim(),
              answerNext: (answerNext as string).trim(),
            },
          },
        },
        include: { memo: true, images: true },
      });
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

    const imageKeys = post.images.map((img) => img.imageKey).filter(Boolean);
    if (imageKeys.length > 0) {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from("post-images")
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
