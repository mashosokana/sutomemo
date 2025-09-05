# Reels 削除 / Stories 1枚化 影響範囲マップ

## 対象と現状
- 入力/生成ページ: `src/app/compose/input/form.tsx`
  - 役割: 入力ページ本体。`<MemoForm />` を組み込み、保存（書き出す）をトリガー。
- 生成フォーム: `src/app/_components/MemoForm.tsx`
  - 役割: Sticky入力 → 生成API呼び出し（`handleBuzzPreview`）→ 結果タブ表示（`<ResultsTabs />`）。
  - 書き出すボタン表示制御: `writeOutOnlyFor=["reels","stories"]` で Reels/Stories タブ限定（今後Storiesのみへ）
- 結果タブUI: `src/app/_components/ResultsTabs.tsx`
  - タブ: X / Threads / Reels / Stories
  - X/Threads カード下: `<ShareX />` / `<ShareThreads />`（`src/app/_components/ShareButtons.tsx`）
  - Reels カード: `ReelsCard`（台本・segments・コピー）
  - Stories 表示: 3枚構成（frames配列）+「3枚テキストをコピー」
- 共有ユーティリティ: `src/utils/share.ts`
  - 優先度: Web Share → X intent → クリップボード
- 投稿詳細: `src/app/posts/[id]/page.tsx`
  - X/Threads のシェア導線は撤去済み（共有は入力/結果タブ側に集約）

## API スキーマ/プロンプト
- ルート: `src/app/api/generate/social-post/route.ts`
  - 型 `SocialAll = { x: string[]; threads: string[]; reels: ReelsScript[]; stories: StoryScript[]; posts: string[] }`
  - プロンプト/出力: `x, threads, reels, stories, posts` を同時返却（`posts` は `x` の別名）。
  - 受信後の整形: Zodで `x/threads/reels/stories` を検証し、`posts=x` で返却。

## 認証・ゲスト判定の実装位置
- `src/app/hooks/useAuthMe.ts` → `/api/auth/me` の戻り `{ role: 'USER' | 'ADMIN', isGuest: boolean }`
  - 共有ボタン活性条件: `ResultsTabs.tsx` で `canShare = me?.isGuest === false`
- `src/app/api/auth/me/route.ts` → `GUEST_USER_EMAIL` と email の小文字比較で `isGuest` 判定
- `src/app/hooks/useSupabaseSession.ts` → `session/token/isLoading`（生成や保存時のBearer付与に利用）

## 変更マップ（Reels削除 / Stories 1枚化）
1) UI: タブと表示
- `src/app/_components/ResultsTabs.tsx`
  - Reelsタブの削除: タブボタン/分岐/`ReelsCard`呼び出しブロックを削除
  - Stories 1枚化: `stories` の各 `StoryScript.frames` を1枚に固定し、カードUIとコピー文言を「テキストをコピー」に変更（3枚表示/3枚コピーの撤去）
- `src/app/_components/MemoForm.tsx`
  - 書き出し活性条件: `writeOutOnlyFor=["reels","stories"]` → Reels撤去後は `writeOutOnlyFor=["stories"]` に変更（compose/input 呼び出しでも同様）

2) API: スキーマ/プロンプト
- `src/app/api/generate/social-post/route.ts`
  - Reels削除: 型 `SocialAll` から `reels` を削除、Zodの `reels` 検証・切り詰めロジックを削除
  - Stories 1枚化: `ZStoryScript.frames` を「配列長ちょうど1」の検証へ変更、プロンプトの「3枚構成」を「1枚構成」に変更
  - 後方互換: 古いクライアントが `reels` を参照しても落ちないよう、当面は空配列で返却（完全撤去のスケジュールに応じて段階的に）

3) 共有ボタン
- `src/app/_components/ShareButtons.tsx` / `src/utils/share.ts` → 変更不要（X/Threads共通で流用）

4) 投稿詳細ページ
- `src/app/posts/[id]/page.tsx` → 変更不要（シェア導線は既に撤去済み）

## 後方互換の考慮
- サーバレスポンス: `posts`（= `x`）は維持。`reels` は空配列で当面返却 → フロントは表示タブ撤去で非参照に（旧UIが残る環境でも空表示）
- 書き出し活性: Reels撤去に伴い `writeOutOnlyFor` を `stories` のみに変更することでUXを維持

## 手動確認観点（変更後）
- /compose/input:
  - タブ: X / Threads / Stories のみ表示（Reelsが消えている）
  - Stories: 1枚分のテキスト表示、コピーボタンで1枚分のみコピー
  - 「文章を書き出す」: Storiesタブのみ有効（X/Threadsでは非活性/非表示の案内）
  - X/Threads: 共有ボタンは会員のみ活性（ゲストは `title` で案内）
- /posts/[id]: シェア導線が存在しないこと
- ビルド/型/ESLint: `npm run type-check && npm run lint && npm run build` が 0 エラー

