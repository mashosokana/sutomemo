import { NextRequest, NextResponse }  from "next/server";
import { prisma } from "@/utils/prisma";
import { supabase } from "@/utils/supabase";

export const PUT =async (request: NextRequest, { params }: { params: { postId: string } }) => {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json({ error: "Unauthorized" }, {status: 401 });
  }

  const body =await request.json();
  const { freeMemo, answerWhy, answerWhat, answerNext } = body;

  const updatedMemo = await prisma.memo.update({
    where: { postId: Number(params.postId) },
    data: {
      freeMemo,
      answerWhy,
      answerWhat,
      answerNext,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(updatedMemo);
}