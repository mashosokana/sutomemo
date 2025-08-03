import React from "react";
import Image from "next/image";

type Props = {
  date: string;
  content: string;
  imageUrl?: string;
  onEdit: () => void;
  onDelete: () => void;
};

export default function DashboardPostCard({ date, content, imageUrl, onEdit, onDelete}: Props) {
  return(
    <div className="flex items-start bg-white rounded-xl shadow p-4 mb-4">
      {imageUrl ? (
        <Image 
          src={imageUrl} 
          alt={`投稿画像（${date}）`}
          width={150}
          height={150}
          style={{ height: "auto" }}
          className="object-cover rounded-lg mr-4" 
        />
      ) : (
        <div className="w-[150px] h-[150px] bg-gray-200 rounded-lg mr-4 flex items-center justify-center text-gray-400">
          No image
        </div>
      )} 

      <div className="flex-1">
        <p className="text-sm text-gray-500 mb-1">{date}</p>
        <p className="text-base text-gray-800 mb-4 whitespace-pre-wrap-">{content}</p>
        <div className="flex gap-2">
          <button onClick={onEdit} className="px-4 py-2 rounded-md bg-gray-500 hover:bg-gray-600">
            編集
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
          >
            削除
          </button>
        </div>
      </div> 
    </div>
  )
}