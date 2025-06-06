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


  await prisma.memo.deleteMany({ where: { postId: Number(params.id) } });
  await prisma.image.deleteMany({ where: { postId: Number(params.id) } });

  const deletedPost = await prisma.post.delete({
    where: { id: Number(params.id) },
  });

  return NextResponse.json(deletedPost);
} 