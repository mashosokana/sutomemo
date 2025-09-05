# 共有ボタン/書き出すボタンの設置場所マップ

このドキュメントは、X/Threads のシェア導線および「書き出す」ボタンの設置・実装箇所を素早く把握するための対応表です。

## /app/compose/input 配下（入力→生成→結果表示）

- ページ: `src/app/compose/input/form.tsx`
  - 役割: 入力ページ本体。`<MemoForm />` を組み込み、保存系（書き出す）をトリガー。
  - ボタン: 画面内の「文章を書き出す」は `MemoForm` の `submitLabel` 経由で描画される。

- フォーム/生成: `src/app/_components/MemoForm.tsx`
  - 役割: Sticky入力 + 生成/表示の親。`handleBuzzPreview` で `/api/generate/social-post` を呼び出す。
  - 生成ボタン: 「SNS専用メモを生成する」（関数: `handleBuzzPreview`）。
  - 書き出すボタン: `gate=true` 時は `MemberGateButton`、`gate=false` 時は通常の `<button>`（関数: `handleSubmit`）。
  - 結果表示: 生成完了後に `<ResultsTabs data={...} />` を描画。

- 結果タブUI: `src/app/_components/ResultsTabs.tsx`
  - 役割: X / Threads / Reels / Stories の各結果をタブで表示。
  - シェア/コピー: 各ポスト下に `<ShareX text=.../>` / `<ShareThreads text=.../>` を配置（X/Threads）。コピーは `ShareButtons` 内のボタンで提供。
  - 認証判定: `useAuthMe()` の `isGuest` を参照し、ゲスト時は共有ボタンを `disabled` にして `title` で案内。

- 共有ボタン: `src/app/_components/ShareButtons.tsx`
  - 役割: `<ShareX>` / `<ShareThreads>` コンポーネント。クリックで共有（またはコピー）を実行。
  - 構成: `shareText(text, "x")`（X）/ `shareText(text)`（Threads）。同列に予備の「コピー」ボタンを併設。

- 共有ユーティリティ: `src/utils/share.ts`
  - 役割: 共有優先度ロジック。
  - 順序: 1) `navigator.share({ text })` → 2) X intent（`https://x.com/intent/tweet?text=...`）→ 3) クリップボード（失敗時は alert）。

## /app/posts/[id] 配下（投稿詳細・画像管理）

- 画像管理: `src/app/posts/[id]/PostImageManager.tsx`
  - 役割: 画像サムネイル表示/アップロード/削除。シェア/コピー UI は現時点では未実装。

- 編集導線ボタン: `src/app/posts/[id]/EditButton.tsx`
  - 役割: 「編集する」ボタンで `/compose/input/[id]` に遷移。シェア/コピー UI は持たない。

（補足）`/app/posts/[id]/page.tsx` はこのリポジトリには見当たらず、投稿詳細ページ側でのシェアUIは未実装と推定。詳細側にシェアを追加する場合は、`ResultsTabs` の一部機能を再利用するか、`ShareButtons` を直接利用可能。

## 認証・ゲスト判定

- フック: `src/app/hooks/useAuthMe.ts`
  - 役割: `/api/auth/me` を叩き、`{ role: 'USER'|'ADMIN', isGuest: boolean }` を返す。
  - 利用箇所: `ResultsTabs` で `isGuest === false` を `canShare` 判定に利用。

- API: `src/app/api/auth/me/route.ts`
  - 役割: Supabase 認証済みユーザーのロールと `isGuest` を返却。
  - 判定: `GUEST_USER_EMAIL` とユーザー email を小文字比較して `isGuest` を決定。

- セッションフック: `src/app/hooks/useSupabaseSession.ts`
  - 役割: Supabase の `session` / `token` / `isLoading` を返す。共有ボタンの活性/非活性には直接不使用（必要であれば組み合わせて利用可能）。

## 変更想定ポイントのマップ

- 共有ボタンの表示/制御
  - `ResultsTabs.tsx`: 既に `<ShareX>` / `<ShareThreads>` を挿入済み。`canShare` の条件（`!isGuest`）を変更する場合は本ファイルを修正。
  - `ShareButtons.tsx`: ボタンのスタイル/並び/コピー挙動の調整はここで可能。
  - `utils/share.ts`: 共有優先度/フォールバックロジックを拡張・微調整する場合に編集。

- 投稿詳細側（/posts/[id]）にシェアを追加する場合
  - `PostImageManager.tsx` 等の詳細 UI に `ShareButtons` を配置。文面はサーバ返却やDBの caption から組み立てを検討。

