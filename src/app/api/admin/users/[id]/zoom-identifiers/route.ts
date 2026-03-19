import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncAttendanceForUser } from "@/lib/attendance-sync";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id: userId } = await params;
  const { value, type } = await request.json();
  if (!value) return NextResponse.json({ error: "value obrigatório" }, { status: 400 });

  try {
    const zi = await prisma.zoomIdentifier.create({
      data: { userId, value: value.trim(), type: type || "EMAIL" },
    });

    // Sync retroativo
    syncAttendanceForUser(userId).catch(err =>
      console.error("[ZoomIdentifier] Erro no sync retroativo:", err)
    );

    return NextResponse.json(zi);
  } catch {
    return NextResponse.json({ error: "Identificador já existe para este usuário" }, { status: 409 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  await params; // consume params
  const { zoomIdentifierId } = await request.json();
  if (!zoomIdentifierId) return NextResponse.json({ error: "zoomIdentifierId obrigatório" }, { status: 400 });

  await prisma.zoomIdentifier.delete({ where: { id: zoomIdentifierId } });
  return NextResponse.json({ success: true });
}
