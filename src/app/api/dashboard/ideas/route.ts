// src/app/api/dashboard/ideas/route.ts
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI投稿提案を取得
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

    // AI提案を取得（優先度順、未使用のもの優先）
    const ideas = await prisma.idea.findMany({
      where: {
        userId: user.id,
        status: "pending", // 未使用の提案のみ
      },
      orderBy: [
        { priority: "desc" }, // 優先度が高い順
        { createdAt: "desc" }, // 新しい順
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        createdAt: true,
      },
    });

    return jsonNoStore(
      {
        ideas: ideas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description,
          priority: idea.priority,
          createdAt: idea.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/dashboard/ideas error:", e);
    return jsonNoStore(
      { error: "AI提案の取得に失敗しました" },
      { status: 500 }
    );
  }
}
