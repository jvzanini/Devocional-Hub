import { NextResponse } from "next/server";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { generatePlanningCards } from "@/features/planning/lib/planning-generator";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> }
) {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  try {
    const { planId } = await params;
    const generated = await generatePlanningCards(planId);

    return NextResponse.json({
      success: true,
      generated,
      message: `${generated} card(s) gerado(s) com sucesso`,
    });
  } catch (error) {
    console.error("[API /planning/generate] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao gerar cards de planejamento" },
      { status: 500 }
    );
  }
}
