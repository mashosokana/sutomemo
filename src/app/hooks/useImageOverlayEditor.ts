// src/app/hooks/useImageOverlayEditor.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';

type Point = { x: number; y: number };
type TextBoxSize = { width: number; height: number };
type ApiImage = { signedUrl?: string | null };

type UseImageOverlayEditorArgs = { postId: number };
type UseImageOverlayEditorReturn = {
  text: string;
  setText: (v: string) => void;
  textBoxSize: TextBoxSize;
  setTextBoxSize: (updater: (s: TextBoxSize) => TextBoxSize) => void;
  dragOffset: Point;
  isProcessing: boolean;

  initFromPost: () => Promise<void>;
  drawOnCanvas: (canvas: HTMLCanvasElement | null) => Promise<void>;
  bindCanvasDrag: (e: ReactMouseEvent<HTMLCanvasElement>) => void;
  downloadCanvas: (canvas: HTMLCanvasElement | null, filename: string) => void;
  previewLocalFile: (file: File) => Promise<void>;
};

/* ---------------- 型ガード & ユーティリティ ---------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asNonEmptyString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : undefined;
}

function extractImages(obj: Record<string, unknown>): ApiImage[] {
  const raw = obj['images'];
  if (!Array.isArray(raw)) return [];
  const out: ApiImage[] = [];
  for (const item of raw) {
    if (isRecord(item)) {
      const su = item['signedUrl'];
      if (typeof su === 'string') out.push({ signedUrl: su });
      else if (su == null) out.push({ signedUrl: null });
      else out.push({});
    }
  }
  return out;
}

function extractMemoText(memoLike: unknown): string {
  if (!isRecord(memoLike)) return '';
  const keys = ['text', 'body', 'content', 'answerWhy', 'answerWhat', 'answerNext'] as const;
  const parts: string[] = [];
  for (const k of keys) {
    const v = memoLike[k as keyof typeof memoLike];
    if (typeof v === 'string' && v.trim().length > 0) parts.push(v.trim());
  }
  return parts.join('\n');
}

/** /api/posts/[id] の返却が { post: {...} } でもフラットでも対応 */
function normalizePost(data: unknown): {
  imageUrl?: string;
  caption?: string;
  memoText?: string;
} {
  const root: Record<string, unknown> =
    isRecord(data) && isRecord((data as Record<string, unknown>)['post'])
      ? ((data as Record<string, unknown>)['post'] as Record<string, unknown>)
      : isRecord(data)
      ? (data as Record<string, unknown>)
      : {};

  const imageUrl = asNonEmptyString(root['imageUrl']);

  const images = extractImages(root);
  const signed = images.find((i) => typeof i.signedUrl === 'string')?.signedUrl;

  const caption = asNonEmptyString(root['caption']);

  const memoCandidate =
    root['memo'] ?? root['postMemo'] ?? root['memoData'];
  const memoText = extractMemoText(memoCandidate);

  return {
    imageUrl: imageUrl ?? signed ?? undefined,
    caption,
    memoText,
  };
}

/** CORS 安全な画像ロード */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load error: ' + url));
    img.src = url;
  });
}

/** 簡易改行なし描画（必要なら wrap を後で拡張） */
function wrapLines(text: string): string[] {
  return text.split('\n');
}

/* ---------------- Hook 本体 ---------------- */

export function useImageOverlayEditor({ postId }: UseImageOverlayEditorArgs): UseImageOverlayEditorReturn {
  const { token } = useSupabaseSession();

  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const [text, setText] = useState<string>('');
  const [textBoxSize, _setTextBoxSize] = useState<TextBoxSize>({ width: 220, height: 120 });
  const [overlayPos, setOverlayPos] = useState<Point>({ x: 20, y: 20 });
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const localObjectUrlRef = useRef<string | null>(null);

  const setTextBoxSize = useCallback((updater: (s: TextBoxSize) => TextBoxSize) => {
    _setTextBoxSize((prev) => updater(prev));
  }, []);

  const initFromPost = useCallback(async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`GET /api/posts/${postId} failed (${res.status})`);
      const raw: unknown = await res.json();

      const { imageUrl, caption, memoText } = normalizePost(raw);

      // 画像URLが得られたときのみ差し替える（得られない場合は現状維持）
      if (imageUrl) {
        if (localObjectUrlRef.current) {
          URL.revokeObjectURL(localObjectUrlRef.current);
          localObjectUrlRef.current = null;
        }
        setBaseImageUrl(imageUrl);
        baseImageRef.current = null;
      } else {
        // console.warn('No image url from server; keep current canvas image.');
      }

      const seed = (memoText && memoText.trim()) || caption || '';
      setText((prev) => (prev.trim().length > 0 ? prev : seed));
    } catch (e) {
      console.error('initFromPost error:', e);
    } finally {
      setIsProcessing(false);
    }
  }, [postId, token]);

  const drawOnCanvas = useCallback(
    async (canvas: HTMLCanvasElement | null) => {
      lastCanvasRef.current = canvas;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!baseImageUrl) {
        canvas.width = 300;
        canvas.height = 180;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      try {
        if (!baseImageRef.current) {
          baseImageRef.current = await loadImage(baseImageUrl);
        }
        const img = baseImageRef.current;

        const maxW = 300;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        canvas.width = w;
        canvas.height = h;

        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // メモボックス
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(overlayPos.x, overlayPos.y, textBoxSize.width, textBoxSize.height);

        // テキスト描画（シンプルに行ごと）
        ctx.fillStyle = 'black';
        ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
        ctx.textBaseline = 'top';
        const pad = 8;
        let y = overlayPos.y + pad;
        for (const line of wrapLines(text)) {
          ctx.fillText(line, overlayPos.x + pad, y);
          y += 20;
          if (y > overlayPos.y + textBoxSize.height - pad) break;
        }
      } catch (e) {
        console.error('drawOnCanvas error:', e);
      }
    },
    [baseImageUrl, overlayPos.x, overlayPos.y, text, textBoxSize.height, textBoxSize.width]
  );

  useEffect(() => {
    if (lastCanvasRef.current) void drawOnCanvas(lastCanvasRef.current);
  }, [baseImageUrl, drawOnCanvas]);

  const bindCanvasDrag = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const start: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragOffset(start);
    draggingRef.current = true;

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const r = canvas.getBoundingClientRect();
      const pos: Point = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      const dx = pos.x - start.x;
      const dy = pos.y - start.y;
      setOverlayPos((p) => ({ x: Math.max(0, p.x + dx), y: Math.max(0, p.y + dy) }));
    };

    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const downloadCanvas = useCallback((canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }, []);

  const previewLocalFile = useCallback(async (file: File) => {
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    localObjectUrlRef.current = url;

    setBaseImageUrl(url);
    baseImageRef.current = null;
    if (lastCanvasRef.current) await drawOnCanvas(lastCanvasRef.current);
  }, [drawOnCanvas]);

  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = null;
      }
    };
  }, []);

  return {
    text,
    setText,
    textBoxSize,
    setTextBoxSize,
    dragOffset,
    isProcessing,
    initFromPost,
    drawOnCanvas,
    bindCanvasDrag,
    downloadCanvas,
    previewLocalFile,
  };
}

export default useImageOverlayEditor;
