// src/app/admin/guest-cleanup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import { useSearchParams } from "next/navigation";

type AdminPostLite = {
  id: number;
  caption: string;
  createdAt: string;
  imageCount: number;
  memo: { answerWhy: string; answerWhat: string; answerNext: string } | null;
};

export default function GuestCleanupPage() {
  const { token, session, isLoading } = useSupabaseSession();
  const searchParams = useSearchParams();
  const targetEmail = (searchParams.get("email") ?? "").trim().toLowerCase();
  const targetUserId = (searchParams.get("userId") ?? "").trim();
  const query = targetEmail
    ? `?email=${encodeURIComponent(targetEmail)}`
    : targetUserId
    ? `?userId=${encodeURIComponent(targetUserId)}`
    : "";

  const [items, setItems] = useState<AdminPostLite[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 一覧取得
  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    (async () => {
      setError(null);
      try {
        const res = await fetch(`/api/admin/guest-posts${query}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "load failed");
        setItems(Array.isArray(json.posts) ? json.posts : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "load failed");
      }
    })();
    return () => ac.abort();
  }, [token, query]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return items;
    return items.filter((p) => {
      const text = [
        p.caption,
        p.memo?.answerWhy ?? "",
        p.memo?.answerWhat ?? "",
        p.memo?.answerNext ?? "",
        new Date(p.createdAt).toLocaleDateString("ja-JP"),
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(k);
    });
  }, [items, q]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  };

  // 選択削除
  const del = async () => {
    if (!token) return;
    const ids = Array.from(selected);
    if (ids.length === 0) {
      alert("削除対象を選んでください");
      return;
    }
    if (!confirm(`${ids.length}件を削除します。よろしいですか？`)) return;

    const ac = new AbortController();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/guest-posts${query}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
        signal: ac.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "delete failed");

      setItems((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelected(new Set());
      alert(`削除完了：posts=${json.deleted}, files=${json.removedFiles}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  };

  if (!isLoading && !session) {
    return <div className="p-6">ログインしてください（管理者のみ利用可）</div>;
  }

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white text-black">
      <h1 className="text-xl font-bold mb-4">ゲスト投稿の選択削除（管理者）</h1>

      <div className="mb-4 flex items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索（本文/メモ/日付）"
          className="w-full border rounded px-3 py-2"
        />
        <button className="px-3 py-2 border rounded" onClick={() => setQ("")} disabled={!q}>
          クリア
        </button>
      </div>

      {error ? <div className="mb-4 text-red-600">エラー: {error}</div> : null}

      <div className="mb-2 flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          <span>この一覧の全てを選択</span>
        </label>
        <button
          onClick={del}
          disabled={busy || selected.size === 0}
          className={`px-4 py-2 rounded ${
            selected.size === 0 || busy ? "bg-gray-300" : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {busy ? "削除中..." : `選択を削除 (${selected.size})`}
        </button>
      </div>

      <ul className="divide-y">
        {filtered.map((p) => (
          <li key={p.id} className="py-3 flex items-start gap-3">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex justify-between">
                <div className="font-semibold">{p.caption}</div>
                <div className="text-sm text-gray-500">{new Date(p.createdAt).toLocaleString("ja-JP")}</div>
              </div>
              {p.memo ? (
                <div className="text-sm text-gray-700 mt-1 whitespace-pre-line">
                  {`${p.memo.answerWhy}\n${p.memo.answerWhat}\n${p.memo.answerNext}`}
                </div>
              ) : null}
              <div className="text-xs text-gray-500 mt-1">画像: {p.imageCount} 枚</div>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? <div className="text-gray-500 mt-6">対象の投稿はありません</div> : null}
    </main>
  );
}
