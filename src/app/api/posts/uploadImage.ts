// src/app/api/posts/uploadImage.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function uploadImage(file: File, postId: number) {
  const imageKey = `private/${uuidv4()}`;

  const { data, error } = await supabaseAdmin.storage
    .from("post-images")
    .upload(imageKey, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`画像アップロードに失敗しました: ${error.message}`);
  }

  const image = await prisma.image.create({
    data: {
      postId,
      imageKey: data?.path ?? imageKey, 
    },
  });

  return image;
}
