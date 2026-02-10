import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "vaboszqtrcvhxsxezlvz.supabase.co";
  }
})();

const SUPABASE_ORIGIN = `https://${SUPABASE_HOST}`;
const SUPABASE_WS = `wss://${SUPABASE_HOST}`;

const APP_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://sutomemo.vercel.app").origin;
  } catch {
    return "https://sutomemo.vercel.app";
  }
})();

const generateNonce = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
};

const buildCsp = (nonce: string) => {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
};

const appendVaryHeader = (response: NextResponse, value: string) => {
  const existing = response.headers.get("Vary");
  if (!existing) {
    response.headers.set("Vary", value);
    return;
  }
  const values = new Set(existing.split(",").map((item) => item.trim()));
  values.add(value);
  response.headers.set("Vary", Array.from(values).join(", "));
};

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (request.nextUrl.pathname.startsWith("/api")) {
    const origin = request.headers.get("origin");
    if (origin && origin === APP_ORIGIN) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      appendVaryHeader(response, "Origin");
    }

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
