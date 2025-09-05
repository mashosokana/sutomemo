//src/app/_components/MemoForm.tsx

"use client";

import { useState } from "react";
import MemberGateButton from "./MemberGateButton";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import ResultsTabs from "./ResultsTabs";
import StickyInputsForm from "./StickyInputsForm";
import type { SocialAll } from "@/app/api/generate/social-post/route";

type MemoFormProps = {
  caption: string;
  onCaptionChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  gate?: boolean;
  guestLabel?: string;
  // deprecated (UI非表示): 残存呼び出し互換のため
  answerWhy?: string;
  answerWhat?: string;
  answerNext?: string;
  onWhyChange?: (v: string) => void;
  onWhatChange?: (v: string) => void;
  onNextChange?: (v: string) => void;
  // 追加: 書き出し可能タブの制限（未指定なら全タブで可）
  writeOutOnlyFor?: ("x" | "threads" | "stories")[];
};

type GenState = { loading: boolean; data: SocialAll | null; error?: string };

export default function MemoForm(props: MemoFormProps) {
  const { onSubmit, submitLabel, gate = true, guestLabel = "登録して書き出す", writeOutOnlyFor } = props;

  const supabase = createClientComponentClient();

  // Sticky UI state（空欄OK）
  const [stickyUI, setStickyUI] = useState({
    tagline: "",
    place: "",
    tool: "",
    people: "",
    numbers: "",
    sense: "",
    cta: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gen, setGen] = useState<GenState>({ loading: false, data: null });
  const [activeTab, setActiveTab] = useState<"x" | "threads" | "stories" | null>(null);

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
      setGen({ loading: true, data: null });

      // Bearer必須：Supabaseのセッションからトークン取得
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) throw error;
      const token = sessionData.session?.access_token;
      if (!token) {
        throw new Error("アクセストークンがありません。先にゲストログイン/ログインしてください。");
      }

      // Sticky入力からメモ本文を構成（caption入力は撤去）
      const normalizeLocal = (s: string) => (s ?? "").trim();
      const nums = (stickyUI.numbers ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      const parts: string[] = [];
      if (normalizeLocal(stickyUI.tagline)) parts.push(`合言葉:\n${normalizeLocal(stickyUI.tagline)}`);
      if (normalizeLocal(stickyUI.place)) parts.push(`場所:\n${normalizeLocal(stickyUI.place)}`);
      if (normalizeLocal(stickyUI.tool)) parts.push(`道具:\n${normalizeLocal(stickyUI.tool)}`);
      if (normalizeLocal(stickyUI.people)) parts.push(`人物:\n${normalizeLocal(stickyUI.people)}`);
      if (nums.length) parts.push(`数字:\n${nums.join(", ")}`);
      if (normalizeLocal(stickyUI.sense)) parts.push(`感覚:\n${normalizeLocal(stickyUI.sense)}`);
      if (normalizeLocal(stickyUI.cta)) parts.push(`CTA:\n${normalizeLocal(stickyUI.cta)}`);
      const memoText = parts.join("\n\n");

      // 事前チェック（最低10文字程度）
      if (memoText.replace(/\s+/g, "").length < 10) {
        setGen({
          loading: false,
          data: { x: [], threads: [], stories: [], posts: [] },
          error: "メモが短すぎます。もう少し内容を書いてから整形してください。",
        });
        return;
      }

      // 生成API呼び出し
      // sticky: 空欄は送らないように undefined を除外して送る
      const normalize = (s: string) => {
        const v = (s ?? "").trim();
        return v.length > 0 ? v : undefined;
      };
      const parseNumbers = (s: string) => {
        const arr = (s ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        return arr.length > 0 ? arr : undefined;
      };
      const omitUndefined = <T extends object>(obj: T): Partial<T> => {
        type Entries<U> = { [K in keyof U]-?: [K, U[K]] }[keyof U][];
        const entries = Object.entries(obj).filter(([, v]) => v !== undefined) as Entries<T>;
        return Object.fromEntries(entries) as Partial<T>;
      };

      const stickyPayload = omitUndefined({
        tagline: normalize(stickyUI.tagline),
        place: normalize(stickyUI.place),
        tool: normalize(stickyUI.tool),
        people: normalize(stickyUI.people),
        numbers: parseNumbers(stickyUI.numbers),
        sense: normalize(stickyUI.sense),
        cta: normalize(stickyUI.cta),
      });

      const body = {
        memo: memoText,
        platform: "x" as const,
        variants: 2 as const,
        sticky: Object.keys(stickyPayload).length > 0 ? stickyPayload : undefined,
        targets: ["x", "threads", "stories"] as const,
      };

      const res = await fetch("/api/generate/social-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ← 重要
        },
        body: JSON.stringify(body),
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
      // 緩いガードでサーバ返却を受け入れ（不足時は空配列）
      const x = Array.isArray(json?.x)
        ? json.x.filter((s: unknown) => typeof s === "string")
        : Array.isArray(json?.posts)
          ? json.posts.filter((s: unknown) => typeof s === "string")
          : [];
      const threads = Array.isArray(json?.threads)
        ? json.threads.filter((s: unknown) => typeof s === "string")
        : [];
      const stories = Array.isArray(json?.stories)
        ? json.stories.filter((s: unknown) => typeof s === "string")
        : [];
      const data: SocialAll = { x, threads, stories, posts: x };
      setGen({ loading: false, data });
    } catch (e) {
      setGen({
        loading: false,
        data: { x: [], threads: [], stories: [], posts: [] },
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="space-y-4 bg-white text-black">
      {/* ▼ 生成結果表示（媒体別タブ） */}
      <div className="rounded border p-3 space-y-3">
        {/* Sticky 補助入力 */}
        <StickyInputsForm
          values={stickyUI}
          onChange={(p) => setStickyUI((prev) => ({ ...prev, ...p }))}
        />

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

        {gen.data ? (
          <ResultsTabs data={gen.data} onActiveTabChange={setActiveTab} />
        ) : (
          <div className="text-sm text-gray-500">まだ生成していません</div>
        )}
      </div>

      {/* ▼ 既存：保存/ゲート */}
      {(() => {
        const allowByTab = !writeOutOnlyFor || (activeTab !== null && writeOutOnlyFor.includes(activeTab));
        if (!allowByTab) return null;
        return gate ? (
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
        );
      })()}
    </div>
  );
}
