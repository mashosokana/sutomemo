"use client";

import { useState } from "react";

type MemoFormProps = {
  caption: string;
  answerWhy: string;
  answerWhat: string;
  answerNext: string;
  onCaptionChange: (v: string) => void;
  onWhyChange: (v: string) => void;
  onWhatChange: (v: string) => void;
  onNextChange: (v: string) => void;
  onSubmit: () => void;
  submitLabel: string; 
};

export default function MemoForm({
  caption,
  answerWhy,
  answerWhat,
  answerNext,
  onCaptionChange,
  onWhyChange,
  onWhatChange,
  onNextChange,
  onSubmit,
  submitLabel,
}: MemoFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="space-y-4 bg-white text-black">
      <label className="block font-bold mb-1">やったこと学んだことをメモ</label>
      <input
        className="w-full border p-2 text-black"
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="タイトル"
        disabled={isSubmitting}
      />

      <div>
        <label className="block font-bold mb-1">
          なぜこの内容をメモしたのか？（→ 背景やきっかけを明確化する）
        </label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerWhy}
          onChange={(e) => onWhyChange(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div>
        <label className="block font-bold mb-1">
          何が起きた／どう感じたのか？（→ 起こった出来事や自分の気づき・感情を具体化）
        </label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerWhat}
          onChange={(e) => onWhatChange(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block font-bold mb-1">
          次に何をする／学んだ教訓は？（→ 今後のアクションや得られた示唆を整理）
        </label>
        <textarea
          className="w-full border px-3 py-2 rounded text-black"
          value={answerNext}
          onChange={(e) => onNextChange(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <button
        onClick={handleSubmit}
        className="w-full bg-black text-white py-3 rounded hover:opacity-80 transition"
        disabled={isSubmitting}
      >
        {submitLabel}
      </button>
    </div>
  );
}