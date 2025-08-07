// /src/app/api/posts/[id]/images/[imageId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';
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
    const token = req.headers.get('Authorization') ?? '';
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { id: postId, imageId } = parsed.data;

    const image = await prisma.image.findFirst({
      where: {
        id: imageId,
        post: {
          id: postId,
          userId: userData.user.id,
        },
      },
      include: {
        post: true,
      },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found or forbidden' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const { error: storageError } = await supabase
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
        const { data, error } = await supabase
          .storage
          .from('post-images')
          .createSignedUrl(img.imageKey, 60 * 60);

        if (error) {
          console.warn(`Failed to create signed URL for ${img.imageKey}:`, error.message);
        }

        return {
          ...img,
          signedUrl: data?.signedUrl ?? null,
        };
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
