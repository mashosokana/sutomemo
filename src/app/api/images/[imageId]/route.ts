import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'
import { prisma } from '@/utils/prisma'

export const DELETE = async (
  req: NextRequest,
  { params }: { params: { imageId: string } }
) => {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: user, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* 画像レコードを取得して所有者を確認 */
  const img = await prisma.image.findUnique({ where: { id: Number(params.imageId) }, include: { post: true } })

  if (!img || img.post.userId !== user.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  /* ① Storage から削除 */
  const { error: storageErr } = await supabase.storage
    .from('post-images')
    .remove([img.url.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/post-images\//, '')])

  if (storageErr) {
    return NextResponse.json({ error: storageErr.message }, { status: 500 })
  }

  /* ② DB から削除 */
  await prisma.image.delete({ where: { id: img.id } })

  return NextResponse.json({ ok: true })
}
