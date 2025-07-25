"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Image from "next/image";

type ImageData = { 
  id: number; 
  key: string;
  imageKey?: string;
  url: string; 
};

type Props = {
  postId: number;
  initialImages: ImageData[];
  caption?: string
  memo?: {
    answerWhy?: string;
    answerWhat?: string;
    answerNext?: string;
  };
};

export default function PostImageManager({ postId, initialImages,caption, memo }: Props) {
  const [localImages, setLocalImages] = useState<ImageData[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { token } = useSupabaseSession();

  const buildPublicUrl = (imageKey: string) => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return `${base}/storage/v1/object/public/post-images/${imageKey}?t=${Date.now()}`;
  };

  useEffect(() => {
    const withUrls = initialImages.map(img => {
      const key = img.key ?? img.imageKey ?? "";
      return {
        id: img.id,
        key,
        url: buildPublicUrl(key),
      };
    });
    setLocalImages(withUrls);
  }, [initialImages]);

  const handleDelete = async () => {
    if (!localImages.length || !confirm("この画像を削除しますか？")) return;

    const targetImage = localImages[0];
    setDeleting(targetImage.key ?? "");

    try {
      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ imageKey: targetImage.key })
      });

      if (!res.ok) {
        alert("削除に失敗しました");
        return;
      }
      setLocalImages([]);
    } finally {
      setDeleting(null);
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: formData
      });

      if (!res.ok) {
        alert("画像のアップロードに失敗しました");
        return;
      }

      const { image } = await res.json();

      if (!image?.imageKey) {
        console.error("アップロード成功しましたが imageKey がありません", image);
        return;
      }

      const url = buildPublicUrl(image.imageKey);

      setLocalImages([{ id: image.id, key: image.imageKey, url }]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-xs mx-auto p-4 shadow space-y-4">
      {localImages.length > 0 ? (
        <Image
          src={localImages[0].url}
          alt="投稿画像"
          width={240}
          height={240}
          className="object-contain rounded border"
        />
      ) : (
        <div className="flex items-center justify-center w-[240px] h-[240px] bg-gray-100 text-gray-400 rounded border">
          画像がありません
        </div>
      )}

      {memo && (
        <div className="text-sm text-gray-800 space-y-1">
          <p>{caption ?? "未入力"}</p>
          <p>{memo.answerWhy ?? "未入力"}</p>
          <p>{memo.answerWhat ?? "未入力"}</p>
          <p>{memo.answerNext ?? "未入力"}</p>
        </div>
      )}

      <label
        htmlFor="fileUpload"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      >
        ギャラリー/ファイルを選択
      </label>
      <input
        id="fileUpload"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {uploading && <p className="text-blue-500 text-xs">アップロード中...</p>}

      <div className="flex gap-4 mt-4">
          <button 
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => alert("画像が保存されました")}
          >
            画像を保存
        </button>
        <button
          onClick={handleDelete}
          disabled={!localImages.length || deleting !== null}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          {deleting ? "削除中..." : "画像を削除"}
        </button>
      </div>
    </div>
  );
}
