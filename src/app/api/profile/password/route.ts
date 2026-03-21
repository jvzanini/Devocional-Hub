import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/features/auth/lib/auth";
import bcrypt from "bcryptjs";

/**
 * PATCH /api/profile/password — Alterar senha (logado)
 * Body: { currentPassword: string, newPassword: string }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { currentPassword, newPassword } = body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Senha atual e nova senha são obrigatórias" },
      { status: 400 }
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "A nova senha deve ter pelo menos 6 caracteres" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || !user.password) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ message: "Senha alterada com sucesso" });
}
