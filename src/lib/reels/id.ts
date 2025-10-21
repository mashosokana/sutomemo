// src/lib/reels/id.ts

/**
 * postLocalId発行ユーティリティ
 * 端末内で一意なUUID v4形式の文字列を生成する
 */

import { randomUUID } from 'crypto';

/**
 * リール投稿用のローカルIDを生成
 * @returns UUID v4形式の文字列
 */
export function generatePostLocalId(): string {
  // ブラウザ環境ではcrypto.randomUUID()、Node.js環境では'crypto'モジュールを使用
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return randomUUID();
}
