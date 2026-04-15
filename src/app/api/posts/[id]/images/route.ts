// src/app/api/posts/[id]/images/route.ts
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { IMAGE_BUCKET } from "@/lib/buckets";
import { isAdmin, isGuest, verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { user, error, status } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    if (isGuest(user)) {
      return jsonNoStore({ error: "ゲストはアップロードできません" }, { status: 403 });
    }

    const postId = Number(params.id);
    if (!Number.isFinite(postId)) {
      return jsonNoStore({ error: "invalid post id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },      
    });
    if (!post) {
      return jsonNoStore({ error: "投稿が存在しません"}, { status: 404 });
    }
    if (!isAdmin(user) && post.userId !== user.id) {
      return jsonNoStore({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonNoStore({ error: "file is required (field name must be 'file')" }, { status: 400 });
    }

    
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const key = `private/${postId}/${Date.now()}-${safeName}`;

    
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(key, buf, { contentType: file.type, upsert: false });
    if (upErr) {
      return jsonNoStore({ error: `upload failed: bucket=${IMAGE_BUCKET}, key=${key}, msg=${upErr.message}` }, { status: 500 });
    }

    const image = await prisma.image.create({
      data: { postId, imageKey: key },
      select: { id: true, imageKey: true, postId: true, generatedAt: true, updatedAt: true },
    });

    const { data: signed } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .createSignedUrl(key, 3600);
    return jsonNoStore({ id: image.id, imageKey: image.imageKey, signedUrl: signed?.signedUrl ?? undefined }, { status: 201 });
  } catch (e) {
    console.error("POST /api/posts/[id]/images error:", e);
    return jsonNoStore({ error: "internal error while uploading image" }, { status: 500 });
  }
}
