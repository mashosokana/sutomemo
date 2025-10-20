// src/app/api/dashboard/recent-posts/route.ts
import { prisma } from "@/lib/prisma";
import { getPublicThumbUrl, createSignedUrl } from "@/lib/images";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import { IMAGE_BUCKET } from "@/lib/buckets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNED_URL_TTL = 60 * 60;

const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

/**
 * 最近の投稿を取得
 * クエリパラメータ: limit（デフォルト3件）
 */
export async function GET(req: Request) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    // limitパラメータを取得（デフォルト3）
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 3;

    // 最近の投稿を取得
    const posts = await prisma.post.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        memo: {
          select: {
            answerWhy: true,
            answerWhat: true,
            answerNext: true,
          },
        },
        images: {
          orderBy: { generatedAt: "desc" },
          select: { id: true, imageKey: true },
          take: 1, // ダッシュボードでは最初の1枚のみ
        },
      },
    });

    // 画像URLを含めて整形
    const postsWithUrls = await Promise.all(
      posts.map(async (post) => {
        let imageUrl: string | undefined = undefined;

        // サムネイルまたは最初の画像のURLを取得
        const thumbKey = post.thumbnailImageKey ?? undefined;
        const thumbUrl = getPublicThumbUrl(thumbKey, 120, 120);

        if (thumbUrl) {
          imageUrl = thumbUrl;
        } else if (post.images[0]) {
          const firstKey = post.images[0].imageKey;
          if (!/\.hei(c|f)$/i.test(firstKey)) {
            const tinySigned = await createSignedUrl(
              IMAGE_BUCKET,
              firstKey,
              SIGNED_URL_TTL,
              { width: 120, height: 120, resize: "cover" }
            );
            imageUrl = nonEmpty(tinySigned);
          }
        }

        return {
          id: post.id,
          caption: post.caption,
          status: post.status,
          createdAt: post.createdAt.toISOString(),
          memo: post.memo
            ? {
                answerWhy: post.memo.answerWhy,
                answerWhat: post.memo.answerWhat,
                answerNext: post.memo.answerNext,
              }
            : null,
          images: imageUrl
            ? [{ signedUrl: imageUrl }]
            : [],
        };
      })
    );

    return jsonNoStore({ posts: postsWithUrls }, { status: 200 });
  } catch (e) {
    console.error("GET /api/dashboard/recent-posts error:", e);
    return jsonNoStore(
      { error: "最近の投稿の取得に失敗しました" },
      { status: 500 }
    );
  }
}
