// app/posts/[id]/page.tsx

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import ImageSelector from "./ImageSelector";
import PostImages from "./PostImages";

type PostDetailPageProps = {
  params: {
    id: string
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const postId = Number(params.id);

  if (!params.id || isNaN(postId)) {
    notFound();
  }

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    include:{
      memo: {
        select:{
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

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold text-center mb-6">{post.caption}</h1>
      <p className="text-sm text-gray-500">
        投稿日: {new Date(post.createdAt).toLocaleDateString()}
      </p>

      {post.memo && (
        <div className="mt-4 space-y-2">
          <p><strong>なぜ:</strong> {post.memo.answerWhy}</p>
          <p><strong>何が:</strong> {post.memo.answerWhat}</p>
          <p><strong>次に:</strong> {post.memo.answerNext}</p>
        </div>
      )}
      
      <PostImages imageKeys={post.images.map(img => img.imageKey)} />
      <ImageSelector postId={postId} />

      <Link href="/dashboard">
        <button className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
          ← ダッシュボードに戻る
        </button>
      </Link>
    </main>
  );
}