import React from "react";
import Image from "next/image";

type Props = {
  date: string;
  content: string;
  imageUrl?: string;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export default function DashboardPostCard({ 
  date,
  content, 
  imageUrl, 
  onEdit, 
  onDelete, 
  disabled = false,
}: Props) {
  return (
    <div className="w-[345px] bg-white rounded-xl shadow p-3 mb-4 text-black">
      <p className="text-sm font-bold mb-2">{date}</p>

      <div className="flex items-start mb-2">
        <div className="w-[60px] h-[60px] flex-shrink-0 bg-gray-100 rounded overflow-hidden relative mr-2">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`投稿画像（${date}）`}
              fill
              sizes="60px"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              No image
            </div>
          )}
        </div>

        <p className="text-sm text-gray-800 line-clamp-3">
          {content}
        </p>
      </div>

      <div className="relative h-[24px] mt-1 text-center">
        <button
          onClick={onEdit}
          disabled={disabled}
          className={`text-gray-600 hover:underline ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          編集
        </button>
        <button
          onClick={onDelete}
          disabled={disabled}
          className={`absolute right-0 text-red-500 hover:underline text-sm ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          削除
        </button>
      </div>
    </div>
  );
}