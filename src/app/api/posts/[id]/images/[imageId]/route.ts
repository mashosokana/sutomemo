// /src/app/api/posts/[id]/images/[imageId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
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
    const parsed = ParamsSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }
    const { imageId } = parsed.data;

    const token = req.headers.get('Authorization') ?? '';

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = userData.user.id;

    const image = await prisma.image.findUnique({
      where: { id: imageId },
      include: { post: true },
    });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    if (image.post.userId !== userId) {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}