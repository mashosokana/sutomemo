//src/_components/BlurredTextPreview.tsx
'use client';
type Props = { text: string; onUnlock: () => void; limit?: number };

export function splitForPreview(s: string, limit = 500) {
  const head = s.slice(0, limit);
  const tail = s.slice(limit);
  return { head, tail };
}

export default function BlurredTextPreview({ text, onUnlock, limit = 500 }: Props) {
  const { head, tail } = splitForPreview(text, limit);
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap">{head}</p>
      {tail && (
        <div className="relative">
          <div className="blurred whitespace-pre-wrap select-none pointer-events-none">{tail}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button onClick={onUnlock} className="rounded-xl bg-black/70 text-white px-4 py-2">
              続きを見る・保存するには登録
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
