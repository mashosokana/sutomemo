// src/app/api/auth/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const r = await verifyUser(req as unknown as Request);
  if (!r.user) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ email: r.user.email, role: r.user.role });
}
