// src/app/api/posts/[id]/images/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";

const SIGNED_URL_EXPIRY = 60 * 60;
const MAX_MB = 5;
const allowedMime = /^image\//;

function parsePostId(id: string) {
  const postId = Number(id);
  return Number.isFinite(postId) ? postId : null;
}

async function getAuthUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const };
  return { user: data.user, status: 200 as const };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status });

    const postId = parsePostId(params.id);
    if (!postId) return NextResponse.json({ error: "Invalid Post ID" }, { status: 400 });

    const post = await prisma.post.findFirst({ where: { id: postId, userId: user.id } });
    if (!post) return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) return NextResponse.json({ error: "No image file provided" }, { status: 400 });

    if (!allowedMime.test(imageFile.type)) {
      return NextResponse.json({ error: "画像のみアップロード可能です" }, { status: 400 });
    }
    if (imageFile.size > MAX_MB * 1024 * 1024) {
      return NextResponse.json({ error: `画像サイズは${MAX_MB}MBまでです` }, { status: 400 });
    }

    const ext = imageFile.type.split("/")[1] || "bin";
    const filePath = `private/${user.id}/${postId}/${uuidv4()}.${ext}`;

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("post-images")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError.message);
      return NextResponse.json({ error: "画像アップロードに失敗しました" }, { status: 500 });
    }

    let image;
    try {
      image = await prisma.image.create({ data: { postId, imageKey: filePath } });
    } catch (e) {
      await supabaseAdmin.storage.from("post-images").remove([filePath]).catch(() => {});
      throw e;
    }

    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from("post-images")
      .createSignedUrl(filePath, SIGNED_URL_EXPIRY);
    if (signedError) {
      console.warn("Failed to create signed URL:", signedError.message);
    }

    return NextResponse.json(
      {
        image: {
          id: image.id,
          imageKey: filePath,
          url: signedData?.signedUrl ?? null, 
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/posts/[id]/images error:", err);
    return NextResponse.json({ error: "画像の保存に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status });

    const postId = parsePostId(params.id);
    if (!postId) return NextResponse.json({ error: "Invalid Post ID" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const imageKey = typeof body?.imageKey === "string" ? body.imageKey : "";
    if (!imageKey) return NextResponse.json({ error: "Missing imageKey" }, { status: 400 });

    const image = await prisma.image.findFirst({
      where: { postId, imageKey, post: { userId: user.id } },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found or unauthorized" }, { status: 404 });
    }

    const { error: storageError } = await supabaseAdmin
      .storage
      .from("post-images")
      .remove([imageKey]);
    if (storageError) {
      console.warn("Storage remove failed:", storageError.message);
    }

    await prisma.image.delete({ where: { id: image.id } });

    return NextResponse.json({ success: true, deletedKey: imageKey }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/posts/[id]/images error:", err);
    return NextResponse.json({ error: "画像削除に失敗しました" }, { status: 500 });
  }
}

