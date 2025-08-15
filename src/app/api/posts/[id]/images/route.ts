// src/app/api/posts/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SIGNED_URL_TTL = 60 * 60; // 1h
const nonEmpty = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

function isGuestUser(email?: string | null): boolean {
  const a = email?.toLowerCase() ?? "";
  const b = (process.env.GUEST_USER_EMAIL ?? "").toLowerCase();
  return a === b;
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const, error: "Unauthorized" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const, error: "Unauthorized" };
  return { user: data.user, status: 200 as const, error: null };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, status, error } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    if (isGuestUser(user.email)) {
      return NextResponse.json({ error: "ゲストユーザーは画像をアップロードできません" }, { status: 403 });
    }

    const postId = Number(params.id);
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }
    const post = await prisma.post.findFirst({ where: { id: postId, userId: user.id } });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const key = `private/${user.id}/${postId}/${Date.now()}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await supabaseAdmin.storage.from("post-images").upload(key, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }
    const imageKey = upload.data?.path ?? key;

    const inserted = await prisma.image.create({
      data: { postId, imageKey },
      select: { id: true, imageKey: true },
    });

    const { data: signed } = await supabaseAdmin
      .storage
      .from("post-images")
      .createSignedUrl(imageKey, SIGNED_URL_TTL);

    return NextResponse.json(
      {
        image: {
          id: inserted.id,
          imageKey: inserted.imageKey,
          signedUrl: nonEmpty(signed?.signedUrl), 
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/posts/[id]/images error:", e);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}

// 画像削除（body: { imageKey }）
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1) 認証
    const { user, status, error } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error }, { status });

    // 2) 所有者チェック
    const postId = Number(params.id);
    if (!Number.isFinite(postId)) {
      return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const imageKey: string | undefined = body?.imageKey;
    if (!imageKey) {
      return NextResponse.json({ error: "imageKey is required" }, { status: 400 });
    }

    const image = await prisma.image.findFirst({
      where: { postId, imageKey, post: { userId: user.id } },
      select: { id: true, imageKey: true },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found or forbidden" }, { status: 404 });
    }

    const remove = await supabaseAdmin.storage.from("post-images").remove([image.imageKey]);
    if (remove.error) {
      return NextResponse.json({ error: remove.error.message }, { status: 500 });
    }
    await prisma.image.delete({ where: { id: image.id } });

    return NextResponse.json({ success: true, deletedId: image.id }, { status: 200 });
  } catch (e) {
    console.error("DELETE /api/posts/[id]/images error:", e);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}

