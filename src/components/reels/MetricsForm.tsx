// src/components/reels/MetricsForm.tsx

'use client';

import { useEffect, useState } from 'react';

interface MetricsFormProps {
  onSubmit: (data: MetricsFormData) => Promise<void>;
  prefilledPostLocalId?: string | null;
}

export interface MetricsFormData {
  postLocalId: string;
  industry: string;     // 記述式に変更
  views: number;
  saves: number;
  dms: number;
  postedAt: string;     // YYYY-MM-DD
}

/**
 * 効果測定ログ入力フォーム（15秒固定）
 */
export default function MetricsForm({ onSubmit, prefilledPostLocalId }: MetricsFormProps) {
  const [postLocalId, setPostLocalId] = useState(() => prefilledPostLocalId ?? '');
  const [industry, setIndustry] = useState('');
  const [views, setViews] = useState(0);
  const [saves, setSaves] = useState(0);
  const [dms, setDms] = useState(0);
  const [postedAt, setPostedAt] = useState(() => {
    // デフォルトは今日
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof prefilledPostLocalId === 'string') {
      setPostLocalId(prefilledPostLocalId);
    }
  }, [prefilledPostLocalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!postLocalId.trim()) {
      alert('投稿IDを入力してください');
      return;
    }

    if (!industry.trim()) {
      alert('業種を入力してください');
      return;
    }

    if (views < 0 || saves < 0 || dms < 0) {
      alert('数値は0以上で入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        postLocalId: postLocalId.trim(),
        industry: industry.trim(),
        views,
        saves,
        dms,
        postedAt,
      });

      // 成功したらフォームをリセット
      setPostLocalId('');
      setIndustry('');
      setViews(0);
      setSaves(0);
      setDms(0);
      alert('ログを記録しました');
    } catch (err) {
      console.error('Submit error:', err);
      alert(err instanceof Error ? err.message : 'ログの記録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded border border-gray-300">
      <h3 className="text-lg font-bold text-black">効果測定を記録</h3>

      <div>
        <label htmlFor="postLocalId" className="block text-sm font-bold text-black mb-1">
          投稿ID（生成時のID）
        </label>
        <input
          id="postLocalId"
          type="text"
          value={postLocalId}
          onChange={(e) => setPostLocalId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-white text-black"
          placeholder="例: 550e8400-e29b-41d4-a716-446655440000"
          required
          aria-label="投稿IDを入力"
        />
      </div>

      <div>
        <label htmlFor="industry" className="block text-sm font-bold text-black mb-1">
          業種
        </label>
        <input
          id="industry"
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-white text-black"
          placeholder="例: 建設業、美容室、税理士事務所"
          required
          aria-label="業種を入力"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="views" className="block text-sm font-bold text-black mb-1">
            再生数
          </label>
          <input
            id="views"
            type="number"
            min="0"
            value={views}
            onChange={(e) => setViews(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded bg-white text-black"
            aria-label="再生数を入力"
          />
        </div>

        <div>
          <label htmlFor="saves" className="block text-sm font-bold text-black mb-1">
            保存数
          </label>
          <input
            id="saves"
            type="number"
            min="0"
            value={saves}
            onChange={(e) => setSaves(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded bg-white text-black"
            aria-label="保存数を入力"
          />
        </div>

        <div>
          <label htmlFor="dms" className="block text-sm font-bold text-black mb-1">
            DM数
          </label>
          <input
            id="dms"
            type="number"
            min="0"
            value={dms}
            onChange={(e) => setDms(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded bg-white text-black"
            aria-label="DM数を入力"
          />
        </div>
      </div>

      <div>
        <label htmlFor="postedAt" className="block text-sm font-bold text-black mb-1">
          投稿日
        </label>
        <input
          id="postedAt"
          type="date"
          value={postedAt}
          onChange={(e) => setPostedAt(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded bg-white text-black"
          aria-label="投稿日を選択"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50"
        aria-label="ログを記録"
      >
        {isSubmitting ? '記録中...' : 'ログを記録'}
      </button>
    </form>
  );
}
