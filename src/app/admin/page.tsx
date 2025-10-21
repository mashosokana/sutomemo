// src/app/admin/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/** ===== 型 ===== */
type CreatedItem = { id: number };
type CreatedResponse = { created: CreatedItem[] };
type ErrorResponse = { error: string };

type GuestPostListItem = {
  id: number;
  caption: string;
  createdAt: string;
  imageCount: number;
  memo: null | { answerWhy: string; answerWhat: string; answerNext: string };
};
type GuestPostsResponse = {
  target: { email?: string; userId?: string };
  posts: GuestPostListItem[];
};
type DeleteResponse = { deleted: number; removedFiles: number };

/** ===== 型ガード ===== */
function isCreatedResponse(x: unknown): x is CreatedResponse {
  return !!x && typeof x === "object" && Array.isArray((x as Record<string, unknown>).created);
}
function isErrorResponse(x: unknown): x is ErrorResponse {
  return !!x && typeof x === "object" && typeof (x as Record<string, unknown>).error === "string";
}
function isGuestPostsResponse(x: unknown): x is GuestPostsResponse {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return Array.isArray(r.posts);
}
function isDeleteResponse(x: unknown): x is DeleteResponse {
  if (!x || typeof x !== "object") return false;
  const r = x as Record<string, unknown>;
  return typeof r.deleted === "number" && typeof r.removedFiles === "number";
}

export default function AdminHome() {
  const router = useRouter();

  const [creating, setCreating] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [msg, setMsg] = useState("");
  const [posts, setPosts] = useState<GuestPostListItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const disabled = useMemo(() => creating || deleting, [creating, deleting]);
  const { total, selected } = useMemo(
    () => ({ total: posts.length, selected: selectedIds.size }),
    [posts.length, selectedIds.size]
  );

  const fetchWithAuth = async (input: RequestInfo, init: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("未ログインです");
    return fetch(input, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  };

  
  const createSample = async () => {
    setCreating(true);
    setMsg("");
    try {
      const res = await fetchWithAuth("/api/admin/guest-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: "（サンプル）今日やったこと",
          why: "なぜ：学習記録を残すため",
          what: "やったこと：管理ガードの実装",
          next: "次にやる：E2Eを追加",
          status: "published",
          count: 1
        }),
      });

      let json: unknown = null;
      try { json = await res.json(); } catch {}
      if (!res.ok) {
        const message = isErrorResponse(json) ? json.error : String(res.status);
        setMsg(`作成失敗: ${message}`);
        return;
      }

      if (isCreatedResponse(json)) {
        const firstId = json.created[0]?.id;
        if (firstId) {
          router.push(`/posts/${firstId}`);
          return;
        }
        setMsg("作成OK: ただしID取得に失敗しました");
      } else {
        setMsg("作成OK: 応答形式を確認できませんでした");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ネットワークエラーが発生しました");
    } finally {
      setCreating(false);
    }
  };

  const fetchGuestPosts = useCallback(async () => {
    setFetching(true);
    setMsg("");
    try {
      const res = await fetchWithAuth("/api/admin/guest-posts", { method: "GET" });
      let json: unknown = null;
      try { json = await res.json(); } catch {}
      if (!res.ok) {
        const message = isErrorResponse(json) ? json.error : String(res.status);
        setMsg(`一覧取得失敗: ${message}`);
        return;
      }
      if (isGuestPostsResponse(json)) {
        setPosts(json.posts);
        setSelectedIds(new Set());
        setMsg(`一覧取得OK: ${json.posts.length}件`);
      } else {
        setMsg("一覧取得OK: 応答形式を確認できませんでした");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ネットワークエラーが発生しました");
    } finally {
      setFetching(false);
    }
  }, []);

  const deleteSelected = async () => {
    if (selectedIds.size === 0) {
      setMsg("削除対象が選択されていません");
      return;
    }
    setDeleting(true);
    setMsg("");
    try {
      const ids = Array.from(selectedIds);
      const res = await fetchWithAuth("/api/admin/guest-posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      let json: unknown = null;
      try { json = await res.json(); } catch {}
      if (!res.ok) {
        const message = isErrorResponse(json) ? json.error : String(res.status);
        setMsg(`削除失敗: ${message}`);
        return;
      }
      if (isDeleteResponse(json)) {
        setMsg(`削除OK: ${json.deleted}件（画像 ${json.removedFiles} ファイル）`);
        void fetchGuestPosts();
      } else {
        setMsg("削除OK: 応答形式を確認できませんでした");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "ネットワークエラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => { void fetchGuestPosts(); }, [fetchGuestPosts]);

  return (
    <main className="p-6 space-y-6">
      <section className="space-y-2">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">
          サンプルを作成したら通常の編集ページに移動し、そこで画像を追加してください。
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">① ゲストのサンプルメモを作成</h2>
        <button
          onClick={() => void createSample()}
          disabled={disabled}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {creating ? "作成中…" : "サンプルを1件作成して編集へ"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold">② ゲスト投稿の一覧と削除</h2>
          <button
            onClick={() => void fetchGuestPosts()}
            disabled={fetching}
            className="px-3 py-1 rounded border"
          >
            {fetching ? "再読込中…" : "再読込"}
          </button>
          <button
            onClick={() => {
              if (selectedIds.size === posts.length) setSelectedIds(new Set());
              else setSelectedIds(new Set(posts.map(p => p.id)));
            }}
            className="px-3 py-1 rounded border"
          >
            {selectedIds.size === posts.length ? "全解除" : "全選択"}
          </button>
          <button
            onClick={() => void deleteSelected()}
            disabled={deleting || selectedIds.size === 0}
            className="px-3 py-1 rounded bg-red-600 text-white disabled:opacity-50"
          >
            {deleting ? "削除中…" : `選択を削除（${selected}/${total}）`}
          </button>
        </div>

        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 w-10"></th>
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Caption</th>
                <th className="p-2 text-left">Images</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const checked = selectedIds.has(p.id);
                return (
                  <tr key={p.id} className="border-t">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedIds);
                          if (e.target.checked) next.add(p.id);
                          else next.delete(p.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td className="p-2">{p.id}</td>
                    <td className="p-2">{p.caption}</td>
                    <td className="p-2">{p.imageCount}</td>
                    <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                    <td className="p-2">
                      <a
                        href={`/posts/${p.id}`}
                        className="underline text-blue-600"
                      >
                        編集へ
                      </a>
                    </td>
                  </tr>
                );
              })}
              {posts.length === 0 && (
                <tr>
                  <td className="p-3 text-gray-500" colSpan={6}>データがありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!!msg && <p className="text-sm text-gray-700">{msg}</p>}
    </main>
  );
}
