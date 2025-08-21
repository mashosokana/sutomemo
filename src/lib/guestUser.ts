//src/lib/guestUser.ts
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function ensureGuestUser() {
  const email = (process.env.GUEST_USER_EMAIL ?? "").trim();
  if (!email) throw new Error("GUEST_USER_EMAIL is not set");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({ data: { email, role: Role.USER } });
}
