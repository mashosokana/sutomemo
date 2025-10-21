// src/lib/reels/safety.ts

/**
 * NGワード検出ユーティリティ
 * 誇大広告や虚偽表現を防止するため、禁止語をチェックする
 */

/** 禁止語リスト（煽り・虚偽の防止） */
const NG_WORDS = [
  '絶対',
  '必ず',
  '誰でも',
  '100%',
  '保証',
  '最安',
] as const;

/** NGワード検出結果 */
export interface SafetyCheckResult {
  /** NGワードが検出されたか */
  hasNgWord: boolean;
  /** 検出されたNGワードのリスト */
  detectedWords: string[];
  /** 代替提案（検出された場合のみ） */
  suggestions: string[];
}

/**
 * テキスト内のNGワードを検出
 * @param text チェック対象のテキスト
 * @returns 検出結果
 */
export function checkSafety(text: string): SafetyCheckResult {
  const detectedWords: string[] = [];

  for (const ngWord of NG_WORDS) {
    if (text.includes(ngWord)) {
      detectedWords.push(ngWord);
    }
  }

  const hasNgWord = detectedWords.length > 0;
  const suggestions = hasNgWord ? generateSuggestions(detectedWords) : [];

  return {
    hasNgWord,
    detectedWords,
    suggestions,
  };
}

/**
 * NGワードに対する代替提案を生成
 * @param detectedWords 検出されたNGワード
 * @returns 代替案のリスト
 */
function generateSuggestions(detectedWords: string[]): string[] {
  const suggestionMap: Record<string, string> = {
    '絶対': '「おすすめ」や「多くの方に」を使いましょう',
    '必ず': '「おすすめ」や「多くの方に」を使いましょう',
    '誰でも': '「多くの方に」や「初心者の方にも」を使いましょう',
    '100%': '「高い確率で」や「多くの場合」を使いましょう',
    '保証': '「サポート」や「お手伝い」を使いましょう',
    '最安': '「お得」や「リーズナブル」を使いましょう',
  };

  return detectedWords.map(word => suggestionMap[word] || '適切な表現に変更してください');
}
