// app/posts/[id]/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import { useImageOverlayEditor } from "@/app/hooks/useImageOverlayEditor"; 

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const postId = Number(params.id);
  const { token, session } = useSupabaseSession();
  const isGuest = session?.user?.email === "guest@example.com";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    text, setText,
    fontSize, setFontSize,
    textBoxSize, setTextBoxSize,
    dragOffset,
    image,
    isProcessing,
    initFromPost,
    drawOnCanvas,
    bindCanvasDrag,
    uploadImage,
    downloadCanvas,
  } = useImageOverlayEditor({ postId, token, isGuest });

  // 初期化（投稿取得）
  useEffect(() => {
    initFromPost();
  }, [initFromPost]);

  // キャンバス描画
  useEffect(() => {
    drawOnCanvas(canvasRef.current); // 幅300で描画（Hook内固定）
  }, [image, text, textBoxSize, dragOffset, fontSize, drawOnCanvas]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    
    await uploadImage(file, { currentImageKey: image?.imageKey ?? null });
  };

  if (isGuest) {
    return <p className="text-center mt-8 text-gray-500">お試しユーザーでは保存されません（画面上のみ反映されます）</p>;
  }

  return (
    <main className="flex flex-col items-center p-2 max-w-2xl mx-auto bg-white text-black">
      <h1 className="text-base font-semibold mb-2">投稿編集</h1>

      <div className="space-y-4 w-full flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={bindCanvasDrag}
          className="border w-[300px] h-auto"
        />

        <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
          ギャラリー / ファイル選択
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        </label>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full border p-2 rounded"
          disabled={isProcessing}
        />

        <div className="flex flex-col sm:flex-row gap-4">
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
              type="range" min={50} max={480}
              value={textBoxSize.height}
              onChange={(e) => setTextBoxSize(s => ({ ...s, height: Number(e.target.value) }))}
              disabled={isProcessing}
            />
          </label>
        </div>

        <div className="flex gap-4">
          {(["small","medium","large"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFontSize(s)}
              className={`px-4 py-2 rounded ${fontSize === s ? "bg-blue-700 text-white" : "bg-gray-200"}`}
              disabled={isProcessing}
            >
              {s === "small" ? "小" : s === "medium" ? "中" : "大"}
            </button>
          ))}
        </div>

        <button
          onClick={() => downloadCanvas(canvasRef.current, `post-${postId}-with-text.png`)}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          disabled={isProcessing}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
