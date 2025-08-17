// src/lib/auth.ts
import { supabaseAdmin } from "./supabaseAdmin";
import { prisma } from "./prisma";

export type AuthUser = { id: string; email: string | null };

export type VerifyUserResult =
  | { user: AuthUser; error: null; status: 200 }
  | { user: null; error: string; status: 401 | 403 };


function readBearer(req: Request) {
  const h =
    req.headers.get("authorization") ??
    req.headers.get("Authorization") ??
    "";
  if (!h) return "";
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

function norm(v?: string | null) {
  return (v ?? "").trim().toLowerCase();
}
export function emailsEqual(a?: string | null, b?: string | null) {
  return norm(a) === norm(b);
}


export async function verifyUser(req: Request): Promise<VerifyUserResult> {
  const token = readBearer(req);
  if (!token) {
    return { user: null, error: "トークンがありません", status: 401 };
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const supaUser = data?.user;

  if (error || !supaUser) {
    return { user: null, error: "認証エラー", status: 401 };
  }

  const email = supaUser.email ?? null;

  await prisma.user.upsert({
    where: { id: supaUser.id },
    update: {},
    create: { id: supaUser.id, email: email ?? "", password: "" },
  });

  return { user: { id: supaUser.id, email }, error: null, status: 200 };
}

export function isGuest(user: AuthUser) {
  return emailsEqual(user.email, process.env.GUEST_USER_EMAIL);
}
export function isAdmin(user: AuthUser) {
  return emailsEqual(user.email, process.env.ADMIN_EMAIL);
}

export async function requireUserOrThrow(req: Request): Promise<AuthUser> {
  const r = await verifyUser(req);
  if (!r.user) {
    throw new Response(r.error ?? "Unauthorized", { status: r.status });
  }
  return r.user;
}
export function assertNotGuestOrThrow(user: AuthUser) {
  if (isGuest(user)) {
    throw new Response("Forbidden (guest)", { status: 403 });
  }
}
export function assertAdminOrThrow(user: AuthUser) {
  if (!isAdmin(user)) {
    throw new Response("Forbidden (admin only)", { status: 403 });
  }
}
