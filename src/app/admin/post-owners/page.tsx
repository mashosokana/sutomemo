"use client";

import { useEffect, useState } from "react";
import { useSupabaseSession } from "@/app/hooks/useSupabaseSession";
import Link from "next/link";

type Owner = { email: string; userId: string; postCount: number };

export default function PostOwnersPage() {
  const { token, session, isLoading } = useSupabaseSession();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    const ac = new AbortController();
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/post-owners", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: ac.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "load failed");
        setOwners(Array.isArray(json.owners) ? json.owners : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "load failed");
      } finally {
        setBusy(false);
      }
    })();
    return () => ac.abort();
  }, [token]);

  if (!isLoading && !session) return <div className="p-6">ログインしてください（管理者のみ）</div>;

  return (
    <main className="max-w-3xl mx-auto p-6 bg-white text-black">
      <h1 className="text-xl font-bold mb-4">投稿を持つユーザー一覧（管理者）</h1>

      {error ? <div className="mb-4 text-red-600">エラー: {error}</div> : null}
      {busy ? <div className="mb-4">読み込み中...</div> : null}

      <ul className="divide-y">
        {owners.map((o) => {
          const label = o.email || "(メール未設定)";
          const href = o.email
            ? `/admin/guest-cleanup?email=${encodeURIComponent(o.email)}`
            : `/admin/guest-cleanup?userId=${encodeURIComponent(o.userId)}`;
          return (
            <li key={o.userId} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold">{label}</div>
                <div className="text-xs text-gray-500">posts: {o.postCount}</div>
              </div>
              <Link className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" href={href}>
                このユーザーの投稿を見る
              </Link>
            </li>
          );
        })}
      </ul>

      {owners.length === 0 ? <div className="text-gray-500 mt-6">投稿を持つユーザーはいません</div> : null}
    </main>
  );
}
