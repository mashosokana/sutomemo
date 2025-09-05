// src/app/_components/ResultsTabs.tsx
"use client";

import { useEffect, useState } from "react";
import type { SocialAll } from "@/app/api/generate/social-post/route";
import { useAuthMe } from "@/app/hooks/useAuthMe";
import { ShareX, ShareThreads } from "./ShareButtons";

type Props = {
  data: SocialAll;
  onActiveTabChange?: (tab: "x" | "threads" | "stories") => void;
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ResultsTabs({ data, onActiveTabChange }: Props) {
  const [tab, setTab] = useState<"x" | "threads" | "stories">("x");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { data: me } = useAuthMe();
  const canShare = !!me && me.isGuest === false; // /api/auth/me が返す isGuest: boolean に基づく
  const shareBlockedMsg = "ゲストはシェア不可 / ログインしてください";
  const disabledReason = canShare ? undefined : shareBlockedMsg;

  useEffect(() => {
    onActiveTabChange?.(tab);
  }, [tab, onActiveTabChange]);

  const xPosts = (data.x && data.x.length > 0 ? data.x : data.posts) ?? [];
  const threads = data.threads ?? [];
  const stories = data.stories ?? [];

  const nothing = xPosts.length === 0 && threads.length === 0 && stories.length === 0;
  if (nothing) {
    return <div className="text-sm text-gray-500">まだ生成していません</div>;
  }

  const tabBtn = (k: typeof tab, label: string) => (
    <button
      key={k}
      onClick={() => setTab(k)}
      className={
        "px-3 py-1 rounded-t border-b-0 border " +
        (tab === k ? "bg-white border-gray-400" : "bg-gray-100 border-transparent hover:bg-gray-200")
      }
    >
      {label}
    </button>
  );

  const handleCopy = async (text: string, key: string) => {
    const ok = await copyText(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((v) => (v === key ? null : v)), 1200);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-2 border-b mb-3">
        {tabBtn("x", "X")}
        {tabBtn("threads", "Threads")}
        {tabBtn("stories", "Stories")}
      </div>

      <div className="border rounded-b p-3 bg-white">
        {tab === "x" && (
          <div className="grid gap-3">
            {xPosts.map((p, i) => (
              <div key={i} className="rounded border p-3 bg-gray-50">
                <pre className="whitespace-pre-wrap leading-relaxed">{p}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ShareX text={p} disabledReason={disabledReason} />
                  <ShareThreads text={p} disabledReason={disabledReason} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "threads" && (
          <div className="grid gap-3">
            {threads.map((p, i) => (
              <div key={i} className="rounded border p-3 bg-gray-50">
                <pre className="whitespace-pre-wrap leading-relaxed">{p}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ShareThreads text={p} disabledReason={disabledReason} />
                  <ShareX text={p} disabledReason={disabledReason} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "stories" && (
          <div className="grid gap-3">
            <div className="rounded border bg-white p-3 text-sm text-gray-800">
              <div className="font-semibold mb-1">Stories（1枚テキスト）ルール</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>1枚で読み切れる文量：最大6行／1行8〜14文字目安（改行で整形）</li>
                <li>1行目は合言葉（7〜12字）＋短いフック</li>
                <li>数字・五感・固有名のうち最低2つを必ず入れる</li>
                <li>比喩は1つまで。絵文字0〜1、ハッシュタグ最大2（汎用語は避ける）</li>
                <li>最後に行動を1つ（保存/試す/質問）</li>
              </ul>
            </div>
            {stories.map((s, i) => {
              const full = typeof s === "string" ? s : String(s ?? "");
              const limited = full.split(/\r?\n/).slice(0, 6).join("\n");
              return (
                <div key={i} className="rounded border p-3 bg-gray-50">
                  <pre className="whitespace-pre-wrap leading-relaxed">{limited}</pre>
                  <div className="flex items-center justify-end mt-3 text-sm">
                    <button
                      onClick={() => handleCopy(limited, `stories-${i}`)}
                      className="bg-black text-white px-3 py-1 rounded hover:opacity-80"
                    >
                      1枚テキストをコピー
                    </button>
                  </div>
                </div>
              );
            })}
            {stories.length === 0 && (
              <div className="text-sm text-gray-500">この媒体は未生成です</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
