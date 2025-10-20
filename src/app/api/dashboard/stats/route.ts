// src/app/api/dashboard/stats/route.ts
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ダッシュボード統計データを取得
 * - 総投稿数
 * - 公開済み投稿数
 * - 平均反応率（過去30日間）
 */
export async function GET(req: Request) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    // 総投稿数を取得
    const totalPosts = await prisma.post.count({
      where: { userId: user.id },
    });

    // 公開済み投稿数を取得
    const publishedPosts = await prisma.post.count({
      where: {
        userId: user.id,
        status: "published",
      },
    });

    // 下書き投稿数を取得
    const draftPosts = await prisma.post.count({
      where: {
        userId: user.id,
        status: "draft",
      },
    });

    // 平均反応率を計算（過去30日間のメトリクスがある投稿のみ）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const metricsData = await prisma.metrics.findMany({
      where: {
        post: {
          userId: user.id,
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      },
      select: {
        engagementRate: true,
      },
    });

    let avgEngagementRate = "0.00";
    if (metricsData.length > 0) {
      const sum = metricsData.reduce((acc, m) => acc + m.engagementRate, 0);
      const avg = sum / metricsData.length;
      avgEngagementRate = avg.toFixed(2);
    }

    return jsonNoStore(
      {
        totalPosts,
        publishedPosts,
        draftPosts,
        avgEngagementRate,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("GET /api/dashboard/stats error:", e);
    return jsonNoStore(
      { error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
