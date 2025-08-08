// src/app/api/posts/[id]/images/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { v4 as uuidv4 } from "uuid";

const SIGNED_URL_EXPIRY = 60 * 60;

function parsePostId(id: string) {
  const postId = Number(id);
  return isNaN(postId) ? null : postId;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get("Authorization") ?? "";
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = userData.user;

  const postId = parsePostId(params.id);
  if (!postId) {
    return NextResponse.json({ error: "Invalid Post ID" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId, userId: user.id },
  });
  if (!post) {
    return NextResponse.json({ error: "Post not found or unauthorized" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    const filePath = `private/${uuidv4()}`;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from("post-images")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,  // 重複時はエラーを返す
        contentType: imageFile.type,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError.message);
      return NextResponse.json({ error: "画像アップロードに失敗しました" }, { status: 500 });
    }

    const image = await prisma.image.create({
      data: { postId, imageKey: filePath },
    });

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
          signedUrl: signedData?.signedUrl ?? null,
        }, 
      }, 
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/posts/[id]/image error:", err);
    return NextResponse.json({ error: "画像の保存に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get("Authorization") ?? "";
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = userData.user;

  const postId = parsePostId(params.id);
  if (!postId) {
    return NextResponse.json({ error: "Invalid Post ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { imageKey } = body as { imageKey?: string };
    if (!imageKey) {
      return NextResponse.json({ error: "Missing imageKey" }, { status: 400 });
    }

    const image = await prisma.image.findFirst({
      where: { postId, imageKey, post: { userId: user.id } },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found or unauthorized" }, { status: 404 });
    }

    await supabaseAdmin
      .storage
      .from("post-images")
      .remove([imageKey]);

    await prisma.image.delete({ where: { id: image.id } });

    return NextResponse.json({ success: true, deletedKey: imageKey }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/posts/[id]/image error:", err);
    return NextResponse.json({ error: "画像削除に失敗しました" }, { status: 500 });
  }
}
