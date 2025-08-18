// src/app/hooks/useImageOverlayEditor.ts
'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
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

  fontSize: number;
  setFontSize: (px: number) => void;

  initFromPost: () => Promise<void>;
  drawOnCanvas: (canvas: HTMLCanvasElement | null) => Promise<void>;
  bindCanvasDrag: (e: ReactMouseEvent<HTMLCanvasElement>) => void;
  downloadCanvas: (canvas: HTMLCanvasElement | null, filename: string) => void;
  previewLocalFile: (file: File) => Promise<void>;
};

/* ---------------- ユーティリティ ---------------- */

const DRAG_DAMPING = 0.7;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
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

  const getStr = (k: string): string | undefined => {
    const v = root[k];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };

  const imageUrl = getStr('imageUrl');
  const images = extractImages(root);
  const signed = images.find((i) => typeof i.signedUrl === 'string')?.signedUrl;
  const caption = getStr('caption');

  let memoText: string | undefined = getStr('memoText');
  if (!memoText && typeof root['memo'] === 'string') {
    const s = (root['memo'] as string).trim();
    if (s) memoText = s;
  }
  if (!memoText) {
    const memoObj = root['memo'] ?? root['postMemo'] ?? root['memoData'];
    if (isRecord(memoObj)) memoText = extractMemoText(memoObj);
  }

  return {
    imageUrl: imageUrl ?? signed ?? undefined,
    caption,
    memoText,
  };
}

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

function wrapLines(text: string): string[] {
  return text.split('\n');
}

/* ----------- ローカル保存（投稿単位） ----------- */

const STORAGE_KEY = (postId: number) => `overlay:${postId}:v1`;

type OverlayState = {
  text?: string;
  textBoxSize?: TextBoxSize;
  dragOffset?: Point;
  fontSize?: number;
};

function saveOverlayState(postId: number, state: OverlayState) {
  try {
    localStorage.setItem(STORAGE_KEY(postId), JSON.stringify(state));
  } catch {}
}

function loadOverlayState(postId: number): OverlayState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(postId));
    if (!raw) return null;
    const obj = JSON.parse(raw) as Partial<OverlayState>;
    const out: OverlayState = {};
    if (obj && typeof obj === 'object') {
      if (typeof obj.text === 'string') out.text = obj.text;
      if (
        obj.textBoxSize &&
        typeof obj.textBoxSize.width === 'number' &&
        typeof obj.textBoxSize.height === 'number'
      ) {
        out.textBoxSize = { width: obj.textBoxSize.width, height: obj.textBoxSize.height };
      }
      if (obj.dragOffset && typeof obj.dragOffset.x === 'number' && typeof obj.dragOffset.y === 'number') {
        out.dragOffset = { x: obj.dragOffset.x, y: obj.dragOffset.y };
      }
      if (typeof obj.fontSize === 'number') {
        const n = Math.max(9, Math.min(18, Math.round(obj.fontSize)));
        out.fontSize = n;
      }
    }
    return out;
  } catch {
    return null;
  }
}

/* ---------------- Hook 本体 ---------------- */

