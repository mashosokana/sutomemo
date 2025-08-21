// src/lib/images.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { THUMB_BUCKET } from "@/lib/buckets"; // ← パスを統一

export type TransformOpt = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
};

type StorageApi = ReturnType<typeof supabaseAdmin.storage.from>;
type CreateSignedUrlOptions = Parameters<StorageApi["createSignedUrl"]>[2];
type GetPublicUrlOptions = Parameters<StorageApi["getPublicUrl"]>[1];

export async function createSignedUrl(
  bucket: string,
  key: string,
  expiresSec = 3600,
  t?: TransformOpt
): Promise<string | undefined> {
  const options: CreateSignedUrlOptions =
    t ? { transform: { width: t.width, height: t.height, resize: t.resize } } : undefined;

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(key, expiresSec, options);

  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}

export function getPublicThumbUrl(
  key?: string | null,
  width = 120,
  height = 120
): string | undefined {
  if (!key) return undefined;

  const options: GetPublicUrlOptions = {
    transform: { width, height, resize: "cover" },
  };

  const { data } = supabaseAdmin.storage
    .from(THUMB_BUCKET)
    .getPublicUrl(key, options);

  return data.publicUrl ?? undefined;
}
