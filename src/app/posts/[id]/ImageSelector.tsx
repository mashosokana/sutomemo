'use client';

import { useState, ChangeEvent } from "react";
import Image from "next/image";

export default function ImageSelector() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
  };

  return (
    <div className="mt-6">
      <label className="block mb-2 font-medium text-gray-700">
        画像を選択してください
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="mb-4"
      />
      {selectedImage && (
        <Image
          src={selectedImage}
          alt="プレビュー"
          width={400}
          height={400}
          className="w-full rounded border"
        />
      )}
    </div>
  );
}
