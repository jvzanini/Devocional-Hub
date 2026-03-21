import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ─── Seed do usuário admin ──────────────────────────────────────────
  const email = process.env.SEED_EMAIL || "admin@devocional.com";
  const password = process.env.SEED_PASSWORD || "changeme";
  const name = process.env.SEED_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Migrar ADMIN → SUPER_ADMIN se necessário
    if (existing.role === "ADMIN") {
      await prisma.user.update({
        where: { email },
        data: { role: "SUPER_ADMIN" },
      });
      console.log(`Usuário ${email} migrado de ADMIN para SUPER_ADMIN.`);
    } else {
      console.log(`Usuário ${email} já existe (${existing.role}).`);
    }
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: { email, password: hashed, name, role: "SUPER_ADMIN" },
    });
    console.log(`Usuário criado: ${email} (SUPER_ADMIN)`);
  }

  // ─── Migrar todos os ADMIN existentes para SUPER_ADMIN ─────────────
  const adminsToMigrate = await prisma.user.findMany({
    where: { role: "ADMIN" },
  });
  if (adminsToMigrate.length > 0) {
    await prisma.user.updateMany({
      where: { role: "ADMIN" },
      data: { role: "SUPER_ADMIN" },
    });
    console.log(`${adminsToMigrate.length} usuário(s) migrado(s) de ADMIN para SUPER_ADMIN.`);
  }

  // ─── Seed de permissões padrão ─────────────────────────────────────
  const defaultPermissions = [
    { resource: "document:video", minRole: "ADMIN" },
    { resource: "document:slides", minRole: "MEMBER" },
    { resource: "document:mind_map", minRole: "MEMBER" },
    { resource: "document:bible_text", minRole: "MEMBER" },
    { resource: "menu:planning", minRole: "ADMIN" },
    { resource: "menu:subscriptions", minRole: "SUPER_ADMIN" },
  ];

  for (const perm of defaultPermissions) {
    await prisma.permission.upsert({
      where: { resource: perm.resource },
      update: {},
      create: { resource: perm.resource, minRole: perm.minRole as never },
    });
  }
  console.log(`${defaultPermissions.length} permissões padrão configuradas.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
