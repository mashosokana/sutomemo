'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { useImageOverlayEditor } from '@/app/hooks/useImageOverlayEditor';
import ImageFileInput from '@/app/_components/ImageFileInput';
import { useAuthMe } from '@/app/hooks/useAuthMe';
import MemberGateButton from '@/app/_components/MemberGateButton';
import WatermarkOverlay from '@/app/_components/WatermarkOverlay';
import BlurredTextPreview from '@/app/_components/BlurredTextPreview';
import TrialNotice from '@/app/_components/TrialNotice';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXTwitter, faThreads } from "@fortawesome/free-brands-svg-icons";

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
  return typeof post.caption === 'string' ? post.caption : '';
}

type GuestDraft = { caption: string };

function buildSeedFromDraft(d: GuestDraft): string {
  return typeof d.caption === 'string' ? d.caption : '';
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { token } = useSupabaseSession();
  const { data: me } = useAuthMe();
  const isGuest = me?.isGuest ?? false;

  const searchParams = useSearchParams();
  const isTrial = searchParams.has('trial');
  const router = useRouter();

  const userEditedRef = useRef(false);

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

  // 既存: X用
  const xShareUrl = useMemo(() => {
    const t = (text ?? '').slice(0, 280);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${t}\n\n${url}` : t;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(combined)}`;
  }, [text]);

  // 新規: Threads用（公式の intent エンドポイント）
  const threadsShareUrl = useMemo(() => {
    const t = (text ?? '').slice(0, 500); // Threadsは長めでもOK。保守的に500字に丸め
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${t}\n\n${url}` : t;
    const params = new URLSearchParams({ text: combined });
    return `https://www.threads.net/intent/post?${params.toString()}`;
  }, [text]);


  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadDoneMsg, setUploadDoneMsg] = useState<string | null>(null);
  const [kbOffset, setKbOffset] = useState(0);

  // キーボード検知
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

  useEffect(() => {
    if (!isTrial && postId > 0) {
      void initFromPost();
    }
  }, [initFromPost, isTrial, postId]);

  // DBから初期反映
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
        // silent
      }
    })();
  }, [token, postId, setText]);

  // ゲスト trial は sessionStorage を優先
  useEffect(() => {
    if (!isGuest || !isTrial) return;
    try {
      const raw = sessionStorage.getItem('guestDraft');
      if (!raw) return;
      const draft = JSON.parse(raw) as GuestDraft;
      const seed = buildSeedFromDraft(draft);
      if (seed.trim() !== '') {
        userEditedRef.current = true;
        setText(seed);
      }
    } catch {
      // silent
    }
  }, [isGuest, isTrial, setText]);

  useEffect(() => {
    void drawOnCanvas(canvasRef.current);
  }, [text, textBoxSize, dragOffset, fontSize, drawOnCanvas]);

  // 画像アップロード
  const uploadFiles = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;
    for (const file of files) {
      void previewLocalFile(file);
    }
    if (isGuest) {
      setUploadError('画像のサーバ保存は会員限定です。登録すると保存できます。');
      return;
    }
    if (!token) {
      setUploadError('ログイン情報が取得できませんでした');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadDoneMsg(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!res.ok) {
          const data: unknown = await res.json().catch(() => ({}));
          const msg = (data as { error?: string }).error ?? `アップロードに失敗しました (HTTP ${res.status})`;
          throw new Error(msg);
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
    <main className="flex flex-col items-center p-2 max-w-2xl mx-auto bg-white text-black pb-40 sm:pb-32">
      <h1 className="text-base font-semibold mb-3">投稿詳細</h1>

      <div className="space-y-4 w-full flex flex-col items-center">
        {/* キャンバス */}
        <WatermarkOverlay>
          <canvas
            ref={canvasRef}
            onPointerDown={bindCanvasDrag}
            onContextMenu={(e) => e.preventDefault()}
            className="border border-black w-[300px] h-auto touch-none select-none"
          />
        </WatermarkOverlay>

        {/* 画像選択 */}
        <div className="w-full flex flex-col items-center gap-2">
          <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
            ギャラリー / ファイル選択
            <ImageFileInput
              onPick={uploadFiles}
              to="image/jpeg"
              quality={0.9}
              multiple
              disabled={isProcessing || isUploading}
              className="hidden"
            />
          </label>

          {isGuest && (
            <p className="text-xs text-gray-600 mt-1">
              ※ ゲストは画像のサーバ保存とダウンロードができません。登録すると解放されます。
            </p>
          )}

          {isGuest && isTrial && <TrialNotice className="w-full mt-2" />}

          {isUploading && <p className="text-xs text-blue-600">アップロード中…</p>}
          {uploadDoneMsg && <span className="text-green-700 text-sm">{uploadDoneMsg}</span>}
          {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}
        </div>

        {/* テキスト（ゲストはぼかし） */}
        {isGuest ? (
          <div className="w-full border rounded p-3">
            <h3 className="font-semibold mb-2 text-sm">プレビュー</h3>
            <BlurredTextPreview
              text={text}
              limit={500}
              onUnlock={() => router.push('/signup')}
            />
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => { userEditedRef.current = true; setText(e.target.value); }}
            rows={10}
            className="w-full border p-2 rounded min-h-[180px] max-h-[60vh] overflow-auto resize-y"
            disabled={isProcessing || isUploading}
            placeholder="作成時の caption がここに入ります。自由に編集できます。"
          />
        )}

        {/* Xでシェア */}
        <a
          href={xShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:opacity-80 transition"
        >
          <FontAwesomeIcon icon={faXTwitter} />
          Xでシェア
        </a>

        {/* Threadsでシェア */}
        <a
          href={threadsShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded hover:opacity-80 transition"
        >
          <FontAwesomeIcon icon={faThreads} />
          Threadsでシェア
        </a>

      </div>

      {/* 固定フッター */}
      <div
        className="fixed left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 w-screen"
        style={{ bottom: `calc(${kbOffset}px + env(safe-area-inset-bottom))` }}
      >
        <div
          className="
            mx-auto w-full max-w-[min(100vw,420px)]
            px-2 py-2 grid gap-2 items-center
            grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4
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

          {/* ダウンロード（会員のみ） */}
          <MemberGateButton
            onAllow={() => downloadCanvas(canvasRef.current, `post-${postId}-with-text.png`)}
            labelMember="ダウンロード"
            labelGuest="新規登録はこちら"
            className="w-full text-sm bg-black text-white px-2 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            disabled={isProcessing || isUploading}
          />
        </div>
      </div>
    </main>
  );
}
