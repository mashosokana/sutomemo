// src/app/api/admin/post-owners/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return { user: null, status: 401 as const, error: "Unauthorized" };
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return { user: null, status: 401 as const, error: "Unauthorized" };
  return { user: data.user, status: 200 as const, error: null };
}

function isAdminUser(email?: string | null): boolean {
  const a = (email ?? "").trim().toLowerCase();
  const b = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  return !!b && a === b;
}

export async function GET(req: Request) {
  const { user, status, error } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error }, { status });
  if (!isAdminUser(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const owners = await prisma.user.findMany({
    take: 50,
    orderBy: { posts: { _count: "desc" } },
    include: { _count: { select: { posts: true } } },
  });

  const result = owners
    .filter((u) => u._count.posts > 0)
    .map((u) => ({ email: u.email, userId: u.id, postCount: u._count.posts }));

  return NextResponse.json({ owners: result }, { status: 200 });
}
