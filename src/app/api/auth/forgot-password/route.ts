import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/features/email/lib/email";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 * Envia email de redefinição de senha com token (expira em 1 hora)
 */
export async function POST(req: Request) {
  const body = await req.json();
  const { email } = body as { email: string };

  if (!email) {
    return NextResponse.json(
      { error: "Email é obrigatório" },
      { status: 400 }
    );
  }

  // Sempre retorna sucesso (segurança: não revelar se email existe)
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (user && user.active && !user.deletedAt) {
    // Invalidar tokens anteriores
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Criar novo token
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    });

    // Enviar email
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || "https://devocional.nexusai360.com";
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (error) {
      console.error("Erro ao enviar email de redefinição:", error);
    }
  }

  return NextResponse.json({
    message: "Se o email existir, você receberá um link de redefinição.",
  });
}
