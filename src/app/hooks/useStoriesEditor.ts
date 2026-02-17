// src/app/hooks/useStoriesEditor.ts
'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// 型定義
export type TextBox = {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

type UseStoriesEditorReturn = {
  // 画像関連
  imageUrl: string | null;
  selectImage: (file: File) => Promise<void>;

  // テキストボックス管理
  textBoxes: TextBox[];
  activeTextBoxId: string | null;
  addTextBox: (x: number, y: number) => void;
  updateTextBox: (id: string, updates: Partial<TextBox>) => void;
  deleteTextBox: (id: string) => void;
  setActiveTextBox: (id: string | null) => void;

  // ジェスチャーハンドラー
  handleCanvasTap: (e: React.PointerEvent<HTMLDivElement>) => void;
  handleTextBoxPointerDown: (e: React.PointerEvent<HTMLDivElement>, textBoxId: string) => void;
  handleTextBoxTouchStart: (e: React.TouchEvent<HTMLDivElement>, textBoxId: string) => void;

  // 保存・エクスポート
  getCanvasBlob: () => Promise<Blob | null>;
  getAllText: () => string;
};

/* ---------------- ユーティリティ ---------------- */
const DRAG_DAMPING = 0.7;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function getTouchDistance(touch1: React.Touch, touch2: React.Touch): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
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

/* ----------- ローカル保存 ----------- */
const STORAGE_KEY = 'stories-editor-state:v1';

type EditorState = {
  imageUrl?: string;
  textBoxes?: TextBox[];
};

function saveEditorState(state: EditorState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function loadEditorState(): EditorState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EditorState;
  } catch {
    return null;
  }
}

