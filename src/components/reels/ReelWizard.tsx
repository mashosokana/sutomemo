// src/components/reels/ReelWizard.tsx

'use client';

import { useState } from 'react';
import { generatePostLocalId } from '@/lib/reels/id';
import UploadStep from './UploadStep';
import TextStep, { TextData } from './TextStep';
import OutputStep from './OutputStep';

/**
 * リール作成ウィザード（3ステップ管理）
 */
export default function ReelWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [textData, setTextData] = useState<TextData | null>(null);
  const [postLocalId] = useState(() => generatePostLocalId());

  const handleUploadNext = (selectedFile: File) => {
    setFile(selectedFile);
    setStep(2);
  };

  const handleTextNext = (data: TextData) => {
    setTextData(data);
    setStep(3);
  };

  const handleBackToUpload = () => {
    setStep(1);
  };

  const handleBackToText = () => {
    setStep(2);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 text-center ${
                step >= s ? 'text-black font-bold' : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-black text-white' : 'bg-gray-300 text-gray-600'
                }`}
              >
                {s}
              </div>
              <p className="text-xs mt-1">
                {s === 1 ? '素材' : s === 2 ? 'テキスト' : '出力'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ステップコンテンツ */}
      {step === 1 && <UploadStep onNext={handleUploadNext} />}
      {step === 2 && <TextStep onNext={handleTextNext} onBack={handleBackToUpload} />}
      {step === 3 && file && textData && (
        <OutputStep
          file={file}
          duration={15}
          textData={textData}
          postLocalId={postLocalId}
          onBack={handleBackToText}
        />
      )}
    </div>
  );
}
