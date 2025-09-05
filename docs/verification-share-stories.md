# 手動チェック結果（想定）と確認観点

- 型/ビルド/ESLint: `npm run type-check && npm run lint && npm run build` → 0 エラー（想定）
- /compose/input:
  - X/Threads タブ: `<ShareX>` / `<ShareThreads>` が表示。会員は活性、ゲストは disabled + title「ゲストはシェア不可 / ログインしてください」
  - Stories タブ: 生成案（variants 件）がカードで表示。各カードは最大6行の整形表示。「1枚テキストをコピー」動作OK
  - 「文章を書き出す」: Stories タブでのみ表示/活性（ゲストも可）。X/Threads ではボタン非表示
- /posts/[id]: X/Threads のシェアボタンなし（撤去済み）。編集/ダウンロード等の管理UIは従来通り
- Network: `/api/generate/social-post` レスポンスは `{ x, threads, stories, posts }`。`posts === x`（同一配列）を確認（想定）

補足
- Stories は 1枚用テキスト（最大6行、1行8〜14字目安）に整形。1行目に合言葉（7〜12字）+フック、数字/五感/固有名から2つ以上、最後に行動（保存/試す/質問）を含む仕様にプロンプトを厳密化済み。
