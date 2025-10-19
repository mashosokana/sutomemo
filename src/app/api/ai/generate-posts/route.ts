// src/app/api/ai/generate-posts/route.ts
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * AI投稿文を生成（3パターン）
 */
export async function POST(req: Request) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    // 最近の投稿を取得（分析用）
    const recentPosts = await prisma.post.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        caption: true,
        status: true,
        memo: {
          select: {
            answerWhy: true,
            answerWhat: true,
            answerNext: true,
          },
        },
        metrics: {
          select: {
            likesCount: true,
            commentsCount: true,
            engagementRate: true,
          },
        },
        createdAt: true,
      },
    });

    if (recentPosts.length === 0) {
      return jsonNoStore(
        { error: "投稿がまだありません。まず投稿を作成してください。" },
        { status: 400 }
      );
    }

    // 投稿データを整形（メトリクスも含む）
    const postsSummary = recentPosts
      .map((post, idx) => {
        const memoText = post.memo
          ? `\n  理由: ${post.memo.answerWhy || "なし"}\n  内容: ${post.memo.answerWhat || "なし"}\n  次へ: ${post.memo.answerNext || "なし"}`
          : "";

        const metricsText = post.metrics
          ? `\n  いいね: ${post.metrics.likesCount}, コメント: ${post.metrics.commentsCount}, エンゲージメント率: ${post.metrics.engagementRate}%`
          : "";

        return `${idx + 1}. ${post.caption}${memoText}${metricsText}`;
      })
      .join("\n\n");

    // 高エンゲージメントの投稿を特定
    const postsWithMetrics = recentPosts.filter((p) => p.metrics);
    let bestPractices = "";

    if (postsWithMetrics.length > 0) {
      const sortedByEngagement = [...postsWithMetrics].sort(
        (a, b) => (b.metrics?.engagementRate || 0) - (a.metrics?.engagementRate || 0)
      );
      const topPost = sortedByEngagement[0];

      if (topPost && topPost.metrics) {
        bestPractices = `\n\n【参考】最もエンゲージメントが高かった投稿:\n"${topPost.caption}"\n（エンゲージメント率: ${topPost.metrics.engagementRate}%）\nこの投稿のトーン、長さ、スタイルを参考にしてください。`;
      }
    }

    // OpenAI APIで投稿文を生成
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはSNS投稿の文章を書くプロのライターです。
ユーザーの過去の投稿履歴を分析し、そのまま使える投稿文を3パターン生成してください。

【重要な指針】
1. ユーザーの投稿スタイル・トーンを学習し、それに合わせる
2. 過去のエンゲージメントが高かった投稿のスタイルを参考にする
3. 各パターンは異なるアプローチで書く:
   - パターン1: 気づきや学びをシェア（教育的）
   - パターン2: 日常の出来事や感情をシェア（共感的）
   - パターン3: 質問や問いかけ（対話的）
4. 文章の長さは100-200文字程度（読みやすさ重視）
5. 絵文字は控えめに（多用しない）
6. ハッシュタグは3-5個程度

JSON形式で以下のように返してください：
{
  "posts": [
    {
      "caption": "投稿文（そのまま使える完成形）",
      "hashtags": ["タグ1", "タグ2", "タグ3"],
      "pattern": "気づき・学び"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `以下は私の最近の投稿履歴です。これを分析して、今日投稿できる文章を3パターン生成してください。${bestPractices}\n\n${postsSummary}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("AIからの応答がありません");
    }

    const aiResponse = JSON.parse(responseText);
    const generatedPosts = aiResponse.posts || [];

    if (generatedPosts.length === 0) {
      throw new Error("AIが投稿文を生成できませんでした");
    }

    return jsonNoStore(
      {
        posts: generatedPosts.map((post: any) => ({
          caption: post.caption,
          hashtags: post.hashtags || [],
          pattern: post.pattern || "その他",
        })),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("POST /api/ai/generate-posts error:", e);
    return jsonNoStore(
      {
        error: e instanceof Error ? e.message : "AI投稿文の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
