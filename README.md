# SutoMemo
[![E2E (prod smoke)](https://github.com/mashosokana/sutomemo/actions/workflows/e2e.yml/badge.svg)](https://github.com/mashosokana/sutomemo/actions/workflows/e2e.yml)

**学びをメモにし、投稿下書きと画像作成までを一続きにするWebサービス**

---

## リンク / すぐ触る
- **本番URL**：https://sutomemo.vercel.app  
- **ゲストログイン**：トップの「お試しログイン」ボタンで即体験（メール不要）

---

## このアプリの特徴（3つ）
- **LP → ワンクリック体験 → ダッシュボード**（初回30秒想定）
- **投稿下書き生成 / 画像オーバーレイ（ウォーターマーク）**
- **X / Threads 共有導線**＋**学習メモ（Why/What/Next）**で“ふりかえり”を促進

---

## スクリーンショット

| トップ(LP) | ダッシュボード |
|---|---|
| ![lp](docs/img/lp.png) | ![dashboard](docs/img/dashboard.png) |

| 画像オーバーレイ |
|---|
| ![overlay](docs/img/overlay.png) |

---

## 機能一覧（抜粋）
- **初回体験の最短化**：LP→ワンクリック体験→ダッシュボード
- **投稿下書き生成**：テンプレ×生成APIで“10分でSNS量産”を支援
- **画像オーバーレイ**：キャンバスにテキスト/ロゴを重ねて書き出し
- **共有導線**：X / Threads へ即共有、コピー支援
- **学習メモ（Why/What/Next）**：1フォームで振り返りを蓄積
- **ゲストログイン**：メール不要で中身を確認可能

---

## 使用技術（Tech Stack）
| Category | Stack |
|---|---|
| Frontend | TypeScript, Next.js (App Router), Tailwind CSS, shadcn/ui |
| Backend | Next.js Route Handlers, Prisma |
| BaaS/DB | Supabase (Auth / PostgreSQL / RLS) |
| Infra | Vercel（Preview/本番デプロイ） |
| Test | Playwright（E2E） |
| CI/CD | GitHub Actions（E2E on prod） |
| Design/Docs | Figma, Mermaid |
| Others | ESLint, Prettier |

---

## システム構成（Mermaid）
```mermaid
flowchart LR
  User((User)) -->|HTTP| Next[Next.js App]
  Next -->|Auth| SupabaseAuth[Supabase Auth]
  Next -->|SQL via Prisma| DB[(Supabase PostgreSQL)]
  Next -->|Deploy| Vercel[Vercel]
```

## ER 図（Mermaid）
```mermaid
erDiagram
  users ||--o{ posts : has
  users ||--o{ memos : has
  posts ||--o{ assets : has

  users {
    uuid id PK
    text display_name
    text email
    timestamp created_at
  }

  posts {
    uuid id PK
    uuid user_id FK
    text title
    text body
    text status
    timestamp created_at
    timestamp updated_at
  }

  memos {
    uuid id PK
    uuid user_id FK
    text answer_why
    text answer_what
    text answer_next
    timestamp created_at
  }

  assets {
    uuid id PK
    uuid post_id FK
    text url
    text kind
    timestamp created_at
  }
```

---

## 開発者向け（セットアップ）
### 必要環境
- Node.js 18+（推奨 20）

### セットアップ
```bash
npm i
cp .env.example .env   # 値を設定してください
npm run dev            # http://localhost:3000
```

`.env.example` 例：
```dotenv
NEXT_PUBLIC_APP_URL=https://sutomemo.vercel.app
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NODE_ENV=development
```

---

## テスト / CI
- **目的**：本番URLで**導線が生きているか**のスモーク確認
- **実行**
```bash
# 依存
npm i -D @playwright/test && npx playwright install
# テスト（本番URLに対して）
BASE_URL=https://sutomemo.vercel.app npx playwright test e2e/*.spec.ts
```
- **CI**：`/.github/workflows/e2e.yml`（push/PR時に自動実行、バッジ更新）

---

## 今後の展望（Roadmap）
1. **初回体験の磨き込み**：LP訴求とCTAのAB、オンボーディング微調整  
2. **ドラフト生成の精度向上**：テンプレ拡充、タイプ別最適化  
3. **画像オーバーレイ強化**：レイヤ/テンプレ、出力プリセット  
4. **計測の強化**：イベント計測→振り返りダッシュボード  
5. **ユニットテスト追加**：コンポーネント/ユースケースの最小網羅  

---

## 作者
- 郡司 守（ぐんじ まもる）  
  - 代表取締役 / 営業コンサル → **未経験エンジニア挑戦中**  
  - 現場の課題解像度 × 実装で、**課題→実装→計測**を最短で回します
