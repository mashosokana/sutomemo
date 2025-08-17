// src/app/posts/[id]/edit-image/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { useImageOverlayEditor } from '@/app/hooks/useImageOverlayEditor';
import ImageFileInput from '@/app/_components/ImageFileInput';

export default function EditImagePage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { token } = useSupabaseSession(); // Authorization 用

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
  } = useImageOverlayEditor({ postId });

  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDoneMsg, setUploadDoneMsg] = useState<string | null>(null);

  
  const previewUrls = useMemo(() => selectedFiles.map(f => URL.createObjectURL(f)), [selectedFiles]);
  useEffect(() => () => previewUrls.forEach(u => URL.revokeObjectURL(u)), [previewUrls]);

  
  useEffect(() => { initFromPost(); }, [initFromPost]);
  
  useEffect(() => { drawOnCanvas(canvasRef.current); }, [text, textBoxSize, dragOffset, drawOnCanvas]);

  
  const uploadSelectedFiles = async () => {
    if (!token) {
      setUploadError('ログイン情報が取得できませんでした');
      return;
    }
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadDoneMsg(null);

    try {
      for (const file of selectedFiles) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as unknown));
          throw new Error((data as { error?: string }).error ?? `アップロードに失敗しました (HTTP ${res.status})`);
        }
      }
      setSelectedFiles([]);
      setUploadDoneMsg('画像をアップロードしました');
      await initFromPost(); // 新しい signedUrl を反映 → キャンバスへ表示
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-4 text-black bg-white">
      <h1 className="text-xl font-bold mb-4">投稿編集</h1>

      
      <div className="mb-4 flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onMouseDown={bindCanvasDrag}
          className="border w-[300px] h-auto"
        />
      </div>

      
      {previewUrls.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {previewUrls.map((src, i) => (
            <img
              key={src}
              src={src}
              alt={`選択画像 ${i + 1}`}
              className="border rounded max-w-[140px] h-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ))}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          ギャラリー / ファイル選択（HEICは自動でJPEGに変換）
        </label>
        <ImageFileInput
          onPick={setSelectedFiles}
          to="image/jpeg"
          quality={0.9}
          multiple
          disabled={isProcessing || isUploading}
          className="block"
        />
        {selectedFiles.length > 0 && (
          <p className="text-xs text-gray-600 mt-1">
            選択中：{selectedFiles.map((f) => f.name).join(', ')}
          </p>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full border p-2 rounded mb-4"
        disabled={isProcessing || isUploading}
      />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <label className="flex items-center gap-2">
          幅:
          <input
            type="range" min={100} max={260}
            value={textBoxSize.width}
            onChange={(e) => setTextBoxSize(s => ({ ...s, width: Number(e.target.value) }))}
            disabled={isProcessing || isUploading}
          />
        </label>
        <label className="flex items-center gap-2">
          高さ:
          <input
            type="range" min={50} max={500}
            value={textBoxSize.height}
            onChange={(e) => setTextBoxSize(s => ({ ...s, height: Number(e.target.value) }))}
            disabled={isProcessing || isUploading}
          />
        </label>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={uploadSelectedFiles}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={isProcessing || isUploading || selectedFiles.length === 0}
        >
          {isUploading ? 'アップロード中…' : '選択画像をアップロード'}
        </button>
        {uploadDoneMsg && <span className="text-green-700 text-sm">{uploadDoneMsg}</span>}
        {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}
      </div>

      <div className="text-center">
        <button
          onClick={() => downloadCanvas(canvasRef.current, `post-${postId}-memo.png`)}
          className="bg-black text-white px-4 py-2 rounded"
          disabled={isProcessing || isUploading}
        >
          ダウンロード
        </button>
      </div>
    </main>
  );
}
