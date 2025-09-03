'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { useAuthMe } from '@/app/hooks/useAuthMe';
import { useImageOverlayEditor } from '@/app/hooks/useImageOverlayEditor';
import ImageFileInput from '@/app/_components/ImageFileInput';
import MemberGateButton from '@/app/_components/MemberGateButton';
import WatermarkOverlay from '@/app/_components/WatermarkOverlay';
import BlurredTextPreview from '@/app/_components/BlurredTextPreview';
import TrialNotice from '@/app/_components/TrialNotice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faThreads } from '@fortawesome/free-brands-svg-icons';
import { authedFetch } from '@/lib/authedFetch';

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

// 最初の1枚だけ採用
function pickFirstImageUrl(post: ApiPost | null): string | null {
  if (!post) return null;
  const first = (post.images ?? []).find(img => typeof img.signedUrl === 'string' && img.signedUrl);
  return first?.signedUrl ?? null;
}

export default function PostDetailPage() {
  // ---- Hooks（順序固定・無条件）----
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTrial = searchParams.has('trial'); // 体験モード

  const { token, isLoading: tokenLoading } = useSupabaseSession();
  const { data: me, loading: meLoading } = useAuthMe();

  // 体験 or 非ログイン はゲストUI（ぼかし等）扱い
  const isGuest = isTrial || !token;
  // シェア許可の厳密判定：
  // - 体験モードでない
  // - me のロード完了
  // - me.isGuest が false（会員）
  // これにより、判定不能（me 未取得/エラー）時はシェア不可に倒す
  const canShare = !isTrial && !meLoading && me?.isGuest === false;

  const userEditedRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastLoadedUrlRef = useRef<string | null>(null);

  const {
    text, setText,
    textBoxSize, setTextBoxSize,
    dragOffset,
    isProcessing,
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

  // ★ shareDisabled は処理状態のみで制御（会員判定は canShare ブランチで分岐）
  const shareDisabled = isProcessing || isUploading;

  // 共有URL
  const xShareUrl = useMemo(() => {
    const t = (text ?? '').slice(0, 280);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${t}\n\n${url}` : t;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(combined)}`;
  }, [text]);
  const threadsShareUrl = useMemo(() => {
    const t = (text ?? '').slice(0, 500);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${t}\n\n${url}` : t;
    const params = new URLSearchParams({ text: combined });
    return `https://www.threads.net/intent/post?${params.toString()}`;
  }, [text]);

  // 非トライアル時のみ：未ログインは /login へ
  useEffect(() => {
    if (isTrial) return;
    if (tokenLoading) return;
    if (token === null) {
      const next = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : `/posts/${postId}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [isTrial, tokenLoading, token, router, postId]);

  // 通常読み込み：ログイン時のみ投稿＆最初の1枚を取得
  useEffect(() => {
    if (!token || !postId || isTrial) return;
    (async () => {
      try {
        const res = await authedFetch(`/api/posts/${postId}`, token, { cache: 'no-store' });
        if (!res.ok) return;
        const json: unknown = await res.json().catch(() => null);
        const post = parsePost(json);

        if (post && !userEditedRef.current) {
          setText(buildEditorSeed(post));
        }

        const url = pickFirstImageUrl(post);
        if (!url || url === lastLoadedUrlRef.current) return;
        const r = await fetch(url);
        if (!r.ok) return;
        const blob = await r.blob();
        const file = new File([blob], `post-${postId}-first.jpg`, { type: blob.type || 'image/jpeg' });
        void previewLocalFile(file);
        lastLoadedUrlRef.current = url;
      } catch {}
    })();
  }, [token, postId, isTrial, setText, previewLocalFile]);

  // 体験：AIメモを sessionStorage から反映
  useEffect(() => {
    if (!isTrial) return;
    try {
      const raw = sessionStorage.getItem('guestDraft');
      if (!raw) return;
      const draft = JSON.parse(raw) as GuestDraft;
      const seed = buildSeedFromDraft(draft);
      if (seed.trim() !== '') {
        userEditedRef.current = true;
        setText(seed);
      }
    } catch {}
  }, [isTrial, setText]);

  // キャンバス再描画
  useEffect(() => {
    if (!canvasRef.current) return;
    void drawOnCanvas(canvasRef.current);
  }, [text, textBoxSize, dragOffset, fontSize, drawOnCanvas]);

  // 表示許可：トライアルは常にOK / 通常はログイン時のみ
  const canUsePage = isTrial || (!tokenLoading && !!token);
  if (!canUsePage) return null;

  // 画像：サーバ保存後も「最初の1枚だけ」で再反映
  const reloadFirstImage = async () => {
    if (!token || isTrial) return;
    try {
      const res = await authedFetch(`/api/posts/${postId}`, token, { cache: 'no-store' });
      if (!res.ok) return;
      const post = parsePost(await res.json().catch(() => null));
      const url = pickFirstImageUrl(post);
      if (!url || url === lastLoadedUrlRef.current) return;
      const r = await fetch(url);
      if (!r.ok) return;
      const blob = await r.blob();
      const file = new File([blob], `post-${postId}-first.jpg`, { type: blob.type || 'image/jpeg' });
      void previewLocalFile(file);
      lastLoadedUrlRef.current = url;
    } catch {}
  };

  const uploadFiles = async (files: File[]): Promise<void> => {
    if (files.length === 0) return;

    if (isTrial) {
      if (files[0]) void previewLocalFile(files[0]);
      setUploadError('画像のサーバ保存は会員限定です。登録すると保存できます。');
      return;
    }

    if (!token) {
      setUploadError('ログイン情報が取得できませんでした');
      return;
    }

    for (const file of files) void previewLocalFile(file);

    setIsUploading(true);
    setUploadError(null);
    setUploadDoneMsg(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await authedFetch(`/api/posts/${postId}/images`, token, { method: 'POST', body: fd });
        if (!res.ok) {
          const data: unknown = await res.json().catch(() => ({}));
          const msg = (data as { error?: string }).error ?? `アップロードに失敗しました (HTTP ${res.status})`;
          throw new Error(msg);
        }
      }
      setUploadDoneMsg('画像をアップロードしました');
      await reloadFirstImage();
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
        <WatermarkOverlay>
          <canvas
            ref={canvasRef}
            onPointerDown={bindCanvasDrag}
            onContextMenu={(e) => e.preventDefault()}
            className="border border-black w-[300px] h-auto touch-none select-none"
          />
        </WatermarkOverlay>

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

          {isTrial && <TrialNotice className="w-full mt-2" />}

          {isUploading && <p className="text-xs text-blue-600">アップロード中…</p>}
          {uploadDoneMsg && <span className="text-green-700 text-sm">{uploadDoneMsg}</span>}
          {uploadError && <span className="text-red-600 text-sm">{uploadError}</span>}
        </div>

        {/* ゲストはテキストぼかし */}
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

        {/* ▼ シェア（会員のみ有効。その他はサインアップ誘導） */}
        {!canShare ? (
          <>
            <button
              onClick={() => router.push('/signup')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded opacity-70 cursor-not-allowed"
              aria-disabled
            >
              Xでシェア
            </button>
            <button
              onClick={() => router.push('/signup')}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded opacity-70 cursor-not-allowed"
              aria-disabled
            >
              Threadsでシェア
            </button>
          </>
        ) : (
          <>
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (shareDisabled) { e.preventDefault(); }
              }}
              className={`flex items-center gap-2 px-4 py-2 bg-black text-white rounded hover:opacity-80 transition ${
                shareDisabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <FontAwesomeIcon icon={faXTwitter} />
              Xでシェア
            </a>

            <a
              href={threadsShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (shareDisabled) { e.preventDefault(); }
              }}
              className={`flex items-center gap-2 px-4 py-2 bg-[#2C2C2C] text-white rounded hover:opacity-80 transition ${
                shareDisabled ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <FontAwesomeIcon icon={faThreads} />
              Threadsでシェア
            </a>
          </>
        )}
      </div>

      <div className="fixed left-0 right-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 w-screen bottom-0">
        <div
          className="
            mx-auto w-full max-w-[min(100vw,420px)]
            px-2 py-2 grid gap-2 items-center
            grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4
          "
        >
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
