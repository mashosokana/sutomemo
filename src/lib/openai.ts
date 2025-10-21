// src/lib/openai.ts
import OpenAI from "openai";

/**
 * OpenAIクライアント（タイムアウト設定付き）
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000, // 30秒のタイムアウト
  maxRetries: 2, // 最大2回のリトライ
});

/**
 * 指数バックオフでリトライを実行するヘルパー関数
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 最後の試行でエラーが発生した場合はすぐに投げる
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // レート制限エラーかタイムアウトエラーの場合のみリトライ
      const shouldRetry =
        error instanceof Error &&
        (error.message.includes('timeout') ||
         error.message.includes('rate') ||
         error.message.includes('429'));

      if (!shouldRetry) {
        throw error;
      }

      // 指数バックオフで待機
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * OpenAI APIレスポンスの検証
 */
export function validateOpenAIResponse(responseText: string | null | undefined): string {
  if (!responseText || responseText.trim().length === 0) {
    throw new Error("AIからの応答が空です");
  }
  return responseText;
}

/**
 * JSONレスポンスのパースと検証
 */
export function parseAndValidateJSON<T>(
  responseText: string,
  validator?: (data: unknown) => data is T
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`JSONのパースに失敗しました: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (validator && !validator(parsed)) {
    throw new Error("AIレスポンスの形式が不正です");
  }

  return parsed as T;
}
