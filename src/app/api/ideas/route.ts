// src/app/api/ideas/route.ts
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * AI投稿提案を全件取得
 */
export async function GET(req: Request) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    // AI提案を取得（優先度順、全てのステータス）
    const ideas = await prisma.idea.findMany({
      where: {
        userId: user.id,
        status: {
          in: ["pending", "used"], // pending と used のみ表示
        },
      },
      orderBy: [
        { status: "asc" }, // pending を先に
        { priority: "desc" }, // 優先度が高い順
        { createdAt: "desc" }, // 新しい順
      ],
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        suggestedHashtags: true,
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
          status: idea.status,
          suggestedHashtags: idea.suggestedHashtags,
          createdAt: idea.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/ideas error:", e);
    return jsonNoStore(
      { error: "AI提案の取得に失敗しました" },
      { status: 500 }
    );
  }
}
