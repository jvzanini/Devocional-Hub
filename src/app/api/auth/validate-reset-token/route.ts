import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";

/**
 * GET /api/auth/validate-reset-token?token=xxx
 * Valida se o token de redefinição é válido e não expirou.
 * Retorna nome e whatsapp do usuário para pré-preencher o formulário.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: { select: { name: true, whatsapp: true } } },
  });

  if (!resetToken) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }

  if (resetToken.usedAt) {
    return NextResponse.json({ error: "Token já utilizado" }, { status: 410 });
  }

  if (new Date() > resetToken.expiresAt) {
    return NextResponse.json({ error: "Token expirado" }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    name: resetToken.user.name,
    whatsapp: resetToken.user.whatsapp || "",
  });
}
