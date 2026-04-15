// src/app/api/posts/route.ts
import { prisma } from "@/lib/prisma";
import { isGuest, verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {

    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });


    if (isGuest(user)) {
      return jsonNoStore({ error: "ゲストユーザーは新規作成できません。会員登録すると投稿できます。" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({} as unknown));
    const caption = typeof (body as Record<string, unknown>)?.caption === "string"
      ? ((body as Record<string, unknown>).caption as string).trim()
      : "";

    if (!caption) {
      return jsonNoStore({ error: "captionは必須です" }, { status: 400 });
    }


    const memoRaw = (body as Record<string, unknown>)?.memo as
      | { answerWhy?: unknown; answerWhat?: unknown; answerNext?: unknown }
      | undefined;

    const memoData =
      memoRaw
        ? {
            answerWhy: typeof memoRaw.answerWhy === "string" ? memoRaw.answerWhy.trim() : null,
            answerWhat: typeof memoRaw.answerWhat === "string" ? memoRaw.answerWhat.trim() : null,
            answerNext: typeof memoRaw.answerNext === "string" ? memoRaw.answerNext.trim() : null,
          }
        : null;

    const post = await prisma.post.create({
      data: {
        userId: user.id,
        caption,
        ...(memoData && (memoData.answerWhy || memoData.answerWhat || memoData.answerNext)
          ? { memo: { create: memoData } }
          : {}),
      },
      include: { memo: true },
    });

    return jsonNoStore({ post }, { status: 201 });
  } catch (e) {
    console.error("POST /api/posts error:", e);
    return jsonNoStore({ error: "投稿作成でエラーが発生しました" }, { status: 500 });
  }
}


export async function GET(req: Request) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });


    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        caption: true,
        createdAt: true,
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
      },
    });

    const cleaned = posts.map((post) => ({
      id: post.id,
      caption: post.caption,
      createdAt: post.createdAt,
      memo: post.memo ?? null,
    }));

    return jsonNoStore({ posts: cleaned }, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return jsonNoStore({ error: "投稿一覧の取得に失敗しました" }, { status: 500 });
  }
}
