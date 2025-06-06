import  {  NextResponse, NextRequest } from "next/server";
import { prisma } from "@/utils/prisma";

export const GET = async (request: NextRequest, { params }: { params: { postId: string } }) => {
  const postId = Number(params.postId);
  const images = await prisma.image.findMany({
    where: { postId }
  });

  return NextResponse.json(images.map(img => ({
    id: img.id,
    url: img.url,
  })));

}