/* ---------------- Hook 本体 ---------------- */
export function useStoriesEditor(
  initialImageUrl?: string,
  initialCaption?: string,
  containerRef?: React.RefObject<HTMLDivElement>
): UseStoriesEditorReturn {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [activeTextBoxId, setActiveTextBoxId] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const localObjectUrlRef = useRef<string | null>(null);
  const restoredRef = useRef(false);
  const initialDataSetRef = useRef(false);

  // 最新値を保持するrefs
  const imageUrlRef = useRef(imageUrl);
  const textBoxesRef = useRef(textBoxes);

  useEffect(() => { imageUrlRef.current = imageUrl; }, [imageUrl]);
  useEffect(() => { textBoxesRef.current = textBoxes; }, [textBoxes]);

  // 初期データの設定（外部から渡された場合）
  useLayoutEffect(() => {
    if (initialDataSetRef.current) return;

    if (initialImageUrl) {
      setImageUrl(initialImageUrl);

      // initialCaptionがある場合、テキストボックスとして設定
      if (initialCaption) {
        const textBox: TextBox = {
          id: `textbox-initial-${Date.now()}`,
          text: initialCaption,
          x: 50,
          y: 50,
          width: 250,
          height: 100,
          fontSize: 18,
        };
        setTextBoxes([textBox]);
      }

      initialDataSetRef.current = true;
      restoredRef.current = true;
      return;
    }

    // 初期データがない場合のみlocalStorage復元
    const saved = loadEditorState();
    if (saved) {
      // blob URLは一時的なものなので、復元しない（前回のセッションのデータをクリア）
      if (saved.imageUrl && saved.imageUrl.startsWith('blob:')) {
        // 前回のセッションのデータは無効なので、localStorageをクリア
        localStorage.removeItem(STORAGE_KEY);
      } else if (saved.imageUrl) {
        setImageUrl(saved.imageUrl);
        if (saved.textBoxes && Array.isArray(saved.textBoxes)) {
          setTextBoxes(saved.textBoxes);
        }
      }
    }
    restoredRef.current = true;
  }, [initialImageUrl, initialCaption]);

  // 自動保存
  const commitSave = useCallback(() => {
    if (!restoredRef.current) return;
    const run = () =>
      saveEditorState({
        imageUrl: imageUrlRef.current || undefined,
        textBoxes: textBoxesRef.current,
      });

    if ('requestIdleCallback' in window) {
      (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(run);
    } else {
      setTimeout(run, 0);
    }
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    commitSave();
  }, [imageUrl, textBoxes, commitSave]);

  // ページ離脱時に保存
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

  // 画像選択
  const selectImage = useCallback(async (file: File) => {
    if (localObjectUrlRef.current) {
      URL.revokeObjectURL(localObjectUrlRef.current);
      localObjectUrlRef.current = null;
    }
    const url = URL.createObjectURL(file);
    localObjectUrlRef.current = url;
    setImageUrl(url);
    imageRef.current = null;
    // 画像を新しく選択したらテキストボックスをクリア
    setTextBoxes([]);
    setActiveTextBoxId(null);
  }, []);

  // テキストボックス追加
  const addTextBox = useCallback((x: number, y: number) => {
    const newBox: TextBox = {
      id: `textbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: '',
      x,
      y,
      width: 250,
      height: 100,
      fontSize: 18,
    };
    setTextBoxes(prev => [...prev, newBox]);
    setActiveTextBoxId(newBox.id);
  }, []);

  // テキストボックス更新
  const updateTextBox = useCallback((id: string, updates: Partial<TextBox>) => {
    setTextBoxes(prev =>
      prev.map(box => (box.id === id ? { ...box, ...updates } : box))
    );
  }, []);

  // テキストボックス削除
  const deleteTextBox = useCallback((id: string) => {
    setTextBoxes(prev => prev.filter(box => box.id !== id));
    setActiveTextBoxId(prev => (prev === id ? null : prev));
  }, []);

  // キャンバスタップ（新規テキストボックス追加）
  const handleCanvasTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    addTextBox(x, y);
  }, [addTextBox]);

  // ドラッグ状態
  const dragStateRef = useRef<{
    active: boolean;
    textBoxId: string | null;
    startX: number;
    startY: number;
    boxStartX: number;
    boxStartY: number;
  }>({
    active: false,
    textBoxId: null,
    startX: 0,
    startY: 0,
    boxStartX: 0,
    boxStartY: 0,
  });

  // テキストボックスのPointerDown（ドラッグ開始）
  const handleTextBoxPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, textBoxId: string) => {
    e.stopPropagation(); // 親のタップイベントを防ぐ

    const box = textBoxesRef.current.find(b => b.id === textBoxId);
    if (!box) return;

    setActiveTextBoxId(textBoxId);

    dragStateRef.current = {
      active: true,
      textBoxId,
      startX: e.clientX,
      startY: e.clientY,
      boxStartX: box.x,
      boxStartY: box.y,
    };

    const onPointerMove = (ev: PointerEvent) => {
      const st = dragStateRef.current;
      if (!st.active || !st.textBoxId) return;

      const dx = (ev.clientX - st.startX) * DRAG_DAMPING;
      const dy = (ev.clientY - st.startY) * DRAG_DAMPING;

      updateTextBox(st.textBoxId, {
        x: st.boxStartX + dx,
        y: st.boxStartY + dy,
      });

      ev.preventDefault();
    };

    const onPointerUp = () => {
      dragStateRef.current.active = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      commitSave();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
  }, [updateTextBox, commitSave]);

  // ピンチ状態
  const pinchStateRef = useRef<{
    active: boolean;
    textBoxId: string | null;
    initialDistance: number;
    initialWidth: number;
    initialHeight: number;
    initialFontSize: number;
  }>({
    active: false,
    textBoxId: null,
    initialDistance: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialFontSize: 18,
  });

  // テキストボックスのTouchStart（ピンチ検出）
  const handleTextBoxTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, textBoxId: string) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      e.preventDefault(); // PointerEventの発火を防ぐ

      const box = textBoxesRef.current.find(b => b.id === textBoxId);
      if (!box) return;

      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      pinchStateRef.current = {
        active: true,
        textBoxId,
        initialDistance: distance,
        initialWidth: box.width,
        initialHeight: box.height,
        initialFontSize: box.fontSize,
      };

      const onTouchMove = (ev: TouchEvent) => {
        const st = pinchStateRef.current;
        if (!st.active || !st.textBoxId || ev.touches.length !== 2) return;

        const currentDistance = getTouchDistance(ev.touches[0], ev.touches[1]);
        const scale = currentDistance / st.initialDistance;

        updateTextBox(st.textBoxId, {
          width: clamp(st.initialWidth * scale, 100, 600),
          height: clamp(st.initialHeight * scale, 60, 400),
          fontSize: clamp(st.initialFontSize * scale, 12, 36),
        });

        ev.preventDefault();
      };

      const onTouchEnd = () => {
        pinchStateRef.current.active = false;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        commitSave();
      };

      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
    }
  }, [updateTextBox, commitSave]);

  // Canvas Blob生成（Instagram Stories/Reels用 1080x1920）
  const getCanvasBlob = useCallback(async (): Promise<Blob | null> => {
    if (!imageUrl) return null;

    try {
      // 画像を読み込み
      if (!imageRef.current) {
        imageRef.current = await loadImage(imageUrl);
      }
      const img = imageRef.current;

      // Canvas作成（固定サイズ：1080x1920）
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const CANVAS_WIDTH = 1080;
      const CANVAS_HEIGHT = 1920;
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;

      // 背景を黒で塗りつぶし
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 画像を中央に配置（アスペクト比を維持）
      const imgAspect = img.width / img.height;
      const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;

      let drawWidth, drawHeight, drawX, drawY;

      if (imgAspect > canvasAspect) {
        // 画像が横長：幅に合わせる
        drawWidth = CANVAS_WIDTH;
        drawHeight = CANVAS_WIDTH / imgAspect;
        drawX = 0;
        drawY = (CANVAS_HEIGHT - drawHeight) / 2;
      } else {
        // 画像が縦長：高さに合わせる
        drawHeight = CANVAS_HEIGHT;
        drawWidth = CANVAS_HEIGHT * imgAspect;
        drawX = (CANVAS_WIDTH - drawWidth) / 2;
        drawY = 0;
      }

      // 背景画像を描画
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // テキストボックスの座標変換
      // 実際のエディター表示サイズを取得
      const container = containerRef?.current;
      if (!container) {
        console.warn('Container ref is null');
        return new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
      }

      const containerRect = container.getBoundingClientRect();
      const displayWidth = containerRect.width;
      const displayHeight = containerRect.height;

      // 実際の表示サイズを基準にスケーリング
      const scaleX = CANVAS_WIDTH / displayWidth;
      const scaleY = CANVAS_HEIGHT / displayHeight;

      // 各テキストボックスを描画
      textBoxesRef.current.forEach(box => {
        const scaledX = box.x * scaleX;
        const scaledY = box.y * scaleY;
        const scaledWidth = box.width * scaleX;
        const scaledFontSize = box.fontSize * scaleX;

        // テキスト設定
        ctx.fillStyle = '#111';
        ctx.font = `${scaledFontSize}px sans-serif`;
        ctx.textBaseline = 'top';

        // DraggableTextBoxと同じpadding: px-3 py-2 (12px, 8px)
        const paddingX = 12 * scaleX;
        const paddingY = 8 * scaleY;
        // DraggableTextBoxと同じline-height: leading-tight (1.25)
        const lineHeight = scaledFontSize * 1.25;

        // テキストを幅に合わせて自動改行
        const maxWidth = scaledWidth - paddingX * 2;
        const lines = box.text.split('\n');
        const wrappedLines: string[] = [];

        lines.forEach(line => {
          if (line === '') {
            wrappedLines.push('');
            return;
          }

          let currentLine = '';
          const chars = Array.from(line); // サロゲートペア対応

          chars.forEach((char) => {
            const testLine = currentLine + char;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine !== '') {
              wrappedLines.push(currentLine);
              currentLine = char;
            } else {
              currentLine = testLine;
            }
          });

          if (currentLine !== '') {
            wrappedLines.push(currentLine);
          }
        });

        // 実際のテキスト行数に基づいて高さを計算
        const textHeight = wrappedLines.length * lineHeight;
        const actualHeight = Math.max(
          textHeight + paddingY * 2,
          box.height * scaleY // 最小高さはユーザー設定値
        );

        // 背景（実際の高さに合わせて描画）
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(scaledX, scaledY, scaledWidth, actualHeight);

        // 折り返されたテキストを描画
        ctx.fillStyle = '#111';
        wrappedLines.forEach((line, i) => {
          ctx.fillText(
            line,
            scaledX + paddingX,
            scaledY + paddingY + i * lineHeight
          );
        });
      });

      // Blobに変換
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    } catch (error) {
      console.error('Canvas blob generation error:', error);
      return null;
    }
  }, [imageUrl]);

  // 全テキストを取得
  const getAllText = useCallback((): string => {
    return textBoxesRef.current
      .map(box => box.text)
      .filter(text => text.trim().length > 0)
      .join('\n');
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (localObjectUrlRef.current) {
        URL.revokeObjectURL(localObjectUrlRef.current);
        localObjectUrlRef.current = null;
      }
    };
  }, []);

  return {
    imageUrl,
    selectImage,
    textBoxes,
    activeTextBoxId,
    addTextBox,
    updateTextBox,
    deleteTextBox,
    setActiveTextBox: setActiveTextBoxId,
    handleCanvasTap,
    handleTextBoxPointerDown,
    handleTextBoxTouchStart,
    getCanvasBlob,
    getAllText,
  };
}

export default useStoriesEditor;
