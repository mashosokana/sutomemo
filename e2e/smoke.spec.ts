// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test('LPに体験用CTAが表示される', async ({ page }) => {
  const base = process.env.BASE_URL || 'https://sutomemo.vercel.app'
  await page.goto(base, { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveTitle(/suto|memo|sutome|メモ/i)

  await expect(
    page.getByText(/お試しログイン|お試し|ゲスト|体験|ログイン/i)
  ).toBeVisible({ timeout: 15000 })
})

