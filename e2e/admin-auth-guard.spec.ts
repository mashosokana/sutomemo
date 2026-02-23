import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://sutomemo.vercel.app';

type GuestLoginResponse = {
  ok?: boolean;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
};

function readSupabaseProjectRef(accessToken: string): string {
  const [, payloadSegment] = accessToken.split('.');
  const payloadText = Buffer.from(payloadSegment ?? '', 'base64url').toString('utf8');
  const payload = JSON.parse(payloadText) as { iss?: string };
  const issuer = payload.iss ?? '';
  const hostname = new URL(issuer).hostname;
  return hostname.split('.')[0] ?? '';
}

async function loginAsGuestByStorageInjection(
  page: Page,
  request: APIRequestContext
) {
  const res = await request.post(`${BASE_URL}/api/auth/guest-login`);
  expect(res.ok()).toBeTruthy();

  const json = (await res.json()) as GuestLoginResponse;
  expect(json.ok).toBeTruthy();
  expect(json.access_token).toBeTruthy();
  expect(json.refresh_token).toBeTruthy();
  expect(json.expires_at).toBeTruthy();

  const projectRef = readSupabaseProjectRef(json.access_token as string);
  const storageKey = `sb-${projectRef}-auth-token`;
  const cookiePayload = JSON.stringify([
    json.access_token,
    json.refresh_token,
    null,
    null,
    null,
  ]);

  await page.context().addCookies([
    {
      name: storageKey,
      value: encodeURIComponent(cookiePayload),
      url: BASE_URL,
    },
  ]);

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
}

test.describe('admin auth guard', () => {
  test('redirects unauthenticated users from /admin to /login', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/, { timeout: 15000 });
  });

  test('redirects non-admin users away from /admin', async ({ page, request }) => {
    await loginAsGuestByStorageInjection(page, request);
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible({
      timeout: 30000,
    });

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(?:\?.*)?$/, { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible({
      timeout: 15000,
    });
  });
});
