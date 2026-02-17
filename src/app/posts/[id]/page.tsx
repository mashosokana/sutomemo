// src/app/posts/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faThreads } from '@fortawesome/free-brands-svg-icons';

type Post = {
  id: number;
  caption: string;
  images: Array<{ signedUrl: string }>;
  imageUrl?: string; // APIが追加で返す最初の画像URL
};

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { session, token, isLoading: tokenLoading } = useSupabaseSession();
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [isLoadingPost, setIsLoadingPost] = useState(true);

  // 認証チェック
  useEffect(() => {
    if (!tokenLoading && !session) {
      router.replace('/login');
    }
  }, [tokenLoading, session, router]);

  // 投稿データ取得
  useEffect(() => {
    if (!token || !postId) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error('投稿の取得に失敗しました');
        }

        const data = await res.json();
        setPost(data.post);
      } catch (error) {
        console.error('Fetch post error:', error);
        alert('投稿の読み込みに失敗しました');
        router.push('/posts');
      } finally {
        setIsLoadingPost(false);
      }
    };

    fetchPost();
  }, [token, postId, router]);

  // ダウンロード処理
  const handleDownload = async () => {
    if (!post?.imageUrl && !post?.images[0]?.signedUrl) {
      alert('画像がありません');
      return;
    }

    const imageUrl = post.imageUrl || post.images[0]?.signedUrl || '';

    try {
      // 画像をfetchしてBlobに変換
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Web Share API優先
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'memo.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      }

      // フォールバック
      const link = document.createElement('a');
      link.download = `post-${postId}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  // 削除処理
  const handleDelete = async () => {
    if (!confirm('この投稿を削除しますか？この操作は取り消せません。')) {
      return;
    }

    if (!token) {
      alert('認証エラーが発生しました');
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      alert('削除しました');
      localStorage.removeItem('stories-editor-state:v1');
      router.push('/posts');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : '削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // 共有処理
  const handleShare = async (platform: 'x' | 'threads') => {
    if (!post) return;

    const text = post.caption.slice(0, platform === 'x' ? 280 : 500);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const combined = url ? `${text}\n\n${url}` : text;

    if (platform === 'x') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(combined)}`,
        '_blank'
      );
    } else {
      const params = new URLSearchParams({ text: combined });
      window.open(`https://www.threads.net/intent/post?${params.toString()}`, '_blank');
    }
  };

  if (tokenLoading || isLoadingPost) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen flex items-center justify-center">
        <p className="text-gray-900 text-lg">読み込み中...</p>
      </div>
    );
  }

  if (!session || !post) {
    return null;
  }

  // APIがimageUrlを直接返す、または最初の画像のsignedUrlを使用
  const imageUrl = post.imageUrl || post.images[0]?.signedUrl || '';

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      {/* ヘッダー */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/posts')}
          className="text-gray-700 hover:text-gray-900 mb-4 flex items-center gap-2"
        >
          ← 投稿一覧に戻る
        </button>
      </div>

      {/* 画像表示（9:16のアスペクト比でInstagram Stories/Reelsと同じサイズ） */}
      {imageUrl ? (
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-black w-full" style={{ aspectRatio: '9/16' }}>
          <img
            src={imageUrl}
            alt={post.caption || 'メモ画像'}
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 w-full flex items-center justify-center" style={{ aspectRatio: '9/16' }}>
          <p className="text-gray-500">画像がありません</p>
        </div>
      )}

      {/* キャプション */}
      {post.caption && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">キャプション</h2>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-900 whitespace-pre-wrap">{post.caption}</p>
          </div>
        </div>
      )}

      {/* アクション */}
      <div className="space-y-3">
        <button
          onClick={handleDownload}
          className="w-full bg-black text-white py-3 rounded-md font-bold hover:bg-gray-800 transition"
        >
          ダウンロード
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleShare('x')}
            className="bg-gray-100 text-gray-900 py-3 rounded-md font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faXTwitter} />
            X
          </button>
          <button
            onClick={() => handleShare('threads')}
            className="bg-gray-100 text-gray-900 py-3 rounded-md font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faThreads} />
            Threads
          </button>
        </div>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full bg-red-600 text-white py-3 rounded-md font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {isDeleting ? '削除中...' : '削除'}
        </button>
      </div>
    </div>
  );
}
