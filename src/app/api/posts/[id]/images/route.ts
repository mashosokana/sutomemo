// src/app/api/posts/[id]/images/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  assertNotGuestOrThrow,
  isAdmin,
  requireUserOrThrow,
  type AuthUser,
} from "@/lib/auth";


const BUCKET = process.env.SUPABASE_BUCKET ?? "public";
const SIGNED_URL_TTL = 3600;
const ALLOW_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function parsePostId(raw: string) {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/]+/g, "_").replace(/\s+/g, "_");
}

async function tryCreateSignedUrlForUpload(key: string, mime: string | undefined) {
  if (!mime || !ALLOW_MIME.has(mime)) return undefined;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(key, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return undefined;
  return data.signedUrl;
}

async function ensureOwnerOrAdmin(user: AuthUser, postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });
  if (!post) throw new Response("Not Found", { status: 404 });

  const isOwner = post.userId === user.id;
  if (!isOwner && !isAdmin(user)) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUserOrThrow(req);
    assertNotGuestOrThrow(user);

    const postId = parsePostId(params.id);
    if (!postId) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
    }

    await ensureOwnerOrAdmin(user, postId);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const safeName = sanitizeFileName(file.name || "upload");
    const key = `posts/${postId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, file, { upsert: false });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const img = await prisma.image.create({
      data: { postId, imageKey: key },
      select: { id: true, imageKey: true },
    });

    const signedUrl = await tryCreateSignedUrlForUpload(key, file.type);

    return NextResponse.json(
      { id: img.id, imageKey: img.imageKey, signedUrl },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUserOrThrow(req);
    assertNotGuestOrThrow(user);

    const postId = parsePostId(params.id);
    if (!postId) {
      return NextResponse.json({ error: "不正なIDです" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as
      | { imageKey?: string | null }
      | null;

    const imageKey = body?.imageKey ?? null;
    if (!imageKey) {
      return NextResponse.json({ error: "imageKey required" }, { status: 400 });
    }

    const image = await prisma.image.findFirst({
      where: { imageKey, postId },
      select: { id: true, postId: true },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const post = await prisma.post.findUnique({
      where: { id: image.postId },
      select: { userId: true },
    });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    const isOwner = post.userId === user.id;
    if (!isOwner && !isAdmin(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: del1 } = await supabaseAdmin.storage
      .from(BUCKET)
      .remove([imageKey]);
    if (del1) {
      return NextResponse.json({ error: del1.message }, { status: 500 });
    }

    await prisma.image.delete({ where: { id: image.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    const message = e instanceof Error ? e.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
