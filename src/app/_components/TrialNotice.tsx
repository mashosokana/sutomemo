//src/app/_components/TrialNotice.tsx
'use client';

type Props = { className?: string };

export default function TrialNotice({ className = '' }: Props) {
  return (
    <div className={`rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-3 text-sm ${className}`}>
      <p className="font-semibold">お試しモード（保存はされません）</p>
      <ul className="list-disc pl-5 mt-1 space-y-1">
        <li>現在の編集内容は <b>サーバに保存されません</b></li>
        <li>画像の <b>ダウンロードは不可</b> です</li>
        <li><b>登録すると</b>：保存・ダウンロード・ダッシュボード管理 が可能になります</li>
      </ul>
    </div>
  );
}
