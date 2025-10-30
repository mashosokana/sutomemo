// src/lib/aiCache.ts
import { createHash } from 'crypto';

type CachedResult = {
  posts: string[];
  timestamp: number;
};

// メモリ内キャッシュ（シンプルなMap）
const cache = new Map<string, CachedResult>();

// キャッシュTTL: 1時間
const CACHE_TTL = 60 * 60 * 1000;

// 最大キャッシュサイズ（メモリ節約）
const MAX_CACHE_SIZE = 100;

/**
 * キャッシュキーを生成（メモ内容+プラットフォーム+バリアント数からハッシュ生成）
 */
export function generateCacheKey(memo: string, platform: string, variants: number): string {
  const normalized = `${memo.toLowerCase().trim()}|${platform}|${variants}`;
  return createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

/**
 * キャッシュから結果を取得
 */
export function getCachedResult(key: string): string[] | null {
  const cached = cache.get(key);

  if (!cached) {
    return null;
  }

  // TTL チェック
  const age = Date.now() - cached.timestamp;
  if (age > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return cached.posts;
}

/**
 * キャッシュに結果を保存
 */
export function setCachedResult(key: string, posts: string[]): void {
  // キャッシュサイズ制限（古いものから削除）
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    posts,
    timestamp: Date.now(),
  });
}

/**
 * キャッシュ統計（デバッグ用）
 */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL,
  };
}

/**
 * 期限切れキャッシュのクリーンアップ（定期実行推奨）
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, value] of cache.entries()) {
    const age = now - value.timestamp;
    if (age > CACHE_TTL) {
      cache.delete(key);
      deletedCount++;
    }
  }

  return deletedCount;
}
