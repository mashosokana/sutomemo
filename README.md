This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 使い方（Sticky-7 入力と 4 媒体出力）

本アプリは「記憶に残る短文」を生成します。入力の負荷を下げるため、5つの補助質問（Sticky-7 の一部）を用意し、4媒体（X / Threads / Reels 台本 / Stories 3枚）で同時出力します。

### 入力（すべて任意・空欄可）
- 今日をひと言: 合言葉（7〜12文字）に相当（`tagline`）。
- どこ / 何 / 誰: 舞台や道具・登場人物（`place` / `tool` / `people`）。
- 数字: 回数・割合・時間など（カンマ区切り、`numbers`）。
- 感覚: 五感のヒント（見える/匂う/触れる/音 等、`sense`）。
- してほしい行動: 保存/試す/質問などのCTA（`cta`）。

空欄は送信前に省略され、API の `sticky` には含まれません（既定で自動補完が働きます）。

### 出力（4タブ表示）
- X: 140〜220字 / 改行≤3 / 箇条書き2–4点 / 1行目は合言葉＋フック。コピー可。
- Threads: 200〜350字 / 改行≤6 / 箇条書き3–6点 / 会話1行を含む。コピー可。
- Reels台本: 30秒想定、3–5セグメント。各セグメントはタイムコード表示（例: `00–03s`）＋ `visual｜voice｜on_screen`。整形テキストを一括コピー可。
- Stories(3枚): 3フレーム（1枚目=合言葉 / 2枚目=チェック式 / 3枚目=質問 or スタンプ）。各フレームのステッカーバッジ表示。3枚分一括コピー可。

例（スクリーンショット）:

![Sticky-7 タブUIの例](docs/img/sutomemo-sticky-tabs.png)
