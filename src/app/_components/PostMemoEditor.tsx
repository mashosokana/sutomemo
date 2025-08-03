'use client';

import { useEffect, useState } from 'react';
import { PostMemo } from '../../../types/post';

type Props = {
  initialCaption?: string;
  initialMemo?: PostMemo;
  onChange?: (caption: string, memo: PostMemo) => void;
};

export default function PostMemoEditor({ initialCaption = '', initialMemo, onChange }: Props) {
  const [caption, setCaption] = useState(initialCaption);
  const [answerWhy, setAnswerWhy] = useState(initialMemo?.answerWhy ?? '');
  const [answerWhat, setAnswerWhat] = useState(initialMemo?.answerWhat ?? '');
  const [answerNext, setAnswerNext] = useState(initialMemo?.answerNext ?? '');

  // 値が変わるたびに親へ通知
  useEffect(() => {
    if (onChange) {
      onChange(caption, {
        answerWhy,
        answerWhat,
        answerNext,
      });
    }
  }, [caption, answerWhy, answerWhat, answerNext, onChange]);

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      <div>
        <label className="block text-sm font-bold mb-1">タイトル（caption）</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={1}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">なぜ？（Why）</label>
        <textarea
          value={answerWhy}
          onChange={(e) => setAnswerWhy(e.target.value)}
          rows={2}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">何をした？（What）</label>
        <textarea
          value={answerWhat}
          onChange={(e) => setAnswerWhat(e.target.value)}
          rows={2}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1">次に何をする？（Next）</label>
        <textarea
          value={answerNext}
          onChange={(e) => setAnswerNext(e.target.value)}
          rows={2}
          className="w-full border rounded p-2"
        />
      </div>
    </div>
  );
}
