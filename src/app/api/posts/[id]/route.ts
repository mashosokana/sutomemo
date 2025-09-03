// src/app/api/posts/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma, Image as DbImage } from "@prisma/client";
import { IMAGE_BUCKET } from "@/lib/buckets";
import { getPublicThumbUrl } from "@/lib/images";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_EXPIRY = 60 * 60; // 1h

function parsePostId(params: { id: string }) {
  const postId = Number(params.id);
  if (!Number.isFinite(postId)) {
    return { postId: null as number | null, error: "不正なIDです" };
  }
  return { postId, error: null as string | null };
}

const isNonHeic = (key: string) => !/\.hei(c|f)$/i.test(key);
const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

function isGuestEmail(email?: string | null): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (process.env.GUEST_USER_EMAIL ?? process.env.NEXT_PUBLIC_GUEST_USER_EMAIL ?? "").trim().toLowerCase();
  return a !== "" && a === b;
}

// -------- GET --------
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return jsonNoStore({ error: idError }, { status: 400 });

    const where: Prisma.PostWhereInput =
    user.role === "ADMIN" ? { id: postId } : { id: postId, userId: user.id };

    const post = await prisma.post.findFirst({
      where,
      include: { memo: true, images: { orderBy: { generatedAt: "desc" } } },
    });
    if (!post) return jsonNoStore({ error: "投稿が存在しません" }, { status: 404 });

    const nonHeicImages = post.images.filter((img: DbImage) => isNonHeic(img.imageKey));
    const imagesWithSignedUrls = await Promise.all(
      nonHeicImages.map(async (img: DbImage) => {
        const { data, error: sErr } = await supabaseAdmin.storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(img.imageKey, SIGNED_URL_EXPIRY);
        if (sErr) console.warn(`Signed URL failed for ${img.imageKey}:`, sErr.message);
        return { ...img, signedUrl: data?.signedUrl ?? "" };
      })
    );

    const thumbUrl = getPublicThumbUrl((post as { thumbnailImageKey?: string | null }).thumbnailImageKey ?? undefined, 600, 600);
    const firstSigned = nonEmpty(imagesWithSignedUrls[0]?.signedUrl);
    const imageUrl = nonEmpty(thumbUrl) ?? firstSigned;

    return jsonNoStore({ post: { ...post, images: imagesWithSignedUrls, ...(imageUrl ? { imageUrl } : {}) } }, { status: 200 });
  } catch (e) {
    console.error("GET /posts/[id] error:", e);
    return jsonNoStore({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// -------- PUT --------
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return jsonNoStore({ error: idError }, { status: 400 });

    const target = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });
    if (!target) return jsonNoStore({ error: "投稿が存在しません" }, { status: 404 });
    if (user.role !== "ADMIN" && target.userId !== user.id) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const caption = typeof body.caption === "string" ? body.caption.trim() : undefined;
    const thumbnailImageKey =
      typeof body.thumbnailImageKey === "string" ? body.thumbnailImageKey : undefined;

    const memoLike = typeof body.memo === "object" && body.memo !== null ? (body.memo as Record<string, unknown>) : undefined;
    const answerWhy  = typeof memoLike?.answerWhy  === "string" ? memoLike.answerWhy  : null;
    const answerWhat = typeof memoLike?.answerWhat === "string" ? memoLike.answerWhat : null;
    const answerNext = typeof memoLike?.answerNext === "string" ? memoLike.answerNext : null;

    if (caption === undefined && thumbnailImageKey === undefined && memoLike === undefined) {
      return jsonNoStore({ error: "更新項目がありません" }, { status: 400 });
    }

    const data: Prisma.PostUpdateInput = {};
    if (caption !== undefined) data.caption = caption;
    if (thumbnailImageKey !== undefined) data.thumbnailImageKey = thumbnailImageKey;
    if (memoLike !== undefined) {
      data.memo = { upsert: { create: { answerWhy, answerWhat, answerNext }, update: { answerWhy, answerWhat, answerNext } } };
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data,
      include: { memo: true, images: true },
    });

    return jsonNoStore({ post: updatedPost }, { status: 200 });
  } catch (e) {
    console.error("PUT /posts/[id] error:", e);
    return jsonNoStore({ error: "更新処理で予期しないエラーが発生しました" }, { status: 500 });
  }
}

// -------- DELETE --------
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const { postId, error: idError } = parsePostId(params);
    if (!postId) return jsonNoStore({ error: idError }, { status: 400 });

    const target = await prisma.post.findUnique({
      where: { id: postId },
      include: { images: true },
    });
    if (!target) return jsonNoStore({ error: "投稿が存在しません" }, { status: 404 });
    if (user.role !== "ADMIN" && isGuestEmail(user.email)) {
      return jsonNoStore({ error: "お試しログインでは削除できません" }, { status: 403 });
    }

    if (user.role !== "ADMIN" && target.userId !== user.id) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const imageKeys = target.images.map((img) => img.imageKey).filter(Boolean);
    if (imageKeys.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove(imageKeys);
      if (storageError) console.warn("画像削除に失敗:", storageError.message);
    }

    await prisma.$transaction(async (tx) => {
      await tx.image.deleteMany({ where: { postId } });
      await tx.memo.deleteMany({ where: { postId } });
      await tx.post.delete({ where: { id: postId } });
    });

    return jsonNoStore({ success: true, deletedId: postId }, { status: 200 });
  } catch (e) {
    console.error("DELETE /posts/[id] error:", e);
    return jsonNoStore({ error: "削除処理で予期しないエラーが発生しました" }, { status: 500 });
  }
}
