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

export const POST = async (request: NextRequest, { params }: { params: { postId: string } }) => {
  const postId = Number(params.postId);
  const body = await request.json();
  const { url } = body;
  const newImage = await prisma.image.create({
    data: {
      postId,
      url,
    },
  });

  return NextResponse.json(newImage);
}