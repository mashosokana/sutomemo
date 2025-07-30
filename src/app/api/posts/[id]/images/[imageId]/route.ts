// /src/app/api/posts/[id]/images/[imageId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyUser } from '@/lib/auth';
import { z } from 'zod';

const ParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
  imageId: z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
});

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    const { id: postId, imageId } = parsed.data;

    const { user, error: authError, status } = await verifyUser(req);
    if (!user) {
      return NextResponse.json({ error: authError }, {status });
    }

    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { post: true },
    });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    if (image.post.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      const { error: storageError } = await supabaseAdmin
        .storage
        .from('post-images')
        .remove([image.imageKey]);

      if (storageError) throw new Error('Storage delete failed');

      await tx.image.delete({ where: { id: imageId } });
    });

    const remainingImages = await prisma.image.findMany({
      where: { postId },
    });

    const imagesWithSignedUrls = await Promise.all(
      remainingImages.map(async (img) => {
        const { data, error } = await supabaseAdmin
          .storage
          .from('post-images')
          .createSignedUrl(img.imageKey, 60 * 60);

      if (error) {
          console.warn(`Failed to create signed URL for ${img.imageKey}:`,error.message);
      }
    
       return {
          ...img,
          signedUrl: data?.signedUrl ?? null, 
        }
      })
    );

    return NextResponse.json({
      success: true,
      deletedId: imageId,
      images: imagesWithSignedUrls,
    });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}