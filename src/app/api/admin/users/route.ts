import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/email";
import crypto from "crypto";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, church: true, team: true, subTeam: true, photoUrl: true, inviteToken: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { name, email, church, team, subTeam } = await request.json();
  if (!name || !email) return NextResponse.json({ error: "nome e email obrigatórios" }, { status: 400 });

  // Verificar se já existe
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

  // Gerar token de convite
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: null,
      role: "MEMBER",
      church: church || "",
      team: team || "",
      subTeam: subTeam || "",
      inviteToken,
      inviteExpiresAt,
    },
  });

  // Enviar email de convite
  const baseUrl = process.env.NEXTAUTH_URL || "https://devocional.nexusai360.com";
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

  try {
    await sendInviteEmail({ to: email, name, inviteUrl });
    console.log(`[Admin] Convite enviado para ${email}`);
  } catch (err) {
    console.error(`[Admin] Falha ao enviar email para ${email}:`, err);
    // Não falha a criação — o admin pode reenviar depois
  }

  return NextResponse.json({ ...user, inviteUrl });
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  // Não permitir deletar o próprio admin
  const session = await auth();
  if ((session?.user as { id: string })?.id === id) {
    return NextResponse.json({ error: "Não é possível remover a si mesmo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
