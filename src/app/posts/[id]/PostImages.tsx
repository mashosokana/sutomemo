//src/app/post/[id]/PostImages.tsx

"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

type Props = {
  imageKeys: string[]
}

export default function PostImages({ imageKeys }: Props) {
  const [imageUrls, setImageUrls] = useState<string[]>([])

  useEffect(() => {
    const fetchUrls = async () => {
      const Urls = await Promise.all(
        imageKeys.map(async (key) => {
          const { data } = await supabase
            .storage
            .from("post-images")
            .getPublicUrl(key)

          return data?.publicUrl ?? null
        })
      )
      setImageUrls(Urls.filter((url): url is string => url !== null))
    }

    if (imageKeys.length > 0) {
      fetchUrls();
    }
  },[imageKeys])

  if (imageUrls.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      {imageUrls.map((url, idx) => (
        <Image
          key={idx}
          src={url}
          alt={`投稿画像 ${idx + 1}`}
          width={400}
          height={400}
          className="rounded border"
        />
      ))}
    </div>
  );
}