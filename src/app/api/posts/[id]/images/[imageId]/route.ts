// /src/app/api/posts/[id]/images/[imageId]/route.ts
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdmin, verifyUser } from "@/lib/auth";
import { IMAGE_BUCKET } from "@/lib/buckets";
import { z } from "zod";
import { jsonNoStore } from "@/lib/http";

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
  imageId: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
});

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const { user, status, error } = await verifyUser(req);
    if (!user) return jsonNoStore({ error }, { status });

    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) return jsonNoStore({ error: "Invalid parameters" }, { status: 400 });
    const { id: postId, imageId } = parsed.data;

    // 所有者チェック（ADMINは全件可）
    const image = await prisma.image.findFirst({
      where: isAdmin(user)
        ? { id: imageId, post: { id: postId } }
        : { id: imageId, post: { id: postId, userId: user.id } },
    });
    if (!image) return jsonNoStore({ error: "Image not found or forbidden" }, { status: 404 });

    const { error: storageError } = await supabaseAdmin
      .storage
      .from(IMAGE_BUCKET)
      .remove([image.imageKey]);
    if (storageError) {
      console.warn("Storage delete failed:", storageError.message);
      return jsonNoStore({ error: "Failed to delete file" }, { status: 500 });
    }

    await prisma.image.delete({ where: { id: imageId } });

    const remainingImages = await prisma.image.findMany({
      where: isAdmin(user)
        ? { postId }
        : { postId, post: { userId: user.id } },
      orderBy: { id: "asc" },
    });

    const images = await Promise.all(
      remainingImages.map(async (img) => {
        const { data, error } = await supabaseAdmin
          .storage
          .from(IMAGE_BUCKET)
          .createSignedUrl(img.imageKey, 60 * 60);
        if (error) {
          console.warn(`Failed to create signed URL for ${img.imageKey}:`, error.message);
        }
        return {
          id: img.id,
          imageKey: img.imageKey,
          signedUrl: data?.signedUrl ?? null,
        };
      })
    );

    return jsonNoStore({ success: true, deletedId: imageId, images }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/posts/[id]/images/[imageId] error:", error);
    return jsonNoStore({ error: "Internal server error", details: String(error) }, { status: 500 });
  }
}
