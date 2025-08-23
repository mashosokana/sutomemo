'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { useImageOverlayEditor } from '@/app/hooks/useImageOverlayEditor';
import ImageFileInput from '@/app/_components/ImageFileInput';


type ApiMemo = { answerWhy?: string | null; answerWhat?: string | null; answerNext?: string | null };
type ApiImage = { id: number; imageKey: string; signedUrl?: string };
type ApiPost  = { id: number; caption: string; memo?: ApiMemo | null; images?: ApiImage[] };

function parsePost(resp: unknown): ApiPost | null {
  if (!resp || typeof resp !== 'object') return null;
  const root = resp as Record<string, unknown>;
  const p = (root.post && typeof root.post === 'object' ? root.post : root) as Record<string, unknown>;
  const id = typeof p.id === 'number' ? p.id : null;
  const caption = typeof p.caption === 'string' ? p.caption : '';
  const memo = (p.memo && typeof p.memo === 'object') ? (p.memo as ApiMemo) : null;
  const images = Array.isArray(p.images) ? (p.images as ApiImage[]) : [];
  return id ? { id, caption, memo, images } : null;
}


function buildEditorSeed(post: ApiPost): string {
  const parts: string[] = [];
  const push = (v?: string | null) => { if (typeof v === 'string' && v.trim() !== '') parts.push(v.trim()); };
  push(post.caption);
  push(post.memo?.answerWhy ?? null);
  push(post.memo?.answerWhat ?? null);
  push(post.memo?.answerNext ?? null);
  return parts.join('\n'); // 行間を空けたいなら '\n\n'
}

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
  const [kbOffset, setKbOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const hidden = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKbOffset(hidden);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  
  useEffect(() => { initFromPost(); }, [initFromPost]);

  
  useEffect(() => {
    if (!token || !postId) return;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json: unknown = await res.json().catch(() => null);
        const post = parsePost(json);
        if (!post) return;

        
        if (!userEditedRef.current) {
          setText(buildEditorSeed(post));
        }
      } catch {
       
      }
    })();
  }, [token, postId, text, setText]);

  
  useEffect(() => {
    void drawOnCanvas(canvasRef.current);
  }, [text, textBoxSize, dragOffset, fontSize, drawOnCanvas]);

  
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

  const userEditedRef = useRef(false);

  return (
    <main className="flex flex-col items-center p-2 max-w-2xl mx-auto bg-white text-black pb-40 sm:pb-32">
      <h1 className="text-base font-semibold mb-3">投稿詳細</h1>

  
      <div className="space-y-4 w-full flex flex-col items-center">
        <canvas
          ref={canvasRef}
          onPointerDown={bindCanvasDrag}
          onContextMenu={(e) => e.preventDefault()}
          className="border border-black w-[300px] h-auto touch-none select-none"
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
          onChange={(e) => { userEditedRef.current = true; setText(e.target.value); }}
          rows={10}
          className="w-full border p-2 rounded min-h-[180px] max-h=[60vh] overflow-auto resize-y"
          disabled={isProcessing || isUploading}
          placeholder="作成時の caption / Why / What / Next がここにまとまって入ります。自由に編集できます。"
        /> 
      </div>
      <div
        className="fixed left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 w-screen"
        style={{ bottom: `calc(${kbOffset}px + env(safe-area-inset-bottom))` }}
      >
        <div
          className="
            mx-auto w-full
            max-w-[min(100vw,420px)]   /* 端末幅を超えない上限 */
            px-2 py-2
            grid gap-2 items-center
            grid-cols-1                 /* 超狭い端末は1列 */
            min-[380px]:grid-cols-2     /* 380px以上で2列 */
            sm:grid-cols-4              /* 640px以上で4列 */
          "
        >
          {/* 幅 */}
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs">幅</span>
            <input
              type="range" min={100} max={260}
              value={textBoxSize.width}
              onChange={(e) => setTextBoxSize(s => ({ ...s, width: Number(e.target.value) }))}
              disabled={isProcessing || isUploading}
              className="w-full"
            />
          </label>

          {/* 高さ */}
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs">高さ</span>
            <input
              type="range" min={50} max={480}
              value={textBoxSize.height}
              onChange={(e) => setTextBoxSize(s => ({ ...s, height: Number(e.target.value) }))}
              disabled={isProcessing || isUploading}
              className="w-full"
            />
          </label>

          {/* 文字サイズ */}
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-xs">サイズ</span>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              disabled={isProcessing || isUploading}
              className="w-full text-sm border rounded px-2 py-1"
            >
              {Array.from({ length: 10 }, (_, i) => 9 + i).map((n) => (
                <option key={n} value={n}>{n}px</option>
              ))}
            </select>
          </label>

          {/* ダウンロード */}
          <button
            onClick={() => downloadCanvas(canvasRef.current, `post-${postId}-with-text.png`)}
            className="w-full text-sm bg-black text-white px-2 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            disabled={isProcessing || isUploading}
          >
            ダウンロード
          </button>
        </div>
      </div>

    </main>
  );
}
