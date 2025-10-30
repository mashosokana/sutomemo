// src/app/api/reels/generate-text/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { openai, retryWithBackoff, validateOpenAIResponse, parseAndValidateJSON } from '@/lib/openai';
import { checkSafety } from '@/lib/reels/safety';
import { verifyUser } from '@/lib/auth';

/**
 * AIによるリールテキスト生成API
 * POST /api/reels/generate-text
 *
 * Instagram 2025年アルゴリズムに最適化:
 * - 最初の3秒でフック（視聴維持率向上）
 * - Problem → Evidence → Action の15秒構成
 * - DM送信を促す行動喚起
 */

interface GenerateTextRequest {
  industry: string;              // 業種（記述式）
  photoDescription?: string;     // 写真の内容（任意）
  targetCustomer?: string;       // ターゲット顧客（任意）
  purpose?: string;              // 投稿の目的（任意）
}

interface GeneratedText {
  hook: string;        // 最初の3秒で表示するフック
  problem: string;     // Problem（問題提起）
  evidence: string;    // Evidence（根拠・事例）
  action: string;      // Action（行動喚起）
  tags: string[];      // ハッシュタグ（5個程度）
}

/**
 * 生成されたテキストの型ガード
 */
function isGeneratedText(data: unknown): data is GeneratedText {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;

  return (
    typeof obj.hook === 'string' &&
    typeof obj.problem === 'string' &&
    typeof obj.evidence === 'string' &&
    typeof obj.action === 'string' &&
    Array.isArray(obj.tags) &&
    obj.tags.every((tag) => typeof tag === 'string')
  );
}

export async function POST(request: NextRequest) {
  try {
    const { user, status, error } = await verifyUser(request as unknown as Request);
    if (!user) {
      return NextResponse.json({ error: error ?? 'Unauthorized' }, { status });
    }

    const body: GenerateTextRequest = await request.json();

    // バリデーション
    if (!body.industry || typeof body.industry !== 'string' || body.industry.trim().length === 0) {
      return NextResponse.json(
        { error: '業種を入力してください' },
        { status: 400 }
      );
    }

    // プロンプト構築
    const prompt = buildPrompt(body);

    // AI生成（リトライ付き）
    const generatedText = await retryWithBackoff(async () => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `あなたはInstagramリール専門のSNSマーケティングコピーライターです。
2025年のInstagramアルゴリズムに最適化された文章を生成してください。

【重要な制約】
- 動画の長さ: 15秒固定
- 最初の3秒でユーザーの興味を引くフックが必須
- 視聴完了率を高める構成（Problem → Evidence → Action）
- DM送信や保存を促す行動喚起
- 禁止語: 絶対、必ず、100%、保証、最安（虚偽・誇大表現の防止）

【出力形式】
以下のJSON形式で出力してください:
{
  "hook": "最初の3秒で表示する強力なフック（20文字以内）",
  "problem": "Problem: 問題提起（40文字以内）",
  "evidence": "Evidence: 根拠・事例（50文字以内）",
  "action": "Action: 行動喚起（30文字以内）",
  "tags": ["#タグ1", "#タグ2", "#タグ3", "#タグ4", "#タグ5"]
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const responseText = response.choices[0]?.message?.content;
      const validatedText = validateOpenAIResponse(responseText);
      return parseAndValidateJSON<GeneratedText>(validatedText, isGeneratedText);
    });

    // NGワードチェック
    const allText = `${generatedText.hook} ${generatedText.problem} ${generatedText.evidence} ${generatedText.action}`;
    const safetyCheck = checkSafety(allText);

    if (safetyCheck.hasNgWord) {
      return NextResponse.json(
        {
          error: 'NGワードが検出されました',
          detectedWords: safetyCheck.detectedWords,
          suggestions: safetyCheck.suggestions,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(generatedText, { status: 200 });
  } catch (err) {
    console.error('Generate text API error:', err);

    // OpenAI APIエラーの詳細を返す
    if (err instanceof Error) {
      return NextResponse.json(
        { error: `AI生成エラー: ${err.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'テキスト生成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * AIプロンプトを構築
 */
function buildPrompt(body: GenerateTextRequest): string {
  let prompt = `以下の条件でInstagramリール用の15秒動画の文章を生成してください。

【業種】
${body.industry}`;

  if (body.photoDescription) {
    prompt += `

【写真・動画の内容】
${body.photoDescription}`;
  }

  if (body.targetCustomer) {
    prompt += `

【ターゲット顧客】
${body.targetCustomer}`;
  }

  if (body.purpose) {
    prompt += `

【投稿の目的】
${body.purpose}`;
  }

  prompt += `

【要件】
1. フック: 視聴者が「え？何これ？」と思う強力な問いかけや驚きの事実
2. Problem: ターゲット顧客が抱える具体的な悩みや課題
3. Evidence: あなたのサービス・商品がその課題を解決した実例や根拠
4. Action: DMや保存を促す具体的な行動喚起
5. ハッシュタグ: 業種関連 + 地域 + 悩み + 相談 + #SutoMemo の5つ

文章は簡潔で、15秒で読み上げられる長さにしてください。`;

  return prompt;
}
