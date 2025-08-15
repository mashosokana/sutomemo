// src/app/api/posts/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const postId = Number(params.id);
    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const key = `private/${postId}/${Date.now()}-${safeName}`; // 例：保存パスはあなたの規則に合わせて

    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabaseAdmin
      .storage
      .from("post-images")
      .upload(key, buffer, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });
    if (upload.error) {
      return NextResponse.json({ error: upload.error.message }, { status: 500 });
    }

    const imageKey = upload.data?.path ?? key;

    const inserted = await prisma.image.create({
      data: {
        postId,
        imageKey,
      },
      select: { id: true, imageKey: true },
    });

    const signed = await supabaseAdmin
      .storage
      .from("post-images")
      .createSignedUrl(imageKey, 60 * 60);

    return NextResponse.json(
      {
        image: {
          id: inserted.id,
          imageKey: inserted.imageKey,
          signedUrl: signed.data?.signedUrl ?? "",
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const imageKey: string | undefined = body?.imageKey;
    if (!imageKey) {
      return NextResponse.json({ error: "imageKey is required" }, { status: 400 });
    }

    const remove = await supabaseAdmin.storage.from("post-images").remove([imageKey]);
    if (remove.error) {
      return NextResponse.json({ error: remove.error.message }, { status: 500 });
    }

    await prisma.image.deleteMany({
      where: { postId: Number(params.id), imageKey },
    });

    return NextResponse.json({ images: [] });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "delete failed" }, { status: 500 });
  }
}
