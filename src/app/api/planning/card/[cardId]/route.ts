import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requirePermission } from "@/features/permissions/lib/permission-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const guard = await requirePermission("menu:planning");
  if (!guard.authorized) return guard.response;

  try {
    const { cardId } = await params;
    const card = await prisma.planningCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ card });
  } catch (error) {
    console.error("[API /planning/card] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar card" },
      { status: 500 }
    );
  }
}
