import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { auth } from "@/features/auth/lib/auth";

/**
 * DELETE /api/profile/account — Soft delete (apagar conta)
 * LGPD: mantém email, nome, igreja, whatsapp para possível reativação
 * Remove: senha, foto, dados de sessão vinculados
 */
export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      active: false,
      deletedAt: new Date(),
      deletedBy: "self",
      password: null,
      photoUrl: null,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  return NextResponse.json({
    message: "Conta desativada com sucesso. Seus dados básicos foram mantidos para possível reativação.",
  });
}
