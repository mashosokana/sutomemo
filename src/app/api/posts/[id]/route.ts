// src/app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SIGNED_URL_EXPIRY = 60 * 60;

function isGuestUser(email?: string | null): boolean {
  return email === process.env.GUEST_USER_EMAIL;
}

function parsePostId(params: { id: string }) {
  const postId = Number(params.id);
  if (isNaN(postId)) {
    return { postId: null, error: "不正なIDです" };
  }
  return { postId, error: null };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { user, error: authError, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: authError }, { status });
  }

  const { postId, error: idError } = parsePostId(params);
  if (!postId) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId, userId: user.id },
    include: { memo: true, images: true },
  });

  if (!post) {
    return NextResponse.json({ error: "投稿が存在しません" }, { status: 404 });
  }

  const imagesWithSignedUrls = await Promise.all(
    post.images.map(async (img) => {
      const { data, error } = await supabaseAdmin.storage
        .from("post-images")
        .createSignedUrl(img.imageKey, SIGNED_URL_EXPIRY);

      if (error) {
        console.warn(`Failed to create signed URL for ${img.imageKey}`, error.message);
      } 

      return {
        ...img,
        signedUrl: data?.signedUrl ?? null,
      };
    })
  );

  return NextResponse.json(
    {
      post: {
        ...post,
        images: imagesWithSignedUrls ?? [],
      },
    },
    { status: 200 }
  );
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { user, error: authError, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error: authError }, { status });
  }

  const { postId, error: idError } = parsePostId(params);
  if (!postId) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }

  const existingPost = await prisma.post.findUnique({
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

    console.log("ゲスト編集チェック:", { guestPosts, editingId: existingPost.id })

    if (!firstPostId || existingPost.id !== firstPostId) {
      return NextResponse.json(
        { error: "ゲストユーザーは最初の投稿のみ編集できます" },
        { status: 403 }
      );
    }    
  }


  const body = await req.json();
  const { caption, memo } = body;
  const { answerWhy, answerWhat, answerNext } = memo ?? {};

  if (!caption || !memo) {
    return NextResponse.json({ error: "captionとmemoは必須です" }, { status: 400 });
  }

  await prisma.memo.deleteMany({ where: { postId } });

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      caption,
      memo: {
        create: { answerWhy, answerWhat, answerNext },
      },
    },
    include: { memo: true, images: true },
  });

  return NextResponse.json({ post: updatedPost }, { status: 200 });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { user, error, status } = await verifyUser(req);
  if (!user) {
    return NextResponse.json({ error }, { status });
  }

  const { postId, error: idError } = parsePostId(params);
  if (!postId) {
    return NextResponse.json({ error: idError }, { status: 400 });
  }

  try {
    const post = await prisma.post.findUnique({
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


    const imageKeys = post.images.map((img) => img.imageKey);
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
  } catch (err) {
    console.error("Unexpected error during delete:", err);
    return NextResponse.json(
      { error: "削除処理で予期しないエラーが発生しました", details: String(err) },
      { status: 500 }
    );
  }
}
