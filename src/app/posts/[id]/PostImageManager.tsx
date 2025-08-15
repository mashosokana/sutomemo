"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Image from "next/image";
import { PostImage, PostMemo } from "../../../../types/post";

type DeleteImagesResponse = { images?: PostImage[] };
type UploadImageResponse = { image?: PostImage };
type GetPostResponse = { post?: { images?: PostImage[] } };

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
        body: JSON.stringify({ imageKey: targetImage.imageKey }),
      });

      if (!res.ok) {
        alert("削除に失敗しました");
        return;
      }

      const result: DeleteImagesResponse = await res.json();
      setLocalImages(result.images ?? []);
    } finally {
      setDeleting(null);
    }
  };

  // HEIC → JPEG 変換（Blob[] 返却・SSR衝突に対応）
  const convertHeicIfNeeded = async (file: File): Promise<File> => {
    const lower = file.name.toLowerCase();
    const isHeic =
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      lower.endsWith(".heic") ||
      lower.endsWith(".heif");

    if (!isHeic) return file;

    try {
      const { default: heic2any } = await import("heic2any");
      const out = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });

      const blob: Blob = Array.isArray(out) ? out[0] : out; // ← Blob[]対策
      const newFile = new File(
        [blob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        { type: "image/jpeg", lastModified: file.lastModified }
      );

      // デバッグしたいときに↓を一時的に有効化
      // console.log("[convert] before:", file.type, file.name, "after:", newFile.type, newFile.name);

      return newFile;
    } catch (err) {
      console.error("HEIC変換に失敗しました。元ファイルをアップロードします:", err);
      return file; // フォールバック：そのまま送る（サーバ側で弾かない設計ならOK）
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    try {
      let file = e.target.files[0];

      // アップロード前に HEIC → JPEG 変換
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

      const uploadJson: UploadImageResponse = await res.json();

      if (uploadJson.image?.signedUrl) {
        setLocalImages([uploadJson.image]);
      } else {
        // フォールバック：GET で取り直し（HEIC除外）
        const getRes = await fetch(`/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token ?? ""}` },
        });
        if (getRes.ok) {
          const data: GetPostResponse = await getRes.json();
          const imgs = data.post?.images ?? [];
          // 末尾が .heic/.heif の URL は拾わない（最適化500対策）
          const picked = [...imgs]
            .reverse()
            .find((i) => i?.signedUrl && !/(\.heic|\.heif)(\?|$)/i.test(i.signedUrl));
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
          key={localImages[0].signedUrl}  // URL変化時に確実に再描画
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
        accept="image/*,.heic,.heif"  // 明示的に heic/heif 許可
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
