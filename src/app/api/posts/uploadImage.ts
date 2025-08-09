// src/app/api/posts/uploadImage.ts
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

const MAX_MB = 5;
const allowedMime = /^image\//;

type UploadArgs = {
  file: File;           
  postId: number;
  userId: string;       
};

export async function uploadImage({ file, postId, userId }: UploadArgs) {
  if (!allowedMime.test(file.type)) {
    throw new Error("画像のみアップロード可能です");
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`画像サイズは${MAX_MB}MBまでです`);
  }

  const ext = file.type.split("/")[1] || "bin";
  const imageKey = `private/${userId}/${postId}/${uuidv4()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabaseAdmin
    .storage
    .from("post-images")
    .upload(imageKey, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`画像アップロードに失敗しました: ${error.message}`);
  }

  try {
    const image = await prisma.image.create({
      data: { postId, imageKey: data?.path ?? imageKey },
    });
    return image;
  } catch (e) {
    await supabaseAdmin.storage.from("post-images").remove([imageKey]).catch(() => {});
    throw e;
  }
}
