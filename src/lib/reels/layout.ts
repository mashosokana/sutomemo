// src/lib/reels/layout.ts

/**
 * リール動画のレイアウト定数とセーフマージン計算
 * 9:16縦型動画（1080×1920）における安全領域を定義
 */

/** 動画解像度: 9:16（インスタグラムリール標準） */
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;

/** フレームレート */
export const VIDEO_FPS = 30;

/** セーフマージン（上下）: この範囲内にはテキストを配置しない */
export const SAFE_MARGIN_TOP = 64;
export const SAFE_MARGIN_BOTTOM = 64;

/** 利用可能な描画領域の高さ */
export const USABLE_HEIGHT = VIDEO_HEIGHT - SAFE_MARGIN_TOP - SAFE_MARGIN_BOTTOM;

/** テキストフォントサイズ（px） */
export const FONT_SIZE_HOOK = 72;      // フック（2秒）: 大きく目立つ
export const FONT_SIZE_BODY = 48;      // 本文（Problem/Evidence/Action）
export const FONT_SIZE_HASHTAG = 36;   // ハッシュタグ

/** テキスト行間（line-height倍率） */
export const LINE_HEIGHT_MULTIPLIER = 1.5;

/**
 * セーフマージンを考慮したY座標を計算
 * @param relativeY 相対位置（0.0～1.0、0=上端、1=下端）
 * @returns 実際のY座標（px）
 */
export function calculateSafeY(relativeY: number): number {
  if (relativeY < 0 || relativeY > 1) {
    throw new Error('relativeY must be between 0.0 and 1.0');
  }
  return SAFE_MARGIN_TOP + relativeY * USABLE_HEIGHT;
}

/**
 * テキストの中央揃え用X座標を計算
 * @returns 中央のX座標（px）
 */
export function getCenterX(): number {
  return VIDEO_WIDTH / 2;
}
