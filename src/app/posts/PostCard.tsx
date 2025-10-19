"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

type Props = {
  date: string;
  content: string;
  status?: string;
  imageUrl?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange?: (newStatus: string) => void;
  disabled?: boolean;
  optimized?: boolean;
};


function isSignedOrSpecialUrl(src: string) {
  if (!src) return false;
  if (src.startsWith("blob:") || src.startsWith("data:")) return true;
  try {
    const u = new URL(src);
    if (u.searchParams.has("token")) return true;
    if (u.pathname.includes("/sign/")) return true;
  } catch {

  }
  return false;
}

export default function DashboardPostCard({
  date,
  content,
  status,
  imageUrl,
  onEdit,
  onDelete,
  onStatusChange,
  disabled = false,
  optimized = true,
}: Props) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !broken;
  const src = (imageUrl ?? "").trim();
  const shouldUnoptimize =
    optimized === false || (src ? isSignedOrSpecialUrl(src) : false);

  return (
    <div className="w-[345px] bg-white rounded-xl shadow p-3 mb-4 text-black">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold">{date}</p>
        {status && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              status === "published"
                ? "bg-gray-200 text-gray-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {status === "published" ? "公開済み" : "下書き"}
          </span>
        )}
      </div>

      <div className="flex items-start mb-2">
        <div className="w-[60px] h-[60px] flex-shrink-0 bg-gray-100 rounded overflow-hidden relative mr-2">
          {showImage ? (
            <Image
              key={src || "no-url"}
              src={src}
              alt={`投稿画像（${date}）`}
              fill
              sizes="60px"
              className="object-cover"
              loading="lazy"
              unoptimized={shouldUnoptimize}
              onError={() => setBroken(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-gray-400 text-xs"
              aria-label="画像がありません"
            >
              No image
            </div>
          )}
        </div>

        <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-line">
          {content}
        </p>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            disabled={disabled}
            className={`text-gray-600 hover:underline text-sm ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label="この投稿を編集"
          >
            編集
          </button>
          {onStatusChange && status && (
            <button
              onClick={() => onStatusChange(status === "published" ? "draft" : "published")}
              disabled={disabled}
              className={`text-gray-600 hover:underline text-sm ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              aria-label="ステータスを変更"
            >
              {status === "published" ? "下書きに戻す" : "公開する"}
            </button>
          )}
        </div>
        <button
          onClick={onDelete}
          disabled={disabled}
          className={`text-red-500 hover:underline text-sm ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
          aria-label="この投稿を削除"
        >
          削除
        </button>
      </div>
    </div>
  );
}
