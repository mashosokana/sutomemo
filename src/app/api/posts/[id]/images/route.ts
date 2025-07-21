// src/app/api/posts/[id]/images/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyUser } from "@/lib/auth";
import { parsePostId } from "@/utils/parsePostId"; 


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user } = await verifyUser(req)
    const postId = parsePostId(params.id)
    if (!postId) {
      return NextResponse.json({ error: "Invalid Post ID" }, { status: 400})
    }

    const { imageKey } = await req.json()
    if (!imageKey) {
      return NextResponse.json({ error: "Missing imageKey" }, { status: 400 })
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
        userId: user?.id,
      },
    })
    if (!post) {
      return  NextResponse.json({ error: "Post not found or unauthorized" }, {status: 404 })
    }

    const image = await prisma.image.create({
      data: {
        postId,
        imageKey,
      },
    })
    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to save image" }, {status: 500 })
  } 
}