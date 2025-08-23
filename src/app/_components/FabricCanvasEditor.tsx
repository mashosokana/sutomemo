//app/_components/FabricCanvasEditor.tsx
'use client';

import { useRef, useEffect, useState } from 'react';

type Props = {
  imageUrl: string;
  initialText: string;
};

export default function FabricCanvasEditor({ imageUrl, initialText }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState(initialText);
  const [dragOffset, setDragOffset] = useState({ x: 30, y: 200 });
  const [textBoxSize, setTextBoxSize] = useState({ width: 300, height: 400 });

  // ポインタードラッグの内部状態
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>(
    { active: false, lastX: 0, lastY: 0 }
  );

  // 画面座標(clientX/Y) → キャンバス座標への変換（CSSスケールに影響されない）
  const toCanvasXY = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) * (canvas.width / r.width);
    const y = (clientY - r.top) * (canvas.height / r.height);
    return { x, y };
  };

  // Canvas 描画
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageUrl;

    image.onload = () => {
      // 幅300pxで固定表示（必要なら可変に）
      const fixedCSSWidth = 300;

      // 高DPRでもにじまないよう、内部ピクセルを合わせる（任意）
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const scale = fixedCSSWidth / image.width;
      const cssW = fixedCSSWidth;
      const cssH = image.height * scale;
      const pixW = Math.round(cssW * dpr);
      const pixH = Math.round(cssH * dpr);

      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = pixW;
      canvas.height = pixH;

      // 描画スケール
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, cssW, cssH);
      ctx.drawImage(image, 0, 0, cssW, cssH);

      // テキストボックス位置のクランプ
      const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
      const clampedX = clamp(dragOffset.x, 0, cssW - textBoxSize.width);
      const clampedY = clamp(dragOffset.y, 0, cssH - textBoxSize.height);

      // 背景（白半透明などにしたければここを変更）
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(clampedX, clampedY, textBoxSize.width, textBoxSize.height);

      // テキスト
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#111';
      ctx.textBaseline = 'top';
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, clampedX + 10, clampedY + 10 + i * 22);
      });

      // 画面外に出たら内部状態を修正
      if (clampedX !== dragOffset.x || clampedY !== dragOffset.y) {
        setDragOffset({ x: clampedX, y: clampedY });
      }
    };
  }, [imageUrl, text, dragOffset, textBoxSize]);

  // --- Pointer Events（PC/スマホ共通） ---
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture?.(e.pointerId);

    const start = toCanvasXY(canvas, e.clientX, e.clientY);
    dragRef.current.active = true;
    dragRef.current.lastX = start.x;
    dragRef.current.lastY = start.y;

    // ← ここを明示的に型付け
    const onMove: (ev: PointerEvent) => void = (ev) => {
      if (!dragRef.current.active || !canvasRef.current) return;
      const p = toCanvasXY(canvasRef.current, ev.clientX, ev.clientY);
      const dx = p.x - dragRef.current.lastX;
      const dy = p.y - dragRef.current.lastY;

      setDragOffset((s) => ({ x: s.x + dx, y: s.y + dy }));
      dragRef.current.lastX = p.x;
      dragRef.current.lastY = p.y;

      ev.preventDefault(); // スクロールよりドラッグを優先
    };

    const onUp: (ev: PointerEvent) => void = () => {
      dragRef.current.active = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      canvas.releasePointerCapture?.(e.pointerId);
    };

    // options も正しい型なので any は不要
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup',   onUp,   { passive: true });
  };


  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'memo-image.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onContextMenu={(e) => e.preventDefault()}
        className="border w-[300px] h-auto touch-none select-none"
      />

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className="w-full border p-2 rounded"
      />

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex items-center gap-2">
          幅:
          <input
            type="range"
            min={100}
            max={300}
            value={textBoxSize.width}
            onChange={e =>
              setTextBoxSize(size => ({ ...size, width: Number(e.target.value) }))
            }
          />
        </label>
        <label className="flex items-center gap-2">
          高さ:
          <input
            type="range"
            min={50}
            max={500}
            value={textBoxSize.height}
            onChange={e =>
              setTextBoxSize(size => ({ ...size, height: Number(e.target.value) }))
            }
          />
        </label>
      </div>

      <div className="text-center">
        <button
          onClick={handleDownload}
          className="bg-black text-white px-4 py-2 rounded"
        >
          ダウンロード
        </button>
      </div>
    </div>
  );
}
