"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import StoriesStyleEditor, { StoriesStyleEditorRef } from "../_components/StoriesStyleEditor";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXTwitter, faThreads } from '@fortawesome/free-brands-svg-icons';

type SavedPost = {
  id: number;
  caption: string;
  imageUrl: string;
};

export default function SimpleMemoPage() {
  const { session, token, isLoading } = useSupabaseSession();
  const router = useRouter();
  const editorRef = useRef<StoriesStyleEditorRef>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [savedPost, setSavedPost] = useState<SavedPost | null>(null);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/login");
    }
  }, [isLoading, session, router]);

  // 保存処理
  const handleSave = async () => {
    if (!editorRef.current) {
      alert("エディターの初期化に失敗しました");
      return;
    }

    if (!token) {
      alert("認証エラーが発生しました");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Canvas Blobを取得
      const blob = await editorRef.current.getCanvasBlob();
      if (!blob) {
        throw new Error("画像の生成に失敗しました");
      }

      // 2. テキストを取得
      const text = editorRef.current.getAllText();

      // 3. 投稿を作成
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          caption: text || "",
        }),
      });

      if (!postRes.ok) {
        const errorData = await postRes.json();
        throw new Error(errorData.error || "投稿の作成に失敗しました");
      }

      const { post } = await postRes.json();
      const postId = post.id;

      // 4. BlobをFileに変換
      const file = new File([blob], `memo-${Date.now()}.png`, {
        type: "image/png",
      });

      // 5. 画像をアップロード
      const formData = new FormData();
      formData.append("file", file);

      const imageRes = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!imageRes.ok) {
        const errorData = await imageRes.json();
        throw new Error(errorData.error || "画像のアップロードに失敗しました");
      }

      const imageData = await imageRes.json();
      const imageUrl = imageData.signedUrl || '';

      // 6. 保存成功 - プレビューモードに切り替え
      setSavedPost({
        id: postId,
        caption: text || "",
        imageUrl: imageUrl,
      });

      // 7. localStorage をクリア
      localStorage.removeItem('stories-editor-state:v1');
    } catch (error) {
      console.error("Save error:", error);
      alert(error instanceof Error ? error.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  // キャンセル処理
  const handleCancel = () => {
    const confirmed = confirm("編集内容が失われますが、よろしいですか？");
    if (confirmed) {
      // localStorageをクリア
      localStorage.removeItem('stories-editor-state:v1');
      router.push("/dashboard");
    }
  };

  // ダウンロード処理
  const handleDownload = async () => {
    if (!savedPost?.imageUrl) return;

    try {
      const response = await fetch(savedPost.imageUrl);
      const blob = await response.blob();

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], 'memo.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      }

      const link = document.createElement('a');
      link.download = `memo-${savedPost.id}.png`;
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  // シェア処理
  const handleShare = (platform: 'x' | 'threads') => {
    if (!savedPost) return;

    const text = savedPost.caption.slice(0, platform === 'x' ? 280 : 500);
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

  // 削除処理
  const handleDelete = async () => {
    if (!savedPost || !token) return;
    if (!confirm('この投稿を削除しますか？')) return;

    try {
      const res = await fetch(`/api/posts/${savedPost.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('削除に失敗しました');
      }

      alert('削除しました');
      router.push('/posts');
    } catch (error) {
      console.error('Delete error:', error);
      alert('削除に失敗しました');
    }
  };

  // 新規作成
  const handleCreateNew = () => {
    setSavedPost(null);
    localStorage.removeItem('stories-editor-state:v1');
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen flex items-center justify-center">
        <p className="text-gray-900 text-lg">読み込み中...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // 保存後のプレビュー表示
  if (savedPost) {
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

        {/* 画像表示 */}
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200 bg-black w-full" style={{ aspectRatio: '9/16' }}>
          <img
            src={savedPost.imageUrl}
            alt={savedPost.caption || 'メモ画像'}
            className="w-full h-full object-contain"
          />
        </div>

        {/* キャプション */}
        {savedPost.caption && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">キャプション</h2>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-900 whitespace-pre-wrap">{savedPost.caption}</p>
            </div>
          </div>
        )}

        {/* アクション */}
        <div className="space-y-3">
          <button
            onClick={handleCreateNew}
            className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition"
          >
            新しいメモを作成
          </button>

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
            className="w-full bg-red-600 text-white py-3 rounded-md font-medium hover:bg-red-700 transition"
          >
            削除
          </button>
        </div>
      </div>
    );
  }

  // 編集モード
  return (
    <div className="max-w-3xl mx-auto p-6 bg-white min-h-screen">
      {/* ページタイトル */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-700 hover:text-gray-900 mb-2 flex items-center gap-2"
        >
          ← ダッシュボードに戻る
        </button>
        <h1 className="text-2xl font-bold text-gray-900">新規メモ作成</h1>
      </div>

      {/* エディターエリア（9:16のアスペクト比） */}
      <div className="bg-black rounded-lg overflow-hidden w-full" style={{ aspectRatio: '9/16' }}>
        <StoriesStyleEditor
          ref={editorRef}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
