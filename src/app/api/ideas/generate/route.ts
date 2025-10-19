// src/app/api/ideas/generate/route.ts
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
 * AI投稿提案を生成
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
      take: 10,
      select: {
        caption: true,
        memo: {
          select: {
            answerWhy: true,
            answerWhat: true,
            answerNext: true,
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

    // 投稿データを整形
    const postsSummary = recentPosts
      .map((post, idx) => {
        const memoText = post.memo
          ? `\n  理由: ${post.memo.answerWhy || "なし"}\n  内容: ${post.memo.answerWhat || "なし"}\n  次へ: ${post.memo.answerNext || "なし"}`
          : "";
        return `${idx + 1}. ${post.caption}${memoText}`;
      })
      .join("\n\n");

    // OpenAI APIで提案を生成
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたはSNS投稿のアイデアを提案するアシスタントです。
ユーザーの過去の投稿履歴を分析し、次の投稿アイデアを3つ提案してください。

各提案には以下を含めてください：
- タイトル: 簡潔で魅力的な見出し（15文字以内）
- 説明: 具体的な投稿内容の提案（50-100文字）
- ハッシュタグ: 関連する3-5個のハッシュタグ（#なし）
- 優先度: 1-5の数値（5が最も優先度が高い）

JSON形式で以下のように返してください：
{
  "ideas": [
    {
      "title": "タイトル",
      "description": "説明",
      "suggestedHashtags": ["タグ1", "タグ2", "タグ3"],
      "priority": 5
    }
  ]
}`,
        },
        {
          role: "user",
          content: `以下は私の最近の投稿履歴です。これを分析して、次の投稿アイデアを3つ提案してください。\n\n${postsSummary}`,
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
    const generatedIdeas = aiResponse.ideas || [];

    if (generatedIdeas.length === 0) {
      throw new Error("AIが提案を生成できませんでした");
    }

    // データベースに保存
    const savedIdeas = await Promise.all(
      generatedIdeas.map(async (idea: any) => {
        return await prisma.idea.create({
          data: {
            userId: user.id,
            title: idea.title,
            description: idea.description,
            suggestedHashtags: idea.suggestedHashtags || [],
            priority: idea.priority || 3,
            status: "pending",
          },
        });
      })
    );

    return jsonNoStore(
      {
        ideas: savedIdeas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description,
          priority: idea.priority,
          suggestedHashtags: idea.suggestedHashtags,
          createdAt: idea.createdAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("POST /api/ideas/generate error:", e);
    return jsonNoStore(
      {
        error: e instanceof Error ? e.message : "AI提案の生成に失敗しました"
      },
      { status: 500 }
    );
  }
}
