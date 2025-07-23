"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

type ImageData = { id: number; url: string };

type Props = {
  postId: number;
  initialImages: ImageData[];
};

export default function PostImageManager({ postId, initialImages }: Props) {
  const [localImages, setLocalImages] = useState<ImageData[]>(initialImages);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const { token } = useSupabaseSession();

  useEffect(() => {
    setLocalImages(initialImages);
  }, [initialImages]);

  const handleDelete = async (imageId: number) => {
    if (!confirm("この画像を削除しますか？")) return;

    setDeleting(imageId);
    try {
      const res = await fetch(`/api/posts/${postId}/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: token ?? "" },
      });
      if (!res.ok) {
        alert("削除に失敗しました");
        return;
      }
      setLocalImages((prev) => prev.filter((img) => img.id !== imageId));
    } finally {
      setDeleting(null);
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const imageKey = `private/${uuidv4()}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(imageKey, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload failed:", uploadError);
        alert("アップロードに失敗しました");
        return;
      }

      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey }),
      });

      if (!res.ok) {
        console.error("Failed to save image key to DB");
        alert("DBへの保存に失敗しました");
        return;
      }

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(imageKey);

      const newImage: ImageData = {
        id: Date.now(), 
        url: data?.publicUrl ?? "",
      };

      setLocalImages((prev) => [newImage, ...prev]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 mt-6">
      {localImages.length > 0 ? (
        localImages.map((img) => (
          <div
            key={img.id}
            className="flex flex-col items-center space-y-4 w-[400px]"
          >
            <Image
              src={img.url}
              alt="投稿画像"
              width={400}
              height={400}
              className="object-contain rounded border"
            />
          </div>
        ))
      ) : (
        <div className="flex items-center justify-center w-[400px] h-[400px] bg-gray-900 text-gray-400 rounded border">
          画像がありません
        </div>
      )}

      <label className="block font-medium text-gray-300">
        画像を選択してください
      </label>
      <input type="file" accept="image/*" onChange={handleUpload} />
      {uploading && <p className="text-blue-500 text-sm">アップロード中...</p>}

      <div className="flex gap-4 mt-4">
        <Link href="/dashboard">
          <button className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            ← ダッシュボードに戻る
          </button>
        </Link>
        {localImages.length > 0 && (
          <button
            onClick={() =>
              handleDelete(localImages[0]?.id ?? 0)
            }
            disabled={deleting === localImages[0]?.id}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            {deleting === localImages[0]?.id ? "削除中..." : "削除"}
          </button>
        )}
      </div>
    </div>
  );
}
