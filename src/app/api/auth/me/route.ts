// src/app/api/auth/me/route.ts
import { isGuest, verifyUser } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const result = await verifyUser(req);

  if (!result.user) {
    return jsonNoStore({ error: result.error ?? "Unauthorized" }, { status: result.status });
  }

  return jsonNoStore(
    { role: result.user.role, isGuest: isGuest(result.user) },
    { status: 200 }
  );
}
