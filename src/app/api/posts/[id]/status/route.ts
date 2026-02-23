// src/app/api/posts/[id]/status/route.ts
import { prisma } from "@/lib/prisma";
import { isAdmin, verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import type { PostStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 投稿のステータスを変更
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error, status } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const postId = Number(params.id);
    if (!Number.isFinite(postId)) {
      return jsonNoStore({ error: "不正なIDです" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const newStatus = body.status as string;

    // ステータスの検証
    const validStatuses = ["draft", "published", "archived", "deleted"];
    if (!validStatuses.includes(newStatus)) {
      return jsonNoStore(
        { error: "不正なステータスです" },
        { status: 400 }
      );
    }

    // 投稿の存在確認と権限チェック
    const target = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!target) {
      return jsonNoStore({ error: "投稿が存在しません" }, { status: 404 });
    }

    if (!isAdmin(user) && target.userId !== user.id) {
      return jsonNoStore({ error: "権限がありません" }, { status: 403 });
    }

    // ステータスを更新
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: { status: newStatus as PostStatus },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    return jsonNoStore(
      {
        success: true,
        post: updatedPost,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("PATCH /posts/[id]/status error:", e);
    return jsonNoStore(
      { error: "ステータス更新に失敗しました" },
      { status: 500 }
    );
  }
}
