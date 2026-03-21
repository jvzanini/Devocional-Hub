import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string, whatsapp?: string }
 * Redefine a senha do usuário usando o token
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { token, password, whatsapp } = body as {
    token: string;
    password: string;
    whatsapp?: string;
  };

  if (!token || !password) {
    return NextResponse.json(
      { error: "Token e senha são obrigatórios" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter pelo menos 6 caracteres" },
      { status: 400 }
    );
  }

  // Buscar token válido
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken) {
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 400 }
    );
  }

  if (resetToken.usedAt) {
    return NextResponse.json(
      { error: "Este link já foi utilizado" },
      { status: 400 }
    );
  }

  if (resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "Este link expirou. Solicite um novo." },
      { status: 400 }
    );
  }

  // Atualizar senha e marcar token como usado
  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: {
        password: hashedPassword,
        ...(whatsapp ? { whatsapp } : {}),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({
    message: "Senha redefinida com sucesso",
  });
}
