'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import FabricCanvasEditor, { FabricCanvasEditorRef } from '@/app/_components/FabricCanvasEditor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faThreads } from '@fortawesome/free-brands-svg-icons';

type ApiMemo = { answerWhy?: string | null; answerWhat?: string | null; answerNext?: string | null };
type ApiImage = { id: number; imageKey: string; signedUrl?: string };
type ApiPost = { id: number; caption: string; memo?: ApiMemo | null; images?: ApiImage[] };

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

function pickFirstImageUrl(post: ApiPost | null): string | null {
  if (!post) return null;
  const first = (post.images ?? []).find(img => typeof img.signedUrl === 'string' && img.signedUrl);
  return first?.signedUrl ?? null;
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const router = useRouter();

  const { token, isLoading: tokenLoading } = useSupabaseSession();
  const canvasRef = useRef<FabricCanvasEditorRef>(null);

  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ログインチェック
  useEffect(() => {
    if (tokenLoading) return;
    if (!token) {
      router.replace('/login');
    }
  }, [tokenLoading, token, router]);

  // 投稿データ取得
  useEffect(() => {
    if (!token || !postId) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error('投稿の取得に失敗しました');
        }

        const json = await res.json();
        const post = parsePost(json);

        if (post) {
          setCaption(post.caption || '');
          const url = pickFirstImageUrl(post);
          setImageUrl(url);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [token, postId]);

  // 新しい画像のアップロード
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const localUrl = URL.createObjectURL(file);
      setNewImageUrl(localUrl);
      setNewImageFile(file);
    } catch (error) {
      console.error('Image upload error:', error);
      alert('画像のアップロードに失敗しました');
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!caption.trim()) {
      alert('テキストを入力してください');
      return;
    }

    if (!token) {
      alert('認証エラーが発生しました');
      return;
    }

    setIsSaving(true);
    try {
      // 1. テキストを更新
      const updateRes = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: caption,
        }),
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(errorData.error || 'テキストの更新に失敗しました');
      }

      // 2. 新しい画像がある場合はアップロード
      if (newImageUrl && canvasRef.current) {
        const blob = await canvasRef.current.getCanvasBlob();
        if (!blob) {
          throw new Error('画像の生成に失敗しました');
        }

        const file = new File([blob], `memo-${Date.now()}.png`, {
          type: 'image/png',
        });

        const formData = new FormData();
        formData.append('file', file);

        const imageRes = await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!imageRes.ok) {
          const errorData = await imageRes.json();
          throw new Error(errorData.error || '画像のアップロードに失敗しました');
        }

        // 新しい画像URLを取得
        const res = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          const post = parsePost(json);
          if (post) {
            const url = pickFirstImageUrl(post);
            setImageUrl(url);
          }
        }
      }

      alert('更新しました！');
      setIsEditMode(false);
      setNewImageUrl(null);
      setNewImageFile(null);
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : '更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `post-${postId}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleShare = (platform: 'x' | 'threads') => {
    const text = caption.slice(0, platform === 'x' ? 280 : 500);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${text}\n\n${url}` : text;

    if (platform === 'x') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(combined)}`,
        '_blank'
      );
    } else {
      const params = new URLSearchParams({ text: combined });
      window.open(
        `https://www.threads.net/intent/post?${params.toString()}`,
        '_blank'
      );
    }
  };

  if (tokenLoading || isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6 bg-white min-h-screen">
        <p className="text-center py-8">読み込み中...</p>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-6 bg-white min-h-screen">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          {isEditMode ? '投稿編集' : '投稿詳細'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode
            ? 'テキストと画像を編集できます'
            : '画像をダウンロード・共有できます'}
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-8">
        {/* テキスト表示・編集 */}
        <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
          <label htmlFor="caption" className="block font-bold mb-4 text-xl">
            投稿テキスト
          </label>
          {isEditMode ? (
            <textarea
              id="caption"
              className="w-full border-2 border-gray-300 px-6 py-5 rounded-lg text-black bg-white placeholder:text-gray-400 min-h-64 resize-y text-lg leading-relaxed focus:border-blue-500 focus:outline-none"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="投稿のテキストを編集..."
            />
          ) : (
            <div className="w-full border-2 border-gray-300 px-6 py-5 rounded-lg text-black bg-gray-50 min-h-64 text-lg leading-relaxed whitespace-pre-wrap">
              {caption}
            </div>
          )}
        </div>

        {/* 編集モード: 新しい画像の編集エリア */}
        {isEditMode && newImageUrl && (
          <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
            <h2 className="font-bold mb-3 text-2xl">新しい画像のプレビュー</h2>
            <p className="text-gray-600 mb-6 text-base">
              白いボックスをドラッグして位置を調整し、スライダーでサイズを変更できます。
            </p>
            <FabricCanvasEditor
              ref={canvasRef}
              imageUrl={newImageUrl}
              initialText={caption}
              onTextChange={setCaption}
            />
          </div>
        )}

        {/* 既存画像の表示（編集モードで新しい画像がない場合、または通常モード） */}
        {!newImageUrl && imageUrl && (
          <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
            <h2 className="font-bold mb-6 text-2xl">{isEditMode ? '現在の画像' : '画像'}</h2>
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt="投稿画像"
                className="max-w-full h-auto rounded-lg border-2 border-gray-200"
                style={{ maxHeight: '800px' }}
              />
            </div>
          </div>
        )}

        {/* 編集モード: 画像アップロード */}
        {isEditMode && (
          <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
            <label className="block font-bold mb-4 text-xl">新しい画像（オプション）</label>
            <p className="text-gray-600 mb-4 text-base">
              新しい画像をアップロードして、テキストを配置し直すことができます
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-base text-gray-900 border-2 border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-4 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-base file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        )}

        {/* アクションボタン */}
        <div className="bg-white rounded-lg p-8 border-2 border-gray-300">
          <h2 className="font-bold mb-6 text-xl">アクション</h2>
          <div className="space-y-4">
            {isEditMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-5 rounded-lg font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSaving ? '保存中...' : '変更を保存'}
                </button>
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setNewImageUrl(null);
                    setNewImageFile(null);
                  }}
                  className="w-full bg-gray-200 text-gray-800 py-5 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="w-full bg-blue-600 text-white py-5 rounded-lg font-bold text-lg hover:bg-blue-700 transition"
                >
                  編集する
                </button>

                <button
                  onClick={handleDownload}
                  disabled={!imageUrl}
                  className="w-full bg-black text-white py-5 rounded-lg font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  画像をダウンロード
                </button>

                <button
                  onClick={() => handleShare('x')}
                  className="w-full flex items-center justify-center gap-3 bg-black text-white py-5 rounded-lg font-bold text-lg hover:bg-gray-800 transition"
                >
                  <FontAwesomeIcon icon={faXTwitter} className="text-2xl" />
                  Xでシェア
                </button>

                <button
                  onClick={() => handleShare('threads')}
                  className="w-full flex items-center justify-center gap-3 bg-[#2C2C2C] text-white py-5 rounded-lg font-bold text-lg hover:bg-gray-600 transition"
                >
                  <FontAwesomeIcon icon={faThreads} className="text-2xl" />
                  Threadsでシェア
                </button>

                <button
                  onClick={() => router.push('/posts')}
                  className="w-full bg-gray-200 text-gray-800 py-5 rounded-lg font-bold text-lg hover:bg-gray-300 transition"
                >
                  一覧に戻る
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