export function useImageOverlayEditor({ postId }: UseImageOverlayEditorArgs): UseImageOverlayEditorReturn {
  const { token } = useSupabaseSession();

  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);

  const [text, setText] = useState<string>('');
  const [textBoxSize, _setTextBoxSize] = useState<TextBoxSize>({ width: 220, height: 120 });
  const [dragOffset, setDragOffset] = useState<Point>({ x: 20, y: 20 });
  const [fontSizeState, _setFontSize] = useState<number>(16);
  const [isProcessing, setIsProcessing] = useState(false);

  const lastCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const localObjectUrlRef = useRef<string | null>(null);

  // 復元完了フラグ
  const restoredRef = useRef(false);

  // 最新値を保持する refs（保存時に正しい値を使うため）
  const textRef = useRef(text);
  const sizeRef = useRef(textBoxSize);
  const dragRef = useRef(dragOffset);
  const fontRef = useRef(fontSizeState);

  useEffect(() => { textRef.current = text; }, [text]);
  useEffect(() => { sizeRef.current = textBoxSize; }, [textBoxSize]);
  useEffect(() => { dragRef.current = dragOffset; }, [dragOffset]);
  useEffect(() => { fontRef.current = fontSizeState; }, [fontSizeState]);

  // すぐ保存するヘルパ
  const commitSave = useCallback(() => {
    if (!restoredRef.current) return;
    // 遅延保存（描画やUI処理をブロックしない）
    const run = () =>
      saveOverlayState(postId, {
        text: textRef.current,
        textBoxSize: sizeRef.current,
        dragOffset: dragRef.current,
        fontSize: fontRef.current,
      });

    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
    } else {
      setTimeout(run, 0);
    }
  }, [postId]);

  // setter ラップ：更新と同時に保存
  const setTextBoxSize = useCallback(
    (updater: (s: TextBoxSize) => TextBoxSize) => {
      _setTextBoxSize(prev => {
        const next = updater(prev);
        sizeRef.current = next;
        commitSave();
        return next;
      });
    },
    [commitSave]
  );

  const setFontSize = useCallback((px: number) => {
    const n = Math.max(9, Math.min(18, Math.round(px)));
    _setFontSize(n);
    fontRef.current = n;
    commitSave();
  }, [commitSave]);

  /* 1) まず localStorage から即復元（描画前に反映） */
  useLayoutEffect(() => {
    const saved = loadOverlayState(postId);
    if (saved) {
      if (typeof saved.text === 'string' && saved.text.trim().length > 0) setText(saved.text);
      if (saved.textBoxSize) _setTextBoxSize(saved.textBoxSize);
      if (saved.dragOffset) setDragOffset(saved.dragOffset);
      if (typeof saved.fontSize === 'number') _setFontSize(saved.fontSize);
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  /* 2) サーバから画像/メモを取得（テキストが空のときだけ初期化） */
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

      if (imageUrl) {
        if (localObjectUrlRef.current) {
          URL.revokeObjectURL(localObjectUrlRef.current);
          localObjectUrlRef.current = null;
        }
        setBaseImageUrl(imageUrl);
        baseImageRef.current = null;
      }

      const serverSeed = (memoText && memoText.trim()) || caption || '';
      setText(prev => (prev.trim().length > 0 ? prev : serverSeed));
    } catch (e) {
      console.error('initFromPost error:', e);
    } finally {
      setIsProcessing(false);
    }
  }, [postId, token]);

  /* 3) 自動保存（復元後のみ） */
  useEffect(() => {
    if (!restoredRef.current) return;
    commitSave();
  }, [postId, text, textBoxSize, dragOffset, fontSizeState, commitSave]);

  /* 3.1) ページ離脱時にも保存 */
  useEffect(() => {
    if (!restoredRef.current) return;
    const handler = () => commitSave();
    window.addEventListener('pagehide', handler);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handler();
    });
    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('pagehide', handler);
      window.removeEventListener('beforeunload', handler);
    };
  }, [commitSave]);

  /* 4) 描画（Retina対応） */
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

        const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));

        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) {
          ctx.imageSmoothingQuality = 'high';
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width || 1;
        const scaleY = canvas.height / rect.height || 1;

        const boxW = sizeRef.current.width * scaleX;
        const boxH = sizeRef.current.height * scaleY;

        const safeX = clamp(dragRef.current.x, 0, Math.max(0, canvas.width - boxW));
        const safeY = clamp(dragRef.current.y, 0, Math.max(0, canvas.height - boxH));

        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(safeX, safeY, boxW, boxH);

        ctx.fillStyle = '#000';
        ctx.textBaseline = 'top';
        const scalar = Math.max(scaleX, scaleY);
        const pad = 8 * scalar;
        const lineStep = 20 * scalar;
        const fontPx = fontRef.current * scalar;
        ctx.font = `${fontPx}px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;

        let y = safeY + pad;
        for (const line of wrapLines(textRef.current)) {
          ctx.fillText(line, safeX + pad, y);
          y += lineStep;
          if (y > safeY + boxH - pad) break;
        }
      } catch (e) {
        console.error('drawOnCanvas error:', e);
      }
    },
    [baseImageUrl]
  );

  useEffect(() => {
    if (lastCanvasRef.current) void drawOnCanvas(lastCanvasRef.current);
  }, [baseImageUrl, drawOnCanvas]);

  /* 5) ドラッグ開始（減衰＋枠内クランプ、終了時に保存） */
  function bindCanvasDrag(e: ReactMouseEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width || 1;
    const scaleY = canvas.height / rect.height || 1;

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { x: dragRef.current.x, y: dragRef.current.y };

    const boxW = sizeRef.current.width * scaleX;
    const boxH = sizeRef.current.height * scaleY;

    const onMove = (ev: MouseEvent) => {
      const dxCss = ev.clientX - startX;
      const dyCss = ev.clientY - startY;
      const dx = dxCss * scaleX * DRAG_DAMPING;
      const dy = dyCss * scaleY * DRAG_DAMPING;

      let nx = startPos.x + dx;
      let ny = startPos.y + dy;

      nx = clamp(nx, 0, canvas.width - boxW);
      ny = clamp(ny, 0, canvas.height - boxH);

      setDragOffset({ x: nx, y: ny });
      dragRef.current = { x: nx, y: ny };
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      commitSave(); // ← ドラッグ終了時に確定保存
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  /* ダウンロード */
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

  /* ローカルプレビュー */
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
    setText: (v: string) => { setText(v); textRef.current = v; commitSave(); },
    textBoxSize,
    setTextBoxSize,
    dragOffset,
    isProcessing,
    fontSize: fontSizeState,
    setFontSize,
    initFromPost,
    drawOnCanvas,
    bindCanvasDrag,
    downloadCanvas,
    previewLocalFile,
  };
}

export default useImageOverlayEditor;
