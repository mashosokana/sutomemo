'use client';

import { PostMemo } from '../../../types/post';

type Props = {
  caption: string;
  memo: PostMemo;
  onCaptionChange: (v: string) => void;
  onMemoChange: ( memo: PostMemo) => void;
};

export default function PostMemoEditor({
  caption,
  memo,
  onCaptionChange,
  onMemoChange,
}: Props) {
  return(
    <div className='space-y-4 w-full max-w-md mx-auto'>
      <div>
        <label className="block text-sm font-bold mb-1">タイトル（caption）</label>
        <textarea
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          rows={1}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
          <label className="block text-sm font-bold mb-1">なぜ？（Why）</label>
          <textarea
            value={memo.answerWhy}
            onChange={(e) =>
              onMemoChange({ ...memo, answerWhy: e.target.value })
            }
            rows={2}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">何をした？（What）</label>
          <textarea
            value={memo.answerWhat}
            onChange={(e) =>
              onMemoChange({ ...memo, answerWhat: e.target.value })
            }
            rows={2}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-bold mb-1">次に何をする？（Next）</label>
          <textarea
            value={memo.answerNext}
            onChange={(e) =>
              onMemoChange({ ...memo, answerNext: e.target.value })
            }
            rows={2}
            className="w-full border rounded p-2"
          />
        </div>
    </div>
  );
}
  

  