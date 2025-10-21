// src/components/reels/TextStep.tsx

'use client';

import { useState } from 'react';
import { checkSafety } from '@/lib/reels/safety';

interface TextStepProps {
  onNext: (data: TextData) => void;
  onBack: () => void;
}

export interface TextData {
  industry: string;      // 業種（記述式）
  hookText: string;      // フック
  problem: string;       // Problem（問題提起）
  evidence: string;      // Evidence（根拠・事例）
  action: string;        // Action（行動喚起）
  tags: string[];        // ハッシュタグ
}

/**
 * Step2: AI生成テキスト編集コンポーネント
 * 業種・写真説明・ターゲット・目的を入力してAIで文章生成
 */
export default function TextStep({ onNext, onBack }: TextStepProps) {
  // 入力フィールド
  const [industry, setIndustry] = useState('');
  const [photoDescription, setPhotoDescription] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [purpose, setPurpose] = useState('');

  // AI生成結果
  const [hookText, setHookText] = useState('');
  const [problem, setProblem] = useState('');
  const [evidence, setEvidence] = useState('');
  const [action, setAction] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // UI状態
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safetyWarning, setSafetyWarning] = useState<string | null>(null);

  // AI生成実行
  const handleGenerate = async () => {
    if (!industry.trim()) {
      alert('業種を入力してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSafetyWarning(null);

    try {
      const response = await fetch('/api/reels/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry.trim(),
          photoDescription: photoDescription.trim() || undefined,
          targetCustomer: targetCustomer.trim() || undefined,
          purpose: purpose.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'AI生成に失敗しました');
      }

      const result = await response.json();

      setHookText(result.hook);
      setProblem(result.problem);
      setEvidence(result.evidence);
      setAction(result.action);
      setTags(result.tags || []);
      setHasGenerated(true);
    } catch (err) {
      console.error('Generate error:', err);
      setError(err instanceof Error ? err.message : 'AI生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // リアルタイムNGワードチェック（編集時）
  const checkTextSafety = (text: string) => {
    const allText = `${hookText} ${problem} ${evidence} ${action} ${text}`;
    const result = checkSafety(allText);
    if (result.hasNgWord) {
      setSafetyWarning(
        `⚠️ NGワード検出: ${result.detectedWords.join(', ')}\n${result.suggestions.join('\n')}`
      );
    } else {
      setSafetyWarning(null);
    }
  };

  // 次へ
  const handleNext = () => {
    if (!industry.trim()) {
      alert('業種を入力してください');
      return;
    }
    if (!hookText || !problem || !evidence || !action) {
      alert('AIで文章を生成してください');
      return;
    }

    onNext({
      industry: industry.trim(),
      hookText,
      problem,
      evidence,
      action,
      tags,
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-black">Step 2: AI生成テキスト</h2>

      {/* 入力セクション */}
      <div className="space-y-4 p-4 bg-gray-50 rounded border border-gray-300">
        <h3 className="text-sm font-bold text-black">基本情報を入力</h3>

        <div>
          <label htmlFor="industry" className="block text-sm font-bold text-black mb-1">
            業種 <span className="text-red-500">*必須</span>
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded bg-white text-black"
            placeholder="例: 建設業、美容室、税理士事務所"
            aria-label="業種を入力"
          />
          <p className="text-xs text-gray-600 mt-1">
            理由: 業種を記述式にすることで、5業種の制約から解放され、あらゆるビジネスに対応できます
          </p>
        </div>

        <div>
          <label htmlFor="photoDescription" className="block text-sm font-bold text-black mb-1">
            写真・動画の内容 <span className="text-gray-500">任意</span>
          </label>
          <textarea
            id="photoDescription"
            value={photoDescription}
            onChange={(e) => setPhotoDescription(e.target.value)}
            rows={2}
            className="w-full p-3 border border-gray-300 rounded bg-white text-black"
            placeholder="例: 重機で掘削作業をしている現場"
            aria-label="写真・動画の内容を入力"
          />
          <p className="text-xs text-gray-600 mt-1">
            AIが写真に合った文章を生成します（入力すると精度が向上）
          </p>
        </div>

        <div>
          <label htmlFor="targetCustomer" className="block text-sm font-bold text-black mb-1">
            ターゲット顧客 <span className="text-gray-500">任意</span>
          </label>
          <input
            id="targetCustomer"
            type="text"
            value={targetCustomer}
            onChange={(e) => setTargetCustomer(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded bg-white text-black"
            placeholder="例: 30代の経営者、地元で開業を検討中の方"
            aria-label="ターゲット顧客を入力"
          />
        </div>

        <div>
          <label htmlFor="purpose" className="block text-sm font-bold text-black mb-1">
            投稿の目的 <span className="text-gray-500">任意</span>
          </label>
          <input
            id="purpose"
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded bg-white text-black"
            placeholder="例: 無料相談への誘導、事例紹介、認知拡大"
            aria-label="投稿の目的を入力"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !industry.trim()}
          className="w-full bg-black text-white py-3 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="AIで文章を生成"
        >
          {isGenerating ? '生成中...' : hasGenerated ? '再生成する' : 'AIで文章を生成'}
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-300 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* 生成結果セクション */}
      {hasGenerated && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-black">生成されたテキスト（編集可能）</h3>

          <div>
            <label htmlFor="hook-text" className="block text-sm font-bold text-black mb-1">
              フック（最初の3秒）
            </label>
            <input
              id="hook-text"
              type="text"
              value={hookText}
              onChange={(e) => {
                setHookText(e.target.value);
                checkTextSafety(e.target.value);
              }}
              className="w-full p-3 border border-gray-300 rounded bg-white text-black"
              placeholder="視聴者の興味を引くフック"
              aria-label="フックテキストを編集"
            />
          </div>

          <div>
            <label htmlFor="problem" className="block text-sm font-bold text-black mb-1">
              Problem（問題提起）
            </label>
            <textarea
              id="problem"
              value={problem}
              onChange={(e) => {
                setProblem(e.target.value);
                checkTextSafety(e.target.value);
              }}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded bg-white text-black"
              placeholder="ターゲット顧客の悩み"
              aria-label="Problem部分を編集"
            />
          </div>

          <div>
            <label htmlFor="evidence" className="block text-sm font-bold text-black mb-1">
              Evidence（根拠・事例）
            </label>
            <textarea
              id="evidence"
              value={evidence}
              onChange={(e) => {
                setEvidence(e.target.value);
                checkTextSafety(e.target.value);
              }}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded bg-white text-black"
              placeholder="解決した実例や根拠"
              aria-label="Evidence部分を編集"
            />
          </div>

          <div>
            <label htmlFor="action" className="block text-sm font-bold text-black mb-1">
              Action（行動喚起）
            </label>
            <textarea
              id="action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                checkTextSafety(e.target.value);
              }}
              rows={2}
              className="w-full p-3 border border-gray-300 rounded bg-white text-black"
              placeholder="DMや保存を促す行動"
              aria-label="Action部分を編集"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">
              ハッシュタグ
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 text-black rounded"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((_, i) => i !== index))}
                    className="text-red-500 font-bold"
                    aria-label={`${tag}を削除`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {safetyWarning && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded">
              <p className="text-sm text-black whitespace-pre-line">{safetyWarning}</p>
            </div>
          )}
        </div>
      )}

      {/* ナビゲーション */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 border border-black text-black py-3 rounded font-bold"
          aria-label="前のステップに戻る"
        >
          戻る
        </button>
        <button
          onClick={handleNext}
          disabled={!hasGenerated}
          className="flex-1 bg-black text-white py-3 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="次のステップへ進む"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
