//src/app/_components/MemoForm.tsx

"use client";

import { useState } from "react";
import MemberGateButton from "./MemberGateButton";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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

type GenState = { loading: boolean; posts: string[]; error?: string };

export default function MemoForm(props: MemoFormProps) {
  const {
    caption, answerWhy, answerWhat, answerNext,
    onCaptionChange, onWhyChange, onWhatChange, onNextChange,
    onSubmit, submitLabel, gate = true, guestLabel = "登録して書き出す",
  } = props;

  const supabase = createClientComponentClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gen, setGen] = useState<GenState>({ loading: false, posts: [] });

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ★ ここが「バズ用に整形（プレビュー）」の処理
  const handleBuzzPreview = async (): Promise<void> => {
    try {
      if (gen.loading) return;
      setGen({ loading: true, posts: [] });

      // Bearer必須：Supabaseのセッションからトークン取得
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("アクセストークンがありません。先にゲストログイン/ログインしてください。");
      }

      // 4つの回答＋captionを1つのメモにまとめる
      const memoText = [
        `やったこと/学んだこと:\n${caption}`,
        `なぜメモしたのか:\n${answerWhy}`,
        `何が起きた/どう感じたか:\n${answerWhat}`,
        `次に何をする/教訓:\n${answerNext}`,
      ].join("\n\n");

      // 事前チェック（最低10文字程度）
      if (memoText.replace(/\s+/g, "").length < 10) {
        setGen({
           loading: false,
           posts: [],
           error: "メモが短すぎます。もう少し内容を書いてから整形してください。",
         });
         return;
       }

      // 生成API呼び出し
      const res = await fetch("/api/generate/social-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ← 重要
        },
        body: JSON.stringify({ memo: memoText, platform: "x", variants: 2 }),
        cache: "no-store",
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (typeof errJson?.error === "string") msg = errJson.error;
        } catch {
          const text = await res.text();
          if (text) msg = text;
        }
        throw new Error(msg);
      }
        
        const json = await res.json();
        const posts = Array.isArray(json?.posts) && json.posts.every((s: unknown) => typeof s === "string")
          ? (json.posts as string[])
          : [];
        setGen({ loading: false, posts });
    } catch (e) {
      setGen({
        loading: false,
        posts: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  // 生成案をcaptionに反映
  const adoptToCaption = (text: string) => {
    onCaptionChange(text);
    // 必要ならスクロールや通知などを追加
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

      {/* ▼ ここが新規追加：バズ整形UI */}
      <div className="rounded border p-3 space-y-3">
        <div className="flex items-center gap-4 justify-center">

          <button
            onClick={handleBuzzPreview}
            disabled={gen.loading}
            className="min-w-[300px] bg-black text-white px-4 py-2 rounded hover:opacity-80 transition"
          >
            {gen.loading ? "生成中…" : "SNS専用メモを生成する"}
          </button>
        </div>

        {gen.error && <p className="text-red-600 text-sm">{gen.error}</p>}

        {gen.posts.length > 0 && (
          <div className="grid gap-3">
            {gen.posts.map((p, i) => (
              <div key={i} className="rounded border p-3 bg-gray-50">
                <div className="opacity-70 text-xs mb-2">案 {i + 1}</div>
                <pre className="whitespace-pre-wrap leading-relaxed">{p}</pre>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => adoptToCaption(p)}
                    className="bg-black text-white px-3 py-1 rounded text-sm hover:opacity-80"
                  >
                    この案をcaptionに反映
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
