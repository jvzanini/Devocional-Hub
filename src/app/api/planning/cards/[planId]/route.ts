import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requirePermission } from "@/features/permissions/lib/permission-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const guard = await requirePermission("menu:planning");
  if (!guard.authorized) return guard.response;

  try {
    const { planId } = await params;
    const cards = await prisma.planningCard.findMany({
      where: { planId },
      orderBy: { chapter: "asc" },
    });

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("[API /planning/cards] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cards" },
      { status: 500 }
    );
  }
}
