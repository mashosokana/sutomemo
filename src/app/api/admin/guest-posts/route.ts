import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const, error: "Unauthorized" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const, error: "Unauthorized" };
  return { user: data.user, status: 200 as const, error: null };
}

function isAdminUser(email?: string | null): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !!b && a === b;
}

// クエリから対象指定を作る（email優先、無ければuserId、さらに無ければ.envのGUEST_USER_EMAIL）
function buildTargetWhere(urlStr: string): { where: Prisma.PostWhereInput; target: { email?: string; userId?: string } } {
  const url = new URL(urlStr);
  const qEmail = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const qUserId = (url.searchParams.get("userId") ?? "").trim();
  const envEmail = (process.env.GUEST_USER_EMAIL ?? "").trim().toLowerCase();

  if (qEmail) return { where: { user: { email: qEmail } }, target: { email: qEmail } };
  if (qUserId) return { where: { userId: qUserId }, target: { userId: qUserId } };
  if (envEmail) return { where: { user: { email: envEmail } }, target: { email: envEmail } };
  // fallback: 何も指定なし
  return { where: { id: -1 }, target: {} }; // ヒットしない where
}

export async function GET(req: Request) {
  const { user, status, error } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error }, { status });
  if (!isAdminUser(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

export async function DELETE(req: Request) {
  const { user, status, error } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error }, { status });
  if (!isAdminUser(user.email)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { where } = buildTargetWhere(req.url);

  const body = await req.json().catch(() => null);
  const ids: unknown = body?.ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "number")) {
    return NextResponse.json({ error: "ids must be number[]" }, { status: 400 });
  }

  // 指定ユーザーに属し、かつ選択された投稿だけを対象にする
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
