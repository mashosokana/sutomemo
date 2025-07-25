import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PostImageManager from "./PostImageManager";
import { supabase } from "@/lib/supabase";

type PostDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const postId = Number(params.id);
  if (!params.id || isNaN(postId)) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      memo: {
        select: {
          answerWhy: true,
          answerWhat: true,
          answerNext: true,
        },
      },
      images: true,
    },
  });

  if (!post) {
    notFound();
  }

  const imagesWithUrl = post.images.map((img) => {
    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(img.imageKey);
      return { id: img.id, key: img.imageKey, url: data?.publicUrl ?? "" };
  });

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-white text-black">
      <p className="text-gray-600 text-sm mb-4">
        投稿日: {new Date(post.createdAt).toLocaleDateString()}
      </p>

      <PostImageManager
        postId={postId}
        initialImages={imagesWithUrl}
        caption={post.caption} 
        memo={{
          answerWhy: post.memo?.answerWhy ?? undefined,
          answerWhat: post.memo?.answerWhat ?? undefined,
          answerNext: post.memo?.answerNext ?? undefined,
        }}
      />

    </main>
  );
}
