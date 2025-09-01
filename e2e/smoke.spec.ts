// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('LPで「お試しログイン」ボタンが見える', async ({ page }) => {
  const base = process.env.BASE_URL || 'https://sutomemo.vercel.app' // ←本番URL
  await page.goto(base)
  await expect(page.getByRole('button', { name: /お試し|ゲスト|ログイン/i })).toBeVisible()
})
