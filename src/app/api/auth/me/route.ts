// src/app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth"; 

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function eqEmail(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

const noStore = { "Cache-Control": "no-store, max-age=0" } as const;

export async function GET(req: Request) {
  const result = await verifyUser(req);

  if (!result.user) {
    return NextResponse.json(
      { error: result.error ?? "Unauthorized" },
      { status: result.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  const guestEmail = process.env.GUEST_USER_EMAIL ?? "";
  const isGuest = guestEmail ? eqEmail(result.user.email, guestEmail) : false;
  
  return NextResponse.json(
    { role: result.user.role, isGuest },
    { headers: noStore }
  );
}

