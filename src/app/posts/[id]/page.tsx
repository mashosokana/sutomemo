"use client";

import { useEffect, useState } from "react";
import PostImageManager from "./PostImageManager";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import { PostDetail } from "../../../../types/post";

type Props = {
  params: { id: string };
};

export default function PostDetailPage({ params }: Props) {
  const { token } = useSupabaseSession();
  const [post, setPost] = useState<PostDetail | null>(null);
  const postId = Number(params.id);

  useEffect(() => {
    if (!token || isNaN(postId)) return;

    const fetchPost = async () => {
      const res = await fetch(`/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setPost(null);
        return;
      }
      const data = await res.json();
      setPost(data.post as PostDetail);
    };

    fetchPost();
  }, [token, postId]);

  if (!post) {
    return (
      <p className="text-center mt-8 text-gray-500">
        読み込み中またはデータがありません。
      </p>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-4 bg-white text-black">
      <p className="text-gray-600 text-sm mb-4">
        投稿日: {new Date(post.createdAt).toLocaleDateString()}
      </p>

      <PostImageManager
        postId={postId}
        initialImages={post.images ?? []}
        caption={post.caption}
        memo={post.memo}
      />
    </main>
  );
}
