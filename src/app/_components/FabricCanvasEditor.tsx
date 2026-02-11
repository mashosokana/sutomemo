//app/_components/FabricCanvasEditor.tsx
'use client';

import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

type Props = {
  imageUrl: string;
  initialText: string;
  onTextChange?: (text: string) => void;
};

export type FabricCanvasEditorRef = {
  getCanvasBlob: () => Promise<Blob | null>;
  getText: () => string;
};

const FabricCanvasEditor = forwardRef<FabricCanvasEditorRef, Props>(
  function FabricCanvasEditor({ imageUrl, initialText, onTextChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [text, setText] = useState(initialText);
  const [dragOffset, setDragOffset] = useState({ x: 30, y: 200 });
  const [textBoxSize, setTextBoxSize] = useState({ width: 300, height: 400 });

  // initialTextが変更されたらtextを更新
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  // テキスト変更ハンドラー
  const handleTextChange = (newText: string) => {
    setText(newText);
    onTextChange?.(newText);
  };

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
      // 幅600pxで固定表示（大きく変更）
      const fixedCSSWidth = 600;

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


  // 外部から呼び出せるメソッドを公開
  useImperativeHandle(ref, () => ({
    getCanvasBlob: async () => {
      if (!canvasRef.current) return null;
      return new Promise<Blob | null>((resolve) => {
        canvasRef.current?.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      });
    },
    getText: () => text,
  }));

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'memo-image.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="w-full space-y-6">
      {/* テキスト入力エリア */}
      <div>
        <label htmlFor="memo-text" className="block font-bold text-xl mb-3">
          今日やったこと
        </label>
        <textarea
          id="memo-text"
          className="w-full border-2 border-gray-300 px-6 py-5 rounded-lg text-black bg-white placeholder:text-gray-400 min-h-64 resize-y text-lg leading-relaxed focus:border-blue-500 focus:outline-none"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="今日やったこと、学んだことを書いてください..."
        />
      </div>

      {/* Canvas編集エリア */}
      <div>
        <label className="block font-bold text-xl mb-3">
          プレビュー
        </label>
        <div className="overflow-x-auto">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onContextMenu={(e) => e.preventDefault()}
            className="border-2 border-gray-300 max-w-full h-auto touch-none select-none rounded-lg mx-auto block"
            style={{ width: '600px', maxWidth: '100%' }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="block font-bold text-xl mb-3">
          テキストボックスのサイズ調整
        </label>
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-4 mb-2">
              <span className="text-base font-medium w-16">幅:</span>
              <input
                type="range"
                min={100}
                max={600}
                value={textBoxSize.width}
                onChange={e =>
                  setTextBoxSize(size => ({ ...size, width: Number(e.target.value) }))
                }
                className="flex-1 h-3 rounded-lg appearance-none cursor-pointer bg-gray-300"
                style={{
                  accentColor: '#3b82f6',
                }}
              />
              <span className="text-base font-medium w-16 text-right">{textBoxSize.width}px</span>
            </label>
          </div>
          <div>
            <label className="flex items-center gap-4 mb-2">
              <span className="text-base font-medium w-16">高さ:</span>
              <input
                type="range"
                min={50}
                max={800}
                value={textBoxSize.height}
                onChange={e =>
                  setTextBoxSize(size => ({ ...size, height: Number(e.target.value) }))
                }
                className="flex-1 h-3 rounded-lg appearance-none cursor-pointer bg-gray-300"
                style={{
                  accentColor: '#3b82f6',
                }}
              />
              <span className="text-base font-medium w-16 text-right">{textBoxSize.height}px</span>
            </label>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={handleDownload}
          className="bg-gray-700 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition"
        >
          画像をダウンロード
        </button>
      </div>
    </div>
  );
});

export default FabricCanvasEditor;
