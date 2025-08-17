// app/posts/[id]/PostImageManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSupabaseSession } from '@/app/hooks/useSupabaseSession';
import Image from 'next/image';
import ImageFileInput from '@/app/_components/ImageFileInput';
import type { PostImage, PostMemo } from '../../../../types/post';

type DeleteImagesResponse = { images?: PostImage[] };
type GetPostResponse = { post?: { images?: PostImage[] } };

type Props = {
  postId: number;
  initialImages: PostImage[];
  caption?: string;
  memo?: PostMemo;
};

export default function PostImageManager({ postId, initialImages, caption, memo }: Props) {
  const [localImages, setLocalImages] = useState<PostImage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { token } = useSupabaseSession();

  useEffect(() => {
    const withUrls = initialImages.map((img) => ({
      ...img,
      signedUrl: img.signedUrl ?? '',
    }));
    setLocalImages(withUrls);
  }, [initialImages]);

  const handleDelete = async () => {
    if (!localImages.length || !confirm('この画像を削除しますか？')) return;

    const targetImage = localImages[0];
    setDeleting(targetImage.imageKey);

    try {
      const res = await fetch(`/api/posts/${postId}/images`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({ imageKey: targetImage.imageKey }),
      });

      if (!res.ok) {
        alert('削除に失敗しました');
        return;
      }

      const result: DeleteImagesResponse = await res.json();
      setLocalImages(result.images ?? []);
    } finally {
      setDeleting(null);
    }
  };

  // ImageFileInput から受け取った「変換済みファイル」を即アップロード
  const uploadPickedFiles = async (files: File[]) => {
    if (!token || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`/api/posts/${postId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => '');
          throw new Error(`画像のアップロードに失敗しました: ${msg || res.status}`);
        }
      }

      // 成功後は GET で取り直す（HEICはサーバ側で除外済み）
      const getRes = await fetch(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (getRes.ok) {
        const data: GetPostResponse = await getRes.json();
        const imgs = data.post?.images ?? [];
        // 末尾が .heic/.heif の URL は拾わない保険
        const picked = [...imgs]
          .reverse()
          .find((i) => i?.signedUrl && !/(\.heic|\.heif)(\?|$)/i.test(i.signedUrl!));
        setLocalImages(picked ? [picked] : []);
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-xs mx-auto p-4 shadow space-y-4">
      {localImages.length > 0 && localImages[0].signedUrl ? (
        <Image
          key={localImages[0].signedUrl} // URL 変化時に確実に再描画
          src={localImages[0].signedUrl!}
          alt="投稿画像"
          width={240}
          height={240}
          className="object-contain rounded border"
          priority
        />
      ) : (
        <div className="flex items-center justify-center w-[240px] h-[240px] bg-gray-100 text-gray-400 rounded border">
          画像がありません
        </div>
      )}

      {memo && (
        <div className="text-sm text-gray-800 space-y-1">
          <p>{caption ?? '未入力'}</p>
          <p>{memo.answerWhy ?? '未入力'}</p>
          <p>{memo.answerWhat ?? '未入力'}</p>
          <p>{memo.answerNext ?? '未入力'}</p>
        </div>
      )}

      {/* HEIC も選択 OK。内部で JPEG に変換して onPick に渡す */}
      <label
        htmlFor="fileUpload"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      >
        ギャラリー/ファイルを選択
      </label>
      <ImageFileInput
        id="fileUpload"
        className="hidden"
        onPick={uploadPickedFiles}   // ← 即アップロード
        to="image/jpeg"
        quality={0.9}
        multiple={false}
        disabled={uploading}
      />

      {uploading && <p className="text-blue-500 text-xs">アップロード中...</p>}

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleDelete}
          disabled={!localImages.length || deleting !== null}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          {deleting ? '削除中...' : '画像を削除'}
        </button>
      </div>
    </div>
  );
}
