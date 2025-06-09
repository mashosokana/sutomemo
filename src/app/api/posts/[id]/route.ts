import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/utils/prisma";
import { supabase } from "@/utils/supabase";

export const GET = async (request: NextRequest, { params }: { params: { id: string } }) => {
  console.log("ID:", params.id);
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.post.findUnique({
    where: { id: Number(params.id )},
    include: {
      images: true,
      memo: true,
    },
  }) 
  
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404});
  }

  // ★ここでpostの中身を確認
  console.log("取得したpost:", post);

  return NextResponse.json(post);
};

export const PUT = async (request: NextRequest, { params }: { params: { id: string } }) => {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401});
  }

  const body = await request.json();
  const { caption, status } = body; 
  
  const updatedPost = await prisma.post.update({
    where: { id:Number(params.id) },
    data: {
      caption,
      status,
      updatedAt: new Date(),
    },
    include: {
      images: true,
      memo: true,
    },
  });

  return NextResponse.json(updatedPost);
}

export const DELETE = async (request: NextRequest, { params }: { params: { id: string } }) => {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401});
  }

  const postId = Number(params.id);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  console.log("削除対象のpostId:", postId);

  await prisma.memo.deleteMany({ where: { postId } });
  await prisma.image.deleteMany({ where: { postId } });
  
  const deleted = await prisma.post.delete({ where: { id: postId } });

  return NextResponse.json(deleted);
} 