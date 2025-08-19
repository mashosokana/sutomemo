// src/app/api/admin/guest-posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma } from "@prisma/client";
import { requireUserOrThrow, assertAdminOrThrow } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildTargetWhere(urlStr: string): {
  where: Prisma.PostWhereInput;
  target: { email?: string; userId?: string };
} {
  const url = new URL(urlStr);
  const qEmail = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const qUserId = (url.searchParams.get("userId") ?? "").trim();
  const envEmail = (process.env.GUEST_USER_EMAIL ?? "").trim().toLowerCase();

  if (qEmail) return { where: { user: { email: qEmail } }, target: { email: qEmail } };
  if (qUserId) return { where: { userId: qUserId }, target: { userId: qUserId } };
  if (envEmail) return { where: { user: { email: envEmail } }, target: { email: envEmail } };
  return { where: { id: -1 }, target: {} }; 
}

export async function GET(req: NextRequest) {
  const user = await requireUserOrThrow(req as unknown as Request);
  assertAdminOrThrow(user);

  const { where, target } = buildTargetWhere(req.url);
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { images: true, memo: true },
  });

  const items = posts.map((p) => ({
    id: p.id,
    caption: p.caption,
    createdAt: p.createdAt,
    imageCount: p.images.length,
    memo: p.memo
      ? {
          answerWhy: p.memo.answerWhy ?? "",
          answerWhat: p.memo.answerWhat ?? "",
          answerNext: p.memo.answerNext ?? "",
        }
      : null,
  }));

  return NextResponse.json({ target, posts: items }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUserOrThrow(req as unknown as Request);
  assertAdminOrThrow(user);

  const { where } = buildTargetWhere(req.url);

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "number")) {
    return NextResponse.json({ error: "ids must be number[]" }, { status: 400 });
  }

  const targetPosts = await prisma.post.findMany({
    where: { ...where, id: { in: ids as number[] } },
    include: { images: true },
  });

  const allKeys = targetPosts.flatMap((p) => p.images.map((i) => i.imageKey));
  let removedFiles = 0;
  if (allKeys.length > 0) {
    const { error: rmErr } = await supabaseAdmin.storage.from("post-images").remove(allKeys);
    if (rmErr) console.warn("Storage remove error:", rmErr.message);
    else removedFiles = allKeys.length;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.image.deleteMany({ where: { postId: { in: targetPosts.map((p) => p.id) } } });
    await tx.memo.deleteMany({ where: { postId: { in: targetPosts.map((p) => p.id) } } });
    const res = await tx.post.deleteMany({ where: { id: { in: targetPosts.map((p) => p.id) } } });
    return res.count;
  });

  return NextResponse.json({ deleted, removedFiles }, { status: 200 });
}
