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