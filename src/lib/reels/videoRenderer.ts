// src/lib/reels/videoRenderer.ts

/**
 * Canvas APIとMediaRecorder APIを使った動画レンダリング
 * ブラウザ上で静止画 + テキストアニメーション → WebM/MP4変換
 */

import { VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS, SAFE_MARGIN_TOP, SAFE_MARGIN_BOTTOM } from './layout';

/** テキストブロックの定義 */
export interface TextBlock {
  text: string;
  startTime: number;  // 秒
  endTime: number;    // 秒
  fontSize: number;   // px
}

/** レンダリングオプション */
export interface RenderOptions {
  imageFile: File;           // 背景画像
  textBlocks: TextBlock[];   // テキストブロック配列
  duration: number;          // 総時間（秒）
  onProgress?: (progress: number) => void;  // 進捗コールバック (0-100)
}

export interface RenderResult {
  url: string;
  mimeType: string;
}

/**
 * 動画をレンダリング
 * @param options レンダリングオプション
 * @returns 生成された動画のBlob URL
 */
export async function renderReelVideo(options: RenderOptions): Promise<RenderResult> {
  const { imageFile, textBlocks, duration, onProgress } = options;

  // Canvas準備
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO_WIDTH;
  canvas.height = VIDEO_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // 画像または動画の最初のフレームを読み込み
  const image = await loadMediaAsImage(imageFile);

  // MediaRecorder準備
  const stream = canvas.captureStream(VIDEO_FPS);
  const mimeType = getSupportedMimeType();
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5000000, // 5Mbps
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  // レンダリング実行
  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      resolve({ url, mimeType });
    };

    mediaRecorder.onerror = (e) => {
      reject(new Error('MediaRecorder error: ' + e));
    };

    mediaRecorder.start();

    // フレーム描画
    renderFrames(ctx, image, textBlocks, duration, VIDEO_FPS, onProgress).then(() => {
      mediaRecorder.stop();
    }).catch(reject);
  });
}

/**
 * フレームを順次描画
 */
async function renderFrames(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  textBlocks: TextBlock[],
  duration: number,
  fps: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  const totalFrames = duration * fps;
  const frameInterval = 1000 / fps;

  for (let frame = 0; frame < totalFrames; frame++) {
    const currentTime = frame / fps;

    // 背景画像描画（アスペクト比維持してセンタークロップ）
    drawImageCover(ctx, image, VIDEO_WIDTH, VIDEO_HEIGHT);

    // 現在時刻に表示すべきテキストブロックを描画
    const currentBlock = textBlocks.find(
      (block) => currentTime >= block.startTime && currentTime < block.endTime
    );

    if (currentBlock) {
      drawTextBlock(ctx, currentBlock);
    }

    // 進捗通知
    if (onProgress) {
      const progress = Math.round((frame / totalFrames) * 100);
      onProgress(progress);
    }

    // 次のフレームまで待機（ブラウザがフレームを処理する時間を確保）
    await new Promise((resolve) => setTimeout(resolve, frameInterval));
  }
}

/**
 * 画像をカバー表示（アスペクト比維持してセンタークロップ）
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): void {
  const imageAspect = image.width / image.height;
  const canvasAspect = canvasWidth / canvasHeight;

  let drawWidth: number;
  let drawHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (imageAspect > canvasAspect) {
    // 画像が横長 → 高さ基準でクロップ
    drawHeight = canvasHeight;
    drawWidth = drawHeight * imageAspect;
    offsetX = -(drawWidth - canvasWidth) / 2;
  } else {
    // 画像が縦長 → 幅基準でクロップ
    drawWidth = canvasWidth;
    drawHeight = drawWidth / imageAspect;
    offsetY = -(drawHeight - canvasHeight) / 2;
  }

  ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * テキストブロックを描画
 */
function drawTextBlock(ctx: CanvasRenderingContext2D, block: TextBlock): void {
  // 半透明の黒帯を背景に配置（可読性向上）
  const padding = 40;
  const lineHeight = block.fontSize * 1.5;
  const lines = wrapText(ctx, block.text, VIDEO_WIDTH - padding * 2, block.fontSize);
  const textHeight = lines.length * lineHeight;
  const textY = (VIDEO_HEIGHT - textHeight) / 2;

  // 黒帯描画
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, textY - padding, VIDEO_WIDTH, textHeight + padding * 2);

  // テキスト描画
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${block.fontSize}px "Noto Sans JP", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  lines.forEach((line, index) => {
    const y = textY + index * lineHeight;
    // セーフマージン内かチェック
    if (y >= SAFE_MARGIN_TOP && y + lineHeight <= VIDEO_HEIGHT - SAFE_MARGIN_BOTTOM) {
      ctx.fillText(line, VIDEO_WIDTH / 2, y);
    }
  });
}

/**
 * テキストを指定幅で折り返し
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  ctx.font = `bold ${fontSize}px "Noto Sans JP", sans-serif`;
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine !== '') {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * 画像ファイルを読み込み
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * dataURLからHTMLImageElementを生成
 */
function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 画像または動画ファイルからプレビュー用のHTMLImageElementを生成
 * 動画の場合は最初のフレームを<video>で取得しCanvasに描画して利用
 */
async function loadMediaAsImage(file: File): Promise<HTMLImageElement> {
  if (file.type.startsWith('image/')) {
    return loadImage(file);
  }

  if (file.type.startsWith('video/')) {
    const videoUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = videoUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        const handleLoadedData = () => resolve();
        const handleError = () => reject(new Error('動画の読み込みに失敗しました'));
        video.addEventListener('loadeddata', handleLoadedData, { once: true });
        video.addEventListener('error', handleError, { once: true });
      });

      if (!video.videoWidth || !video.videoHeight) {
        throw new Error('動画の解像度を取得できませんでした');
      }

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        throw new Error('Canvas context not available for video frame capture');
      }

      // 先頭フレームを描画
      tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      const dataUrl = tempCanvas.toDataURL('image/png');
      return await loadImageFromDataUrl(dataUrl);
    } finally {
      URL.revokeObjectURL(videoUrl);
    }
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}

/**
 * サポートされているMIMEタイプを取得
 */
function getSupportedMimeType(): string {
  const types = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  // フォールバック
  return 'video/webm';
}

/**
 * テキストブロックを生成（15秒用）
 */
export function createTextBlocks(
  hook: string,
  problem: string,
  evidence: string,
  action: string
): TextBlock[] {
  return [
    { text: hook, startTime: 0, endTime: 3, fontSize: 72 },
    { text: problem, startTime: 3, endTime: 8, fontSize: 48 },
    { text: evidence, startTime: 8, endTime: 12, fontSize: 48 },
    { text: action, startTime: 12, endTime: 15, fontSize: 48 },
  ];
}
