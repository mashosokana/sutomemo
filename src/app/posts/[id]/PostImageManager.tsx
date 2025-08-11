"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Image from "next/image";
import heic2any from "heic2any"; // ★ 型定義を作ったので型エラー解消
import { PostImage, PostMemo } from "../../../../types/post";

type Props = {
  postId: number;
  initialImages: PostImage[];
  caption?: string;
  memo?: PostMemo;
};

export default function PostImageManager({ postId, initialImages, caption, memo }: Props) {
  const [localImages, setLocalImages] = useState<PostImage[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { token } = useSupabaseSession();

  useEffect(() => {
    const withUrls = initialImages.map((img) => ({
      ...img,
      signedUrl: img.signedUrl ?? "",
    }));
    setLocalImages(withUrls);
  }, [initialImages]);

  const handleDelete = async () => {
    if (!localImages.length || !confirm("この画像を削除しますか？")) return;

    const targetImage = localImages[0];
    setDeleting(targetImage.imageKey);

    try {
      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        // APIが単一削除に対応しているなら imageKey を渡す
        body: JSON.stringify({ imageKey: targetImage.imageKey }),
      });

      if (!res.ok) {
        alert("削除に失敗しました");
        return;
      }

      const result: { images?: PostImage[] } = await res.json();
      setLocalImages(result.images ?? []);
    } finally {
      setDeleting(null);
    }
  };

  // ★ HEIC → JPEG 変換（失敗したら元のファイルを返す）
  const convertHeicIfNeeded = async (file: File): Promise<File> => {
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (!isHeic) return file;

    try {
      const convertedBlob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });
      return new File([convertedBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      });
    } catch (err) {
      console.error("HEIC変換に失敗しました。元ファイルをアップロードします:", err);
      return file;
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    try {
      let file = e.target.files[0];

      // ★ アップロード前に HEIC → JPEG 変換
      file = await convertHeicIfNeeded(file);

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/posts/${postId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: formData,
      });

      if (!res.ok) {
        alert("画像のアップロードに失敗しました");
        return;
      }

      const { image } = await res.json();

      if (image?.signedUrl) {
        setLocalImages([image as PostImage]);
      } else {
        // フォールバック：GET で取り直し（API側が GET で必ず signedUrl を付与している前提）
        const getRes = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (getRes.ok) {
          const data = await getRes.json();
          const imgs = (data.post?.images ?? []) as PostImage[];
          const picked = [...imgs].reverse().find(i => i?.signedUrl);
          setLocalImages(picked ? [picked] : []);
        } else {
          console.warn("アップロード直後のGETが失敗しました");
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-xs mx-auto p-4 shadow space-y-4">
      {localImages.length > 0 && localImages[0].signedUrl ? (
        <Image
          src={localImages[0].signedUrl}
          alt="投稿画像"
          width={240}
          height={240}
          className="object-contain rounded border"
          priority
        />
      ) : (
        <div className="flex items-center justify-center w-[240px] h-[240px] bg-gray-100 text-gray-400 rounded border">
          画像がありません
        </div>
      )}

      {memo && (
        <div className="text-sm text-gray-800 space-y-1">
          <p>{caption ?? "未入力"}</p>
          <p>{memo.answerWhy ?? "未入力"}</p>
          <p>{memo.answerWhat ?? "未入力"}</p>
          <p>{memo.answerNext ?? "未入力"}</p>
        </div>
      )}

      <label
        htmlFor="fileUpload"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
      >
        ギャラリー/ファイルを選択
      </label>
      <input
        id="fileUpload"
        type="file"
        accept="image/*,.heic,.heif"  // ★ 明示的に heic/heif も許可
        onChange={handleUpload}
        className="hidden"
      />
      {uploading && <p className="text-blue-500 text-xs">アップロード中...</p>}

      <div className="flex gap-4 mt-4">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={() => alert("画像が保存されました")}
        >
          画像を保存
        </button>
        <button
          onClick={handleDelete}
          disabled={!localImages.length || deleting !== null}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          {deleting ? "削除中..." : "画像を削除"}
        </button>
      </div>
    </div>
  );
}
