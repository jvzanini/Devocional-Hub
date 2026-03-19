import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { syncAttendanceForUser } from "@/lib/attendance-sync";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!user) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  }

  return NextResponse.json({ name: user.name, email: user.email });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { password, zoomIdentifier, zoomType } = await request.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Senha deve ter no mínimo 6 caracteres" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!user) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });
  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
    return NextResponse.json({ error: "Convite expirado" }, { status: 410 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  // Save Zoom identifier if provided
  if (zoomIdentifier && zoomIdentifier.trim()) {
    try {
      await prisma.zoomIdentifier.create({
        data: {
          userId: user.id,
          value: zoomIdentifier.trim(),
          type: (zoomType as "EMAIL" | "USERNAME") || "EMAIL",
        },
      });

      // Sync retroativo
      syncAttendanceForUser(user.id).catch(err =>
        console.error("[Invite] Erro no sync retroativo:", err)
      );
    } catch {
      // Identifier might already exist, ignore
    }
  }

  return NextResponse.json({ success: true, email: user.email });
}
