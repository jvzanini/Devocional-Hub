import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { sendInviteEmail } from "@/features/email/lib/email";
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
    select: {
      id: true, name: true, email: true, role: true, church: true, team: true,
      subTeam: true, photoUrl: true, active: true, inviteToken: true, createdAt: true,
      zoomIdentifiers: { select: { id: true, value: true, type: true, locked: true } },
    },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { name, email, church, team, subTeam, zoomIdentifiers } = await request.json();
  if (!name || !email || !church) return NextResponse.json({ error: "Nome, email e igreja são obrigatórios" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

  const inviteToken = crypto.randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      name, email, password: null, role: "MEMBER",
      church: church || "", team: team || "", subTeam: subTeam || "",
      inviteToken, inviteExpiresAt,
      zoomIdentifiers: zoomIdentifiers?.length ? {
        create: zoomIdentifiers.map((zi: { value: string; type: string }) => ({
          value: zi.value, type: zi.type || "EMAIL",
        })),
      } : undefined,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://devocional.nexusai360.com";
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

  try {
    await sendInviteEmail({ to: email, name, inviteUrl });
  } catch (err) {
    console.error(`[Admin] Falha ao enviar email para ${email}:`, err);
  }

  return NextResponse.json({ ...user, inviteUrl });
}

export async function PUT(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const { id, name, church, team, subTeam, active } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (church !== undefined) data.church = church;
  if (team !== undefined) data.team = team;
  if (subTeam !== undefined) data.subTeam = subTeam;
  if (active !== undefined) data.active = active;

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, role: true, church: true, team: true,
      subTeam: true, active: true, inviteToken: true, createdAt: true,
      zoomIdentifiers: { select: { id: true, value: true, type: true, locked: true } },
    },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const session = await auth();
  if ((session?.user as { id: string })?.id === id) {
    return NextResponse.json({ error: "Não é possível remover a si mesmo" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
