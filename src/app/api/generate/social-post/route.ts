// src/app/api/generate/social-post/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyUser } from "@/lib/auth";
import { jsonNoStore, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SocialAll = {
  x: string[];
  threads: string[];
  stories: string[];
  // backward compatible alias of x（常に同梱）
  posts: string[];
};

const ALL_TARGETS = ["x", "threads", "stories"] as const;
type Target = typeof ALL_TARGETS[number];

const Body = z.object({
  memo: z.string().min(10),
  platform: z.enum(["x", "threads"]).default("x"),
  variants: z.number().min(1).max(3).default(2),
  sticky: z
    .object({
      tagline: z.string().optional(),
      place: z.string().optional(),
      tool: z.string().optional(),
      people: z.string().optional(),
      numbers: z.array(z.string()).optional(),
      sense: z.string().optional(),
      cta: z.string().optional(),
    })
    .optional(),
  targets: z.array(z.enum(ALL_TARGETS)).optional(),
});

/** ====== 記憶重視 SYSTEM（Sticky-7 準拠） ======
 * 目的：バズよりも「思い出せる」ことを最優先に整形する。
 * 手法：Sticky-7（五感/数字/固有名/コントラスト/ミニ物語/リズム/合言葉）を活用。
 * 返却：JSON { x, threads, stories, posts }（posts は x の別名、完全一致キー）。
 */
const SYSTEM = `
あなたは“記憶に残る短文”に特化した日本語のSNS編集者です。最優先は「想起されること」。
Sticky-7（記憶フック）から最低3つを各媒体に必ず入れてください。

Sticky-7:
1) 五感（見える/聞こえる/匂う/触れる） 2) 数字（回数/割合/金額/時間）
3) 固有名（地名/人名/製品/ブランド）   4) コントラスト（Before/After・賛否）
5) ミニ物語（1人称/会話1行）           6) リズム/反復（語呂・三段並列）
7) 合言葉（7〜12文字の想起タグ）

共通原則:
- 抽象語より具体語（例: 工具→「青いカッター」）。
- 比喩は1個まで。クリシェ（最強/神/やばい等）は避ける。
- CTAは1つ。外部リンクは入れない。
- 絵文字は媒体要件に従い最大2個、タグは最大2個。
\n- 重要: 出力は json オブジェクトのみ。余計な説明文やコードブロック（\`\`\`）は出力しない。
`.trim();

// (removed) platformRule は現在のプロンプトでは未使用のため削除

export async function POST(req: NextRequest) {
  const { user, status, error } = await verifyUser(req as unknown as Request);
  if (!user) return jsonNoStore({ error: error ?? "Unauthorized" }, { status });

  const body = await req.json();
  const parsed = Body.safeParse(body);
  if (!parsed.success)
    return jsonNoStore({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });

  const { memo, variants, sticky, targets } = parsed.data;
  const requested: Target[] = (targets ?? ALL_TARGETS) as Target[];

  // 環境変数チェック
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) return jsonError(500, "Missing OPENAI_API_KEY");

  // プロンプト作成（JSONで x/threads/stories/posts を返す契約）
  const messages = [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: `
バリエーション数: ${variants}
生成対象(媒体): ${requested.join(", ")}

# sticky（可能な限り採用。空は自動補完）
${sticky ? JSON.stringify(sticky, null, 2) : "{}"}

# 入力素材（抜粋/再編集可）
${memo}

# 返却フォーマット（厳守: 完全一致キー/構造）
# Return a json object exactly in this format (no extra keys/text):
{
  "x": ["..."],
  "threads": ["..."],
  "stories": ["..."],
  "posts": ["..."]
}

# 媒体別ルール（厳守）
- X: 140〜220字 / 改行≤3 / 箇条書き2–4 / 1行目=合言葉+フック / CTA1 / 絵文字0–2 / タグ≤2
- Threads: 200〜350字 / 改行≤6 / 箇条書き3–6 / 会話1行を含む / CTA1
- Stories（1枚用テキスト）: 以下を厳守
  ・最大6行、1行8〜14字目安。改行で整形
  ・1行目=合言葉（7〜12字）＋短いフック
  ・数字/五感/固有名 のうち最低2つを必ず含む
  ・比喩は1つまで。絵文字0〜1個。ハッシュタグ最大2（汎用語は禁止）
  ・最後に行動1つ（保存/試す/質問）を短く
- 各媒体で Sticky-7 のうち最低3要素を必ず入れる
- sticky入力（tagline/place/tool/people/numbers/sense/cta）は可能な限り採用。空は自動補完
- variants件数で X/Threads/Stories の各配列長を揃える（例: ${variants} → stories も ${variants} 本）
- targets未指定時は全媒体。対象外媒体は空配列
- posts は x と同値（後方互換用）。余計なキーは一切含めない
`.trim(),
    },
  ];

  // タイムアウト（20秒）
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20_000);

  // OpenAI呼び出し（JSON保証）
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
      response_format: { type: "json_object" },
      messages,
    }),
    cache: "no-store",
    signal: controller.signal,
  }).catch((e) => {
    const msg = e instanceof Error ? e.message : `${e}`;
    return new Response(msg, { status: 502 });
  });

  clearTimeout(t);

  if (!r || !r.ok) {
    let message = "OpenAI error";
    let details: unknown = undefined;
    if (!r) {
      message = "Network error";
    } else {
      const raw = await r.text();
      try {
        const parsed = JSON.parse(raw);
        details = parsed;
        message =
          (typeof parsed?.error?.message === "string" && parsed.error.message) ||
          (typeof parsed?.error === "string" && parsed.error) ||
          (typeof parsed?.message === "string" && parsed.message) ||
          raw ||
          message;
      } catch {
        message = raw || message;
      }
    }
    return jsonNoStore({ error: message, details }, { status: r?.status ?? 502 });
  }

  const data = await r.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";

  // デフォルト（要求媒体以外もキーは常に返す）
  let result: SocialAll = { x: [], threads: [], stories: [], posts: [] };

  // 期待するJSON構造のZodスキーマ
  const ZSocialAll = z.object({
    x: z.array(z.string()).optional(),
    threads: z.array(z.string()).optional(),
    stories: z.array(z.string()).optional(),
    posts: z.array(z.string()).optional(),
  });

  try {
    const raw: unknown = JSON.parse(content);
    const parsed = ZSocialAll.safeParse(raw);
    if (parsed.success) {
      const x = (parsed.data.x ?? parsed.data.posts ?? []).slice(0, variants);
      const threads = (parsed.data.threads ?? []).slice(0, variants);
      const stories = (parsed.data.stories ?? []).slice(0, variants);
      result = { x, threads, stories, posts: x };
    } else {
      result = { x: [], threads: [], stories: [], posts: [] };
    }
  } catch {
    result = { x: [], threads: [], stories: [], posts: [] };
  }

  return jsonNoStore(result, { status: 200 });
}
