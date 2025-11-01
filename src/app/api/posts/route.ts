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

function isGuestEmail(email?: string | null): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (process.env.GUEST_USER_EMAIL ?? "").trim().toLowerCase();
  return a !== "" && a === b;
}


export async function POST(req: Request) {
  try {

    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });


    if (isGuestEmail(user.email)) {
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
