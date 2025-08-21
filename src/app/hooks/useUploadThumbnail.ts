//src/app/hooks/useUploadThumbnail.ts
"use client";

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { THUMB_BUCKET } from "@/lib/buckets";

async function makeThumbnailWebP(file: File, maxSize = 160): Promise<Blob> {
  if (typeof window === "undefined") throw new Error("Client only");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(maxSize / bmp.width, maxSize / bmp.height, 1);
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.drawImage(bmp, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/webp", 0.8);
  });
  return blob;
}

type UploadResult = { thumbnailImageKey: string; publicUrl: string | null };

export function useUploadThumbnail(postId: number) {
  const uploadThumbnail = useCallback(async (originalFile: File): Promise<UploadResult> => {
    const { data: sessionData, error: sesErr } = await supabase.auth.getSession();
    if (sesErr) throw sesErr;
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("未ログインのためサムネを保存できません");

    // 1) サムネ生成
    const thumbBlob = await makeThumbnailWebP(originalFile, 160);
    const key = `private/${uuidv4()}.webp`;

    // 2) 公開バケットへ保存（★ THUMB_BUCKET を使用）
    const { data: up, error: upErr } = await supabase.storage
      .from(THUMB_BUCKET)
      .upload(key, thumbBlob, {
        cacheControl: "31536000",
        upsert: false,
        contentType: "image/webp",
      });
    if (upErr || !up?.path) {
      throw new Error(`Bucket upload failed: bucket=${THUMB_BUCKET}, key=${key}, msg=${upErr?.message ?? "unknown"}`);
    }

    // 3) 公開URL（安定URL）
    const { data: pub } = supabase.storage.from(THUMB_BUCKET).getPublicUrl(up.path, {
      transform: { width: 120, height: 120, resize: "cover" },
    });

    // 4) DB更新
    const res = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ thumbnailImageKey: up.path }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `API Error ${res.status}`);
    }

    return { thumbnailImageKey: up.path, publicUrl: pub.publicUrl ?? null };
  }, [postId]);

  return { uploadThumbnail };
}
