// src/lib/authedFetch.ts
export async function authedFetch(
  input: string,
  token: string,
  init: RequestInit = {}
) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Cache-Control', 'no-store');
  return fetch(input, { ...init, headers });
}
