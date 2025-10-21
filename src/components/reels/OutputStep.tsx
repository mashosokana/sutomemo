// src/components/reels/OutputStep.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TextData } from './TextStep';
import { renderReelVideo, createTextBlocks, type RenderResult } from '@/lib/reels/videoRenderer';
import { convertIfHeic } from '@/lib/convertHeic';
import { supabase } from '@/lib/supabase';

interface OutputStepProps {
  file: File;
  duration: 15;  // 15秒固定
  textData: TextData;
  postLocalId: string;
  onBack: () => void;
}

/**
 * Step3: 出力コンポーネント
 * 動画プレビュー、動画保存、キャプションコピー
 */
export default function OutputStep({ file, duration, textData, postLocalId, onBack }: OutputStepProps) {
  const [isRendering, setIsRendering] = useState(false);
  const [videoResult, setVideoResult] = useState<RenderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    return () => {
      if (videoResult) {
        URL.revokeObjectURL(videoResult.url);
      }
    };
  }, [videoResult]);

  const caption = `${textData.hookText}

${textData.problem}

${textData.evidence}

${textData.action}

${textData.tags.join(' ')}

#SutoMemo`;

  const handleRender = async () => {
    setIsRendering(true);
    setIsConverting(true);
    setError(null);
    setProgress(0);

    try {
      // HEIC画像をJPEGに変換
      const convertedFile = await convertIfHeic(file);
      setIsConverting(false);

      // テキストブロック作成
      const textBlocks = createTextBlocks(
        textData.hookText,
        textData.problem,
        textData.evidence,
        textData.action
      );

      // ブラウザでCanvas動画レンダリング
      const result = await renderReelVideo({
        imageFile: convertedFile,
        textBlocks,
        duration,
        onProgress: (p) => setProgress(p),
      });

      setVideoResult(result);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const saveRes = await fetch('/api/reels/outputs', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              postLocalId,
              caption,
              hook: textData.hookText,
              problem: textData.problem,
              evidence: textData.evidence,
              action: textData.action,
              hashtags: textData.tags,
            }),
          });
          if (!saveRes.ok) {
            const message = await saveRes.text().catch(() => '');
            console.warn('Reel output save failed:', message || saveRes.statusText);
          }
        }
      } catch (persistErr) {
        console.error('Reel output save error:', persistErr);
      }
    } catch (err) {
      console.error('Rendering error:', err);
      setError(err instanceof Error ? err.message : '動画生成に失敗しました');
    } finally {
      setIsRendering(false);
      setIsConverting(false);
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!videoResult) return;

    const ext = mimeTypeToExtension(videoResult.mimeType);

    const a = document.createElement('a');
    a.href = videoResult.url;
    a.download = `reel_${postLocalId}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(caption).then(
      () => alert('キャプションをコピーしました'),
      () => alert('コピーに失敗しました')
    );
  };

  const handleCopyPostId = () => {
    navigator.clipboard.writeText(postLocalId).then(
      () => alert('投稿IDをコピーしました'),
      () => alert('コピーに失敗しました')
    );
  };

  const logUrl = `/reels/log?postLocalId=${encodeURIComponent(postLocalId)}`;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-black">Step 3: 出力</h2>

      <div className="border border-gray-300 rounded p-4 bg-gray-50">
        <p className="text-sm font-bold text-black mb-2">プレビュー:</p>
        {videoResult ? (
          <video
            src={videoResult.url}
            controls
            className="w-full max-w-sm mx-auto border border-gray-300 rounded"
            style={{ aspectRatio: '9/16' }}
            aria-label="生成された動画プレビュー"
          />
        ) : (
          <div
            className="w-full max-w-sm mx-auto bg-black text-white flex flex-col items-center justify-center border border-gray-300 rounded"
            style={{ aspectRatio: '9/16' }}
          >
            <p className="text-center p-4">
              {isConverting
                ? 'HEIC画像を変換中...'
                : isRendering
                  ? `レンダリング中... ${progress}%`
                  : '「動画を生成」ボタンを押してください'}
            </p>
            {isRendering && !isConverting && (
              <div className="w-3/4 bg-gray-700 rounded h-2 mt-2">
                <div
                  className="bg-white h-2 rounded transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="border border-gray-300 rounded p-4 bg-white">
        <p className="text-sm font-bold text-black mb-2">キャプション:</p>
        <pre className="text-xs text-black whitespace-pre-wrap break-words bg-gray-50 p-3 rounded border border-gray-200">
          {caption}
        </pre>
      </div>

      <div className="border border-gray-300 rounded p-4 bg-gray-50 space-y-3">
        <div>
          <p className="text-sm font-bold text-black mb-2">投稿ID（効果測定用）</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <code className="px-3 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 break-all">
              {postLocalId}
            </code>
            <button
              onClick={handleCopyPostId}
              className="inline-flex items-center justify-center bg-black text-white text-xs font-bold rounded px-3 py-2 hover:bg-gray-900"
            >
              IDをコピー
            </button>
          </div>
        </div>
        <Link
          href={logUrl}
          className="block text-center bg-white border border-gray-300 text-gray-900 text-sm font-bold rounded px-4 py-2 hover:bg-gray-100"
        >
          効果測定を記録する
        </Link>
      </div>

      <div className="space-y-3">
        {!videoResult && (
          <button
            onClick={handleRender}
            disabled={isRendering}
            className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50"
            aria-label="動画を生成"
          >
            {isRendering ? '生成中...' : '動画を生成'}
          </button>
        )}

        {videoResult && (
          <>
            <button
              onClick={handleDownload}
              className="w-full bg-black text-white py-3 rounded font-bold"
              aria-label="動画を保存"
            >
              動画を保存
            </button>
            <button
              onClick={handleCopyCaption}
              className="w-full border border-black text-black py-3 rounded font-bold"
              aria-label="キャプションをコピー"
            >
              キャプションをコピー
            </button>
          </>
        )}

        <button
          onClick={onBack}
          className="w-full border border-gray-300 text-black py-3 rounded font-bold"
          aria-label="前のステップに戻る"
        >
          戻る
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          生成後は /reels/log で効果測定を記録できます
        </p>
      </div>
    </div>
  );
}

function mimeTypeToExtension(mimeType: string): string {
  if (/mp4/i.test(mimeType)) return 'mp4';
  if (/webm/i.test(mimeType)) return 'webm';
  const parts = mimeType.split('/');
  const fallback = parts[1]?.split(';')[0] ?? 'webm';
  return fallback;
}
