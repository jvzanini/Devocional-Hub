import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requirePermission } from "@/features/permissions/lib/permission-guard";

export async function GET() {
  const guard = await requirePermission("menu:planning");
  if (!guard.authorized) return guard.response;

  try {
    const activePlan = await prisma.readingPlan.findFirst({
      where: { status: "IN_PROGRESS" },
      include: {
        planningCards: {
          orderBy: { chapter: "asc" },
        },
        days: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!activePlan) {
      // Tentar plano mais recente
      const latestPlan = await prisma.readingPlan.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          planningCards: {
            orderBy: { chapter: "asc" },
          },
          days: {
            orderBy: { date: "asc" },
          },
        },
      });

      return NextResponse.json({ plan: latestPlan || null });
    }

    return NextResponse.json({ plan: activePlan });
  } catch (error) {
    console.error("[API /planning/current] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar plano ativo" },
      { status: 500 }
    );
  }
}
