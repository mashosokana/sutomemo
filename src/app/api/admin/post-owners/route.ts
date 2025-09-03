// src/app/api/admin/post-owners/route.ts
import { prisma } from "@/lib/prisma";
import { requireAdminOrThrow } from "@/lib/auth";
import { jsonNoStore } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminOrThrow(req);
    const owners = await prisma.user.findMany({
      take: 50,
      orderBy: { posts: { _count: "desc" } },
      include: { _count: { select: { posts: true } } },
    });

    const result = owners
      .filter((u) => u._count.posts > 0)
      .map((u) => ({ email: u.email, userId: u.id, postCount: u._count.posts }));

    return jsonNoStore({ owners: result }, { status: 200 });
  } catch (err: unknown) {
    const status = typeof (err as { status?: unknown }).status === "number" ? (err as { status: number }).status : 401;
    const message = typeof (err as { message?: unknown }).message === "string" ? (err as { message: string }).message : "Unauthorized";
    return jsonNoStore({ error: message }, { status });
  }
}
