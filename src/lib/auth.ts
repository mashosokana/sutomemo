// src/lib/auth.ts
import { supabaseAdmin } from "./supabaseAdmin";
import { prisma } from "./prisma";
import { PlanTier, Role } from "@prisma/client"; 

export type AuthUser = {
  id: string;
  email: string | null;
  role: Role;
  planTier: PlanTier;
};

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
  if (!email) {
    return { user: null, error: "メールアドレスがありません", status: 401 };
  }

  const desiredRole: Role = emailsEqual(email, process.env.ADMIN_EMAIL)
    ? Role.ADMIN
    : Role.USER;

  const metadataPlan = parsePlanTier(supaUser.user_metadata?.planTier);
  const userInDb = await prisma.user.upsert({
    where: { email },
    create: {
      id: supaUser.id,
      email,
      role: desiredRole,
      planTier: metadataPlan ?? PlanTier.FREE,
    },
    update: {
      role: desiredRole,
      ...(metadataPlan ? { planTier: metadataPlan } : {}),
    },
  });

  return {
    user: {
      id: userInDb.id,
      email: userInDb.email,
      role: userInDb.role,
      planTier: userInDb.planTier,
    },
    error: null,
    status: 200,
  };
}

export function isGuest(user: AuthUser) {
  return emailsEqual(user.email, process.env.GUEST_USER_EMAIL);
}

export function isAdmin(user: AuthUser) {
  return user.role === Role.ADMIN || emailsEqual(user.email, process.env.ADMIN_EMAIL);
}

export async function requireAdminOrThrow(req: Request) {
  const { user } = await verifyUser(req);
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (user.role !== Role.ADMIN) throw Object.assign(new Error("Forbidden"), { status: 403 });
  return user;
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

function parsePlanTier(value: unknown): PlanTier | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toUpperCase();
  return v in PlanTier ? (PlanTier[v as keyof typeof PlanTier] as PlanTier) : null;
}

export function isPaidPlan(user: AuthUser) {
  return user.planTier === PlanTier.PRO || user.planTier === PlanTier.ENTERPRISE;
}

export function assertPaidPlanOrThrow(user: AuthUser) {
  if (!isPaidPlan(user)) {
    throw new Response("Forbidden (paid plan required)", { status: 403 });
  }
}
