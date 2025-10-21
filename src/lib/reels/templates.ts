// src/lib/reels/templates.ts

/**
 * リール動画の固定値定義
 * AI生成に移行したため、テンプレートは削除
 */

/** 動画の長さ（秒）- 15秒固定 */
export const REEL_DURATION = 15;

/**
 * 地域名をハッシュタグに追加
 * @param tags 既存のタグ配列
 * @param regionName 地域名（例: '那須塩原'）
 * @returns 地域タグを先頭に追加したタグ配列
 */
export function addRegionTag(tags: string[], regionName: string): string[] {
  const regionTag = `#${regionName}`;
  return [regionTag, ...tags];
}
