// /src/app/api/posts/[id]/images/[imageId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
  imageId: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
});

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const };
  return { user: data.user, status: 200 as const };
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const { user, status } = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status });

    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    const { id: postId, imageId } = parsed.data;

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        post: { id: postId, userId: user.id },
      },
    });
    if (!image) {
      return NextResponse.json({ error: "Image not found or forbidden" }, { status: 404 });
    }

    const { error: storageError } = await supabaseAdmin
      .storage
      .from("post-images")
      .remove([image.imageKey]);
    if (storageError) {
      console.warn("Storage delete failed:", storageError.message);
      return NextResponse.json({ error: "Failed to delete file" }, { status: 500 });
    }

    await prisma.image.delete({ where: { id: imageId } });

    const remainingImages = await prisma.image.findMany({
      where: { postId, post: { userId: user.id } },
      orderBy: { id: "asc" },
    });

    const images = await Promise.all(
      remainingImages.map(async (img) => {
        const { data, error } = await supabaseAdmin
          .storage
          .from("post-images")
          .createSignedUrl(img.imageKey, 60 * 60);
        if (error) {
          console.warn(`Failed to create signed URL for ${img.imageKey}:`, error.message);
        }
        return {
          id: img.id,
          key: img.imageKey,
          url: data?.signedUrl ?? null,
        };
      })
    );

    return NextResponse.json({ success: true, deletedId: imageId, images }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/posts/[id]/images/[imageId] error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
