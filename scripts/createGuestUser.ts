// scripts/createGuestUser.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const guestEmail = "guest@sutomemo.app";
  const plainPassword = "guestpass";

  // すでに存在していたらスキップ
  const existing = await prisma.user.findUnique({ where: { email: guestEmail } });
  if (existing) {
    console.log("ゲストユーザーはすでに存在します。");
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: guestEmail,
      password: hashedPassword,
    },
  });

  console.log("✅ ゲストユーザー作成完了:", user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
