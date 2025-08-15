//src/app/posts/[id]/edit-image/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import { useImageOverlayEditor } from "@/app/hooks/useImageOverlayEditor"; 

export default function EditImagePage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { token } = useSupabaseSession();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    text, setText,
    textBoxSize, setTextBoxSize,
    dragOffset,
    isProcessing,
    initFromPost,
    drawOnCanvas,
    bindCanvasDrag,
    downloadCanvas,
  } = useImageOverlayEditor({ postId, token });

  useEffect(() => {
    initFromPost();
  }, [initFromPost]);

  useEffect(() => {
    drawOnCanvas(canvasRef.current);
  }, [text, textBoxSize, dragOffset, drawOnCanvas]);

  return (
    <main className="max-w-md mx-auto p-4 text-black bg-white">
      <h1 className="text-xl font-bold mb-4">画像編集（テキスト合成）</h1>

      <div className="mb-4 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={bindCanvasDrag}
          className="border w-[300px] h-auto"
        />
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full border p-2 rounded mb-4"
        disabled={isProcessing}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="flex items-center gap-2">
          幅:
          <input
            type="range" min={100} max={260}
            value={textBoxSize.width}
            onChange={(e) => setTextBoxSize(s => ({ ...s, width: Number(e.target.value) }))}
            disabled={isProcessing}
          />
        </label>
        <label className="flex items-center gap-2">
          高さ:
          <input
            type="range" min={50} max={500}
            value={textBoxSize.height}
            onChange={(e) => setTextBoxSize(s => ({ ...s, height: Number(e.target.value) }))}
            disabled={isProcessing}
          />
        </label>
      </div>

      <div className="text-center">
        <button
          onClick={() => downloadCanvas(canvasRef.current, `post-${postId}-memo.png`)}
          className="bg-black text-white px-4 py-2 rounded"
          disabled={isProcessing}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
