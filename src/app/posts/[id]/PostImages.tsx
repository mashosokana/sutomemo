//src/app/post/[id]/PostImages.tsx

"use client";

import { useState } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Image from "next/image";

type Props = {
  postId: string;
  images: { id: number; url: string }[];
  onDelete?: (imageId: number) => void;
};

export default function PostImages({ postId, images, onDelete }: Props) {
  const [deleting, setDeleting] = useState<number | null>(null);
  const { token } = useSupabaseSession();

  const handleDelete = async (imageId: number) => {
    if (!confirm("この画像を削除しますか？")) return;

    setDeleting(imageId);
    try {
      const res = await fetch(`/api/posts/${postId}/images/${imageId}`, {
        method: "DELETE",
        headers: {
          Authorization: token ?? "", 
        },
      });
      if (!res.ok) {
        alert("削除に失敗しました");
        return;
      }
      onDelete?.(imageId); 
    } finally {
      setDeleting(null);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="flex gap-4 flex-wrap">
      {images.map((img) => (
        <div key={img.id} className="relative w-40 h-40">
          <Image
            src={img.url}
            alt=""
            className="object-cover w-full h-full rounded"
          />
          <button
            onClick={() => handleDelete(img.id)}
            disabled={deleting === img.id}
            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded"
          >
            {deleting === img.id ? "削除中..." : "削除"}
          </button>
        </div>
      ))}
    </div>
  );
}
