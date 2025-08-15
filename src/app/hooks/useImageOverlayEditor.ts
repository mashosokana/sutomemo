//src/app/posts/hooks/useImageOverlayEditor.ts

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuthInfo } from "./useAuthInfo"; 

export type FontSize = "small" | "medium" | "large";

export type OverlaySettings = {
  text: string;
  fontSize: FontSize;
  textBoxSize: { width: number; height: number };
  dragOffset: { x: number; y: number };
};

export type PostImageLike = {
  id: number;
  imageKey: string;
  signedUrl: string | null | undefined;
};

function debounce<A extends unknown[]>(fn: (...args: A) => void, ms = 300) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function useImageOverlayEditor(opts: { postId: number }) {
  const { postId } = opts;
  const { token, isGuest } = useAuthInfo();

  // 画面状態
  const [text, setText] = useState("");
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [textBoxSize, setTextBoxSize] = useState({ width: 260, height: 120 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<PostImageLike | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1) ローカル保存のキー
  const storageKey = useMemo(() => `post:${postId}:edit`, [postId]);
  const hasLocalOverride = useRef(false);

  // 2) 復元
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<OverlaySettings>;
      let restored = false;
      if (saved.text != null) { setText(saved.text); restored = true; }
      if (saved.fontSize) { setFontSize(saved.fontSize); restored = true; }
      if (saved.textBoxSize) { setTextBoxSize(saved.textBoxSize); restored = true; }
      if (saved.dragOffset) { setDragOffset(saved.dragOffset); restored = true; }
      if (restored) hasLocalOverride.current = true;
    } catch (e) {
      console.warn("restore failed", e);
    }
  }, [storageKey]);

  // 3) 保存
  const persist = useRef(
    debounce((s: OverlaySettings) => {
      localStorage.setItem(storageKey, JSON.stringify(s));
    }, 300)
  ).current;

  useEffect(() => {
    persist({ text, fontSize, textBoxSize, dragOffset });
  }, [text, fontSize, textBoxSize, dragOffset, persist]);

  // 4) 投稿取得→初期テキスト&画像
  const initFromPost = useCallback(async () => {
    if (!token || isNaN(postId) || isGuest) return;

    const res = await fetch(`/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return;

    const data = await res.json();
    const post = data.post as {
      caption?: string;
      memo?: { answerWhy?: string; answerWhat?: string; answerNext?: string };
      images?: Array<PostImageLike>;
    };

    // 初期テキスト
    const combinedText = [
      post.caption,
      post.memo?.answerWhy,
      post.memo?.answerWhat,
      post.memo?.answerNext,
    ].filter(Boolean).join("\n\n");
    if (!hasLocalOverride.current) setText(combinedText);

    // 画像
    const imgs = (post.images ?? []).filter(i => i?.signedUrl);
    const picked = imgs[0] ?? null; 
    setImage(picked);
  }, [postId, token, isGuest]);

  // 5) キャンバス描画関数
  const drawOnCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || !image?.signedUrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.signedUrl;

    img.onload = () => {
      const width = 300; 
      const scale = width / img.width;
      const height = img.height * scale;

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const clampedX = Math.min(Math.max(0, dragOffset.x), width - textBoxSize.width);
      const clampedY = Math.min(Math.max(0, dragOffset.y), height - textBoxSize.height);

      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(clampedX, clampedY, textBoxSize.width, textBoxSize.height);

      let px = 14;
      if (fontSize === "small") px = 12;
      if (fontSize === "large") px = 18;
      ctx.font = `${px}px sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";

      text.split("\n").forEach((line, i) => {
        ctx.fillText(line, clampedX + 10, clampedY + 10 + i * (px + 4));
      });

      // はみ出し補正を状態へ反映
      if (clampedX !== dragOffset.x || clampedY !== dragOffset.y) {
        setDragOffset({ x: clampedX, y: clampedY });
      }
    };

    img.onerror = (ev) => {
      console.error("Image load error", { src: image.signedUrl, ev });
    };
  }, [image, text, textBoxSize, dragOffset, fontSize]);

  const bindCanvasDrag = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const startX = e.nativeEvent.offsetX;
    const startY = e.nativeEvent.offsetY;
    const initialX = dragOffset.x;
    const initialY = dragOffset.y;
  
    const handleMove = (moveEvent: MouseEvent) => {
      const { offsetX, offsetY } = moveEvent; 
      const dx = offsetX - startX;
      const dy = offsetY - startY;
      setDragOffset({ x: initialX + dx, y: initialY + dy });
    };
  
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [dragOffset]);

  // 7) 画像アップロード
  const uploadImage = useCallback(async (file: File, options: {
    currentImageKey?: string | null;
  } = {}) => {
    if (!token) return null;
    setIsProcessing(true);
    try {
      if (options.currentImageKey) {
        await fetch(`/api/posts/${postId}/images`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ imageKey: options.currentImageKey }),
        });
      }

      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const uploaded = data.image as PostImageLike | undefined;
      if (uploaded?.signedUrl) setImage(uploaded);
      return uploaded ?? null;
    } finally {
      setIsProcessing(false);
    }
  }, [postId, token]);

  // 8) ダウンロード
  const downloadCanvas = useCallback((canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    setIsProcessing(true);
    try {
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    // state
    text, setText,
    fontSize, setFontSize,
    textBoxSize, setTextBoxSize,
    dragOffset, setDragOffset,
    image, setImage,
    isProcessing, setIsProcessing,

    // actions
    initFromPost,
    drawOnCanvas,
    bindCanvasDrag,
    uploadImage,
    downloadCanvas,
  };
}
