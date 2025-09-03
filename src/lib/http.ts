import { NextResponse } from 'next/server';

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const;

function mergeHeaders(base?: HeadersInit, extra?: Record<string, string>): Headers {
  const h = new Headers(base);
  if (extra) Object.entries(extra).forEach(([k, v]) => h.set(k, v));
  return h;
}
export function withNoStore(init?: ResponseInit): ResponseInit {
  const headers = mergeHeaders(init?.headers, NO_STORE);
  return { ...(init ?? {}), headers };
}
export function jsonNoStore<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, withNoStore(init));
}
export function jsonError(status: number, error: string, details?: unknown) {
  const body = details === undefined ? { error } : { error, details };
  return jsonNoStore(body, { status });
}
export function ok() {
  return jsonNoStore({ ok: true }, { status: 200 });
}
