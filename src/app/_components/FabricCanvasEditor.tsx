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

  // Canvas 描画
  useEffect(() => {
    if (!canvasRef.current || !imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;

    image.onload = () => {
      const fixedWidth = 300;
      const scale = fixedWidth / image.width;
      const newWidth = fixedWidth;
      const newHeight = image.height * scale;

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.clearRect(0, 0, newWidth, newHeight);
      ctx.drawImage(image, 0, 0, newWidth, newHeight);

      const clampedX = Math.min(Math.max(0, dragOffset.x), newWidth - textBoxSize.width);
      const clampedY = Math.min(Math.max(0, dragOffset.y), newHeight - textBoxSize.height);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(clampedX, clampedY, textBoxSize.width, textBoxSize.height);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        ctx.fillText(line, clampedX + 10, clampedY + 10 + i * 20);
      });

      if (clampedX !== dragOffset.x || clampedY !== dragOffset.y) {
        setDragOffset({ x: clampedX, y: clampedY });
      }
    };
  }, [imageUrl, text, dragOffset, textBoxSize]);

  // ドラッグ操作
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const startX = e.nativeEvent.offsetX;
    const startY = e.nativeEvent.offsetY;
    const initialX = dragOffset.x;
    const initialY = dragOffset.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.offsetX - startX;
      const dy = moveEvent.offsetY - startY;

      setDragOffset({
        x: initialX + dx,
        y: initialY + dy,
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "memo-image.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        className="border w-[300px] h-auto"
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