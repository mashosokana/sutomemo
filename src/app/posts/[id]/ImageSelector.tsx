// src/app/posts/[id]/ImageSelector.tsx
'use client';

import { useState, ChangeEvent } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid"

type Props = {
  postId: number
}

export default function ImageSelector({ postId }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const tempPreview = URL.createObjectURL(file)
    setPreviewUrl(tempPreview);

    setUploading(true);
    try {
      const imageKey = `private/${uuidv4()}`
      const  {error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(imageKey, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Upload failed:", uploadError)
        alert('アップロードに失敗しました');
        return;
      }
      const res = await fetch(`/api/posts/${postId}/images`, {
        method:"POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageKey }),
      });

      if (!res.ok) {
        console.error("Failed to save image key to DB")
        alert("DBへの保存に失敗しました")
      } else {
        console.log("Image uploaded & saved successfully");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-6">
      <label className="block mb-2 font-medium text-gray-700">
        画像を選択してください
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="mb-4"
      />

      {uploading && (
        <p className="text-blue-500 text-sm mb-2">アップロード中...</p>
      )}

      {previewUrl && (
        <Image
          src={previewUrl}
          alt="プレビュー"
          width={400}
          height={400}
          className="w-full rounded border"
        />
      )}
    </div>
  )
}
