"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";

export default function EditImagePage() {
  const { id } = useParams();
  const { token } = useSupabaseSession();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [text, setText] = useState("好きなテキストを入力");

  const [dragOffset, setDragOffset] = useState({ x: 30, y: 200 });
  const [textBoxSize, setTextBoxSize] = useState({ width: 300, height: 400 });
  const [isProcessing, setIsProcessing] = useState(false);


  useEffect(() => {
    const fetchImageAndMemo = async () => {
      if (!token) return;
      const res = await fetch(`/api/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const post = data.post;

      setText(
        [post.caption, post.memo?.answerWhy, post.memo?.answerWhat, post.memo?.answerNext]
          .filter(Boolean)
          .join("\n\n")
      );
      setImageUrl(post.images?.[0]?.signedUrl ?? null);
    };

    fetchImageAndMemo();
  }, [id, token]);

  // 再描画処理
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

      // テキストボックスが画像外に出ないように制限
      const clampedX = Math.min(
        Math.max(0, dragOffset.x),
        newWidth - textBoxSize.width
      );
      const clampedY = Math.min(
        Math.max(0, dragOffset.y),
        newHeight - textBoxSize.height
      );

      // 背景
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(clampedX, clampedY, textBoxSize.width, textBoxSize.height);

      // テキスト
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textBaseline = "top";
      const lines = text.split("\n");

      lines.forEach((line, i) => {
        ctx.fillText(line, clampedX + 10, clampedY + 10 + i * 20);
      });

      // state更新（外に出ていたら戻す）
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
    setIsProcessing(true);
    try {
      const link = document.createElement("a");
      link.download = `post-${id}-memo.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-4 text-black bg-white">
      <h1 className="text-xl font-bold mb-4">画像編集（テキスト合成）</h1>

      <div className="mb-4 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className="border w-[300px] h-auto"
        />
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={4}
        className="w-full border p-2 rounded mb-4"
        disabled={isProcessing}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
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
            disabled={isProcessing}
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
            disabled={isProcessing}
          />
        </label>
      </div>

      <div className="text-center">
        <button
          onClick={handleDownload}
          className="bg-black text-white px-4 py-2 rounded"
          disabled={isProcessing}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
