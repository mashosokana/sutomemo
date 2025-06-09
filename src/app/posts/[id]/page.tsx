"use client"
import { useRouter } from "next/navigation";

export default function PostDetailPage({ params }: { params: { id: string} }) {
const router = useRouter();

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

 return (
  <div>
    <h1>投稿詳細ページ</h1>
    <p>投稿Id: {params.id}</p>

    <button onClick={handleDelate}>削除</button>
  </div>
 ); 
}
