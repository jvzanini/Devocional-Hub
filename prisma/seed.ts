import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL || "admin@devocional.com";
  const password = process.env.SEED_PASSWORD || "changeme";
  const name = process.env.SEED_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuário ${email} já existe.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, password: hashed, name },
  });

  console.log(`Usuário criado: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
