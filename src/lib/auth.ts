// src/lib/auth.ts

import { supabaseAdmin } from "./supabaseAdmin";
import { prisma } from "./prisma";

export async function verifyUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return { user: null, error: "トークンがありません", status: 401 };
  }

  const  { data, error } = await supabaseAdmin.auth.getUser(token);
  const user = data?.user;

  if (error || !user) {
    return { user: null, error: "認証エラー", status: 401 };
  }

  await prisma.user.upsert({
    where: { id:user.id },
    update: {},
    create: { id: user.id },
  });

  return { user, error: null, status: 200 };
}