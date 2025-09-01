// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('LPのCTAボタンが見える', async ({ page }) => {
  const base = process.env.BASE_URL || 'https://sutomemo.vercel.app'
  await page.goto(base, { waitUntil: 'networkidle' })

  const cta = page
    .getByRole('button', { name: /お試しログイン|お試し|ゲスト|ログイン/i })
    .first()

  await expect(cta).toBeVisible({ timeout: 15000 })
})
