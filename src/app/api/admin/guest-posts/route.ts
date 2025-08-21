// src/app/api/admin/guest-posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Prisma } from "@prisma/client";
import { requireAdminOrThrow } from "@/lib/auth";
import { ensureGuestUser } from "@/lib/guestUser"; 
import { PostStatus } from "@prisma/client";                  

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toHttpError(err: unknown): { status: number; message: string } {
  if (err && typeof err === "object") {
    const maybeStatus = (err as { status?: unknown }).status;
    const status = typeof maybeStatus === "number" ? maybeStatus : 500;
    const msg = (err as { message?: unknown }).message;
    const message = typeof msg === "string" ? msg : "Internal Error";
    return { status, message };
  }
  return { status: 500, message: "Internal Error" };
}

function buildTargetWhere(urlStr: string): {
  where: Prisma.PostWhereInput;
  target: { email?: string; userId?: string };
} {
  const url = new URL(urlStr);
  const qEmail = (url.searchParams.get("email") ?? "").trim();
  const qUserId = (url.searchParams.get("userId") ?? "").trim();
  const envEmail = (process.env.GUEST_USER_EMAIL ?? "").trim();

  if (qEmail) {
    return {
      where: { user: { is: { email: { equals: qEmail, mode: "insensitive" } } } },
      target: { email: qEmail },
    };
  }
  if (qUserId) {
    return { where: { userId: qUserId }, target: { userId: qUserId } };
  }
  if (envEmail) {
    return {
      where: { user: { is: { email: { equals: envEmail, mode: "insensitive" } } } },
      target: { email: envEmail },
    };
  }
  return { where: { id: -1 }, target: {} };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrThrow(req as unknown as Request);

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
  } catch (err: unknown) {
    const { status, message } = toHttpError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdminOrThrow(req as unknown as Request);

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
      if (rmErr) {
        // eslint-disable-next-line no-console
        console.warn("Storage remove error:", rmErr.message);
      } else {
        removedFiles = allKeys.length;
      }
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const postIds = targetPosts.map((p) => p.id);
      await tx.image.deleteMany({ where: { postId: { in: postIds } } });
      await tx.memo.deleteMany({ where: { postId: { in: postIds } } });
      const res = await tx.post.deleteMany({ where: { id: { in: postIds } } });
      return res.count;
    });

    return NextResponse.json({ deleted, removedFiles }, { status: 200 });
  } catch (err: unknown) {
    const { status, message } = toHttpError(err);
    return NextResponse.json({ error: message }, { status });
  }
}


export async function POST(req: NextRequest) {
  try {
    await requireAdminOrThrow(req as unknown as Request);

    type Body = {
      caption?: string;
      why?: string;
      what?: string;
      next?: string;
      status?: keyof typeof PostStatus;   
      count?: number;                     
      thumbnailKey?: string;              
    };

    const body = (await req.json().catch(() => ({}))) as Body;
    const {
      caption = "（サンプル）今日やったこと",
      why = "なぜ：学習記録を残すため",
      what = "やったこと：管理ページの権限ガード実装",
      next = "次にやる：E2Eテスト追加",
      status = "published",
      count = 1,
      thumbnailKey,
    } = body;

    const guest = await ensureGuestUser();
    const n = Math.max(1, Math.min(count, 20)); // 作りすぎ防止

    const created = await prisma.$transaction(async (tx) => {
      const items = [];
      for (let i = 0; i < n; i++) {
        const post = await tx.post.create({
          data: {
            userId: guest.id,
            caption: n > 1 ? `${caption} (${i + 1})` : caption,
            status: PostStatus[status] ?? PostStatus.published,
            ...(thumbnailKey ? { thumbnailImageKey: thumbnailKey } : {}),
            memo: {
              create: {
                answerWhy: why,
                answerWhat: what,
                answerNext: next,
              },
            },
          },
          select: { id: true, caption: true, status: true, createdAt: true },
        });
        items.push(post);
      }
      return items;
    });

    return NextResponse.json({ created }, { status: 201 });
  } catch (err: unknown) {
    const { status, message } = toHttpError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
