// src/components/reels/UploadStep.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { convertIfHeic } from '@/lib/convertHeic';

interface UploadStepProps {
  onNext: (file: File) => void;
}

/**
 * Step1: 素材選択コンポーネント
 * 画像1枚または動画1本をローカルから選択（15秒固定）
 */
export default function UploadStep({ onNext }: UploadStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像または動画のみ許可
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('画像または動画ファイルを選択してください');
      return;
    }

    setIsConverting(true);

    try {
      // HEIC画像をJPEGに変換
      const convertedFile = await convertIfHeic(file);
      setSelectedFile(convertedFile);

      // プレビュー生成
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      reader.readAsDataURL(convertedFile);
    } catch (error) {
      console.error('File conversion error:', error);
      alert('画像の変換に失敗しました。別のファイルを選択してください。');
    } finally {
      setIsConverting(false);
    }
  };

  const handleNext = () => {
    if (!selectedFile) {
      alert('ファイルを選択してください');
      return;
    }
    onNext(selectedFile);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-black">Step 1: 素材選択</h2>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="file-upload"
            className="block text-sm font-bold text-black mb-2"
          >
            画像または動画を選択（15秒固定）
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={isConverting}
            className="w-full p-2 border border-gray-300 rounded bg-white text-black disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="画像または動画ファイルを選択"
          />
          <p className="text-xs text-gray-600 mt-1">
            Instagram 2025年アルゴリズムに最適化: 15秒固定で視聴完了率を最大化
          </p>
          {isConverting && (
            <p className="text-sm text-blue-600 mt-2">HEIC画像を変換中...</p>
          )}
        </div>

        {preview && (
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <p className="text-sm font-bold text-black mb-2">プレビュー:</p>
            {selectedFile?.type.startsWith('image/') ? (
              <div className="relative w-full max-w-md mx-auto max-h-64">
                <Image
                  src={preview}
                  alt="選択した画像"
                  width={500}
                  height={500}
                  className="w-full h-auto max-h-64 object-contain"
                  unoptimized
                />
              </div>
            ) : (
              <video
                src={preview}
                controls
                className="max-w-full h-auto max-h-64 mx-auto"
                aria-label="選択した動画"
              />
            )}
            <p className="text-xs text-gray-600 mt-2">
              ファイル名: {selectedFile?.name}
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleNext}
        disabled={!selectedFile}
        className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="次のステップへ進む"
      >
        次へ
      </button>
    </div>
  );
}
