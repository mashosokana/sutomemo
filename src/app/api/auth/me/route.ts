// src/app/api/auth/me/route.ts
import { verifyUser, isPaidPlan } from "@/lib/auth"; 
import { jsonNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function eqEmail(a?: string | null, b?: string | null) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function GET(req: Request) {
  const result = await verifyUser(req);

  if (!result.user) {
    return jsonNoStore({ error: result.error ?? "Unauthorized" }, { status: result.status });
  }

  const guestEmail = process.env.GUEST_USER_EMAIL ?? "";
  const isGuest = guestEmail ? eqEmail(result.user.email, guestEmail) : false;
  return jsonNoStore(
    {
      role: result.user.role,
      planTier: result.user.planTier,
      isGuest,
      isPaid: isPaidPlan(result.user),
    },
    { status: 200 }
  );
}
