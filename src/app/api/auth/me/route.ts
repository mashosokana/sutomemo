// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const result = await verifyUser(req);
  if (!result.user) {
    return NextResponse.json({ error: result.error ?? "Unauthorized" }, { status: result.status });
  }
  return NextResponse.json({ role: result.user.role });
}
