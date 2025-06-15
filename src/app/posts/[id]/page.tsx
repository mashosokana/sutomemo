// app/posts/[id]/page.tsx
"use client"

import useSWR from 'swr'
import { fetcher } from '@/utils/fetcher';
import { useRouter } from "next/navigation";
import MemoForm from '@/app/components/MemoForm';

export default function PostDetailPage({ params }: { params: { id: string} }) {
const router = useRouter()

const {
  data: post,
  error,
  isLoading,
  mutate,
} = useSWR(`/api/posts/${params.id}`, fetcher)

  const handleDelate = async () => {
    const token = localStorage.getItem("token");
    console.log("トークン:", token);
    
    const res = await fetch(`/api/posts/${params.id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (res.ok) {
      alert("削除しました");
      router.push("/dashboard");
    }else {
      const error = await res.json();
      alert("削除失敗: " + (error?.error ?? "不明なエラー"));
    }
  };

  if (isLoading) return <p className='p-4'>読み込み中</p>
  if (error) return <p className='p-4 text-red-600'>取得失敗</p>
  if (!post) return <p className='p-4'>存在しない投稿です</p>

 return (
  <div className='font-sans font-sans p-4 space-y-4'>
    <h1 className="font-sans font-sans text-2xl">{post.caption}</h1>

    <MemoForm postId={post.id} memo={post.memo} onSaved={mutate} />

    <button onClick={handleDelate} className='font-sans text-red-500'>
      削除
      </button>
  </div>
 ); 
}
