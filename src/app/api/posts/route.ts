// src/app/api/posts/route.ts
import { prisma } from "@/lib/prisma";
import { getPublicThumbUrl, createSignedUrl } from "@/lib/images";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { IMAGE_BUCKET } from "@/lib/buckets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 60 * 60;        

const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

export async function POST(req: Request) {
  try {

    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const body = await req.json().catch(() => ({} as unknown));
    const caption = typeof (body as Record<string, unknown>)?.caption === "string"
      ? ((body as Record<string, unknown>).caption as string).trim()
      : "";

    if (!caption) {
      return jsonNoStore({ error: "captionは必須です" }, { status: 400 });
    }

    // ゲストセッションIDの取得（ヘッダーまたはボディから）
    const guestSessionId =
      req.headers.get("X-Guest-Session-Id") ||
      (typeof (body as Record<string, unknown>)?.guestSessionId === "string"
        ? (body as Record<string, unknown>).guestSessionId as string
        : null);

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
        guestSessionId, // ゲストの場合のみ値が入る
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

    // ゲストセッションIDの取得
    const guestSessionId = req.headers.get("X-Guest-Session-Id");

    // ゲストユーザーの場合は自分のセッションIDの投稿のみ、会員は通常の投稿のみ
    const where = guestSessionId
      ? { userId: user.id, guestSessionId }
      : { userId: user.id, guestSessionId: null };

    const posts = await prisma.post.findMany({
      where,
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

        const thumbKey = post.thumbnailImageKey ?? undefined;


        const nonHeic = post.images.filter(
          (img) => !/\.hei(c|f)$/i.test(img.imageKey)
        );


        const thumbUrl = getPublicThumbUrl(thumbKey, 120, 120);


        let fallbackUrl: string | undefined = undefined;
        if (!thumbUrl) {
          const firstKey = nonHeic[0]?.imageKey;
          if (firstKey) {
            const tinySigned = await createSignedUrl(
              IMAGE_BUCKET,
              firstKey,
              SIGNED_URL_TTL,
              { width: 120, height: 120, resize: "cover" }
            );
            fallbackUrl = nonEmpty(tinySigned);
          }
        }

        const signedImages = await Promise.all(
          nonHeic.map(async (img) => {
            const url = await createSignedUrl(IMAGE_BUCKET, img.imageKey, SIGNED_URL_TTL);
            const u = nonEmpty(url);
            return u ? { id: img.id, imageKey: img.imageKey, signedUrl: u } : null;
          })
        );

        const imageUrl = thumbUrl ?? fallbackUrl;

        return {
          id: post.id,
          caption: post.caption,
          createdAt: post.createdAt,
          memo: post.memo,
          ...(imageUrl ? { imageUrl } : {}), 
          images: signedImages.filter((x): x is NonNullable<typeof x> => !!x),
        };
      })
    );

    return jsonNoStore({ posts: postsWithUrls }, { status: 200 });
  } catch (e) {
    console.error("GET /api/posts error:", e);
    return jsonNoStore({ error: "投稿一覧の取得に失敗しました" }, { status: 500 });
  }
}
