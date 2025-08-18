// src/app/posts/[id]/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { useImageOverlayEditor } from '@/app/hooks/useImageOverlayEditor';
import ImageFileInput from '@/app/_components/ImageFileInput';

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { token, session } = useSupabaseSession();
  const isGuest =
    (session?.user?.email ?? '').trim().toLowerCase() ===
    (process.env.NEXT_PUBLIC_GUEST_USER_EMAIL ?? 'guest@example.com').trim().toLowerCase();

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
    previewLocalFile,
    fontSize,
    setFontSize,
  } = useImageOverlayEditor({ postId });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDoneMsg, setUploadDoneMsg] = useState<string | null>(null);

  useEffect(() => { initFromPost(); }, [initFromPost]);
  useEffect(() => { void drawOnCanvas(canvasRef.current); }, [text, textBoxSize, dragOffset, fontSize, drawOnCanvas]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    if (isGuest) { setUploadError('お試しユーザーはアップロードできません'); return; }
    if (!token) { setUploadError('ログイン情報が取得できませんでした'); return; }

    setIsUploading(true);
    setUploadError(null);
    setUploadDoneMsg(null);

    try {
      for (const file of files) {
        void previewLocalFile(file);

        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? `アップロードに失敗しました (HTTP ${res.status})`);
        }
      }
      setUploadDoneMsg('画像をアップロードしました');
      await initFromPost();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex flex-col items-center p-2 max-w-2xl mx-auto bg-white text-black">
      <h1 className="text-base font-semibold mb-2">投稿編集</h1>

      <div className="space-y-4 w-full flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={bindCanvasDrag}
          className="border border-black w-[300px] h-auto"
        />

        <div className="w-full flex flex-col items-center gap-2">
          <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
            ギャラリー / ファイル選択
            <ImageFileInput
              onPick={uploadFiles}
              to="image/jpeg"
              quality={0.9}
              multiple
              disabled={isProcessing || isUploading || isGuest}
              className="hidden"
            />
          </label>
          {isUploading && <p className="text-xs text-blue-600">アップロード中…</p>}
          {uploadDoneMsg && <span className="text-green-700 text-sm">{uploadDoneMsg}</span>}
          {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full border p-2 rounded"
          disabled={isProcessing || isUploading}
          placeholder="ここにテキストを入力（caption/memo を自動復元）"
        />

        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <label className="flex items-center gap-2">
            幅:
            <input
              type="range" min={100} max={260}
              value={textBoxSize.width}
              onChange={(e) => setTextBoxSize(s => ({ ...s, width: Number(e.target.value) }))}
              disabled={isProcessing || isUploading}
              className="w-full"
            />
          </label>

          <label className="flex items-center gap-2">
            高さ:
            <input
              type="range" min={50} max={480}
              value={textBoxSize.height}
              onChange={(e) => setTextBoxSize(s => ({ ...s, height: Number(e.target.value) }))}
              disabled={isProcessing || isUploading}
              className="w-full"
            />
          </label>

          <label className="flex items-center gap-2">
            文字サイズ:
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              disabled={isProcessing || isUploading}
              className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
            >
              {Array.from({ length: 18 - 9 + 1 }, (_, i) => 9 + i).map((n) => (
                <option key={n} value={n}>{n}px</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={() => downloadCanvas(canvasRef.current, `post-${postId}-with-text.png`)}
          className="bg-black text-white px-6 py-2 rounded hover:bg-gray-800"
          disabled={isProcessing || isUploading}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}

