// src/app/api/generate/social-post/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  memo: z.string().min(10),
  platform: z.enum(["x", "threads"]).default("x"),
  variants: z.number().min(1).max(3).default(2),
});

const SYSTEM = `
あなたはSNS編集者です。X/Threadsで伸びる投稿の”型”で文章を整形します。
共通原則:
- 1行目は強いフック（痛み/驚き/即ベネフィット）。
- 画像や動画の存在を想定し、本文はビジュアルを補足。
- 外部リンクは避ける。必要なら最後に1つだけ（省略可）。
- 専門用語は噛み砕く。数字・比較・前後ビフォーアフターを好む。
- 弱い命令形のCTA（保存/実装/試す/コメントで質問）を1つ。
- 絵文字は0〜2個まで。ハッシュタグは最大2個。`;

const platformRule = (p: "x" | "threads") =>
  p === "x" ? "280字以内/改行≤3/箇条書き2-4" : "500字以内/改行≤6/箇条書き3-6";

export async function POST(req: NextRequest) {
  // 1) 認証（ゲストは通過してOK：保存側でガード）
  await verifyUser(req);

  // 2) 入力検証（400で返す）
  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
  const { memo, platform, variants } = parsed.data;

  // 3) 環境変数チェック
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  // 4) プロンプト作成
  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `
  対象: ${platform}
  適用ルール: ${platformRule(platform)}
  バリエーション数: ${variants}
  
  # 入力（素材）
  ${memo}
  
  # 出力要件（必ず守る）
  - JSONで返す: { "posts": ["…案1…", "…案2…", ...] }
  - posts の要素数は厳密に ${variants} 件
  - 元文のコピペ禁止。**文構造を再設計**し、語尾/語順/語彙を**50%以上**置換・削除・追加すること
  - 1行目は強いフック（数字/驚き/悩み→即ベネフィット）
  - 本文は「箇条書き」中心（X=2–4点 / Threads=3–6点）
  - 外部リンクなし。絵文字0–2、ハッシュタグ最大2
  - 最後に軽いCTA（保存/試す/質問）
  `.trim(),
    },
  ];

  // 5) タイムアウト（20秒）
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);

  // 6) OpenAI呼び出し（JSON保証）
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      n: 1,
      response_format: { type: "json_object" }, // LLM出力を必ずJSONに
      messages,
      // ★ user は送らない方針のため指定しない
    }),
    cache: "no-store",
    signal: controller.signal,
  }).catch((e) => {
    return new Response(String(e), { status: 502 });
  });

  clearTimeout(t);

  if (!r || !r.ok) {
    const text = r ? await r.text() : "Network error";
    return new NextResponse(text || "OpenAI error", {
      status: r?.status ?? 502,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const data = await r.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  let posts: string[] = [];
  try {
    const parsedJSON = JSON.parse(content);
    if (Array.isArray(parsedJSON.posts)) {
      posts = parsedJSON.posts.slice(0, variants); // 念のため件数を保証
    }
  } catch {
    // JSONで返らなかった場合のフォールバック（必要なら実装）
    posts = [];
  }

  return NextResponse.json(
    { posts },
    { headers: { "Cache-Control": "no-store" } }
  );
}