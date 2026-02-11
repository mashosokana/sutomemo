//src/app/_components/MemoForm.tsx

"use client";

import { useState } from "react";
import MemberGateButton from "./MemberGateButton";

type MemoFormProps = {
  caption: string;
  answerWhy: string;
  answerWhat: string;
  answerNext: string;
  onCaptionChange: (v: string) => void;
  onWhyChange: (v: string) => void;
  onWhatChange: (v: string) => void;
  onNextChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  gate?: boolean;
  guestLabel?: string;
};

export default function MemoForm(props: MemoFormProps) {
  const {
    caption, answerWhy, answerWhat, answerNext,
    onCaptionChange, onWhyChange, onWhatChange, onNextChange,
    onSubmit, submitLabel, gate = true, guestLabel = "登録して書き出す",
  } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  const boxClass =
    "w-full border px-3 py-2 rounded text-black bg-white placeholder:text-gray-400 " +
    "min-h-32 md:min-h-36 max-h-64 overflow-auto resize-y leading-relaxed";

  return (
    <div className="space-y-4 bg-white text-black">
      <label htmlFor="caption" className="block font-bold mb-1">やったこと学んだことをメモ</label>
      <textarea
        id="caption"
        className={boxClass}
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        disabled={isSubmitting}
        placeholder="今日の要点をメモ（複数行OK）"
      />

      <div>
        <label htmlFor="why" className="block font-bold mb-1">
          なぜこの内容をメモしたのか？（→ 背景やきっかけを明確化する）
        </label>
        <textarea
          id="why"
          className={boxClass}
          value={answerWhy}
          onChange={(e) => onWhyChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="理由・背景"
        />
      </div>

      <div>
        <label htmlFor="what" className="block font-bold mb-1">
          何が起きた／どう感じたのか？（→ 起こった出来事や自分の気づき・感情を具体化）
        </label>
        <textarea
          id="what"
          className={boxClass}
          value={answerWhat}
          onChange={(e) => onWhatChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="出来事・気づき"
        />
      </div>

      <div>
        <label htmlFor="next" className="block font-bold mb-1">
          次に何をする／学んだ教訓は？（→ 今後のアクションや得られた示唆を整理）
        </label>
        <textarea
          id="next"
          className={boxClass}
          value={answerNext}
          onChange={(e) => onNextChange(e.target.value)}
          disabled={isSubmitting}
          placeholder="次の一手・教訓"
        />
      </div>

      {/* ▼ 既存：保存/ゲート */}
      {gate ? (
        <MemberGateButton
          onAllow={handleSubmit}
          labelMember={submitLabel}
          labelGuest={guestLabel}
          className="w-full bg-black text-white py-3 rounded hover:opacity-80 transition"
          disabled={isSubmitting}
        />
      ) : (
        <button
          onClick={handleSubmit}
          className="w-full bg-black text-white py-3 rounded hover:opacity-80 transition"
          disabled={isSubmitting}
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}
