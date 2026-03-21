/**
 * Cron scheduler para geração automática de cards de planejamento
 *
 * Na zero hora do dia de início de um ReadingPlan:
 * - Verificar se há plano com startDate === hoje
 * - Se sim: disparar geração de PlanningCards
 *
 * Implementado como: verificação na carga da página de planejamento
 * + API route chamável por cron externo (n8n ou GitHub Actions)
 */

import { prisma } from "@/shared/lib/db";
import { generatePlanningCards } from "./planning-generator";

/**
 * Verificar se há planos que precisam de cards gerados
 * Chamado por:
 * 1. Carga da página de planejamento (lazy)
 * 2. Cron externo via GET /api/cron/planning
 */
export async function checkAndGeneratePlanningCards(): Promise<{
  checked: boolean;
  planId?: string;
  generated?: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Buscar planos que começam hoje e não têm cards gerados
  const plansStartingToday = await prisma.readingPlan.findMany({
    where: {
      startDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      _count: {
        select: { planningCards: true },
      },
    },
  });

  // Também verificar planos IN_PROGRESS sem cards
  const activePlansWithoutCards = await prisma.readingPlan.findMany({
    where: {
      status: "IN_PROGRESS",
    },
    include: {
      _count: {
        select: { planningCards: true },
      },
    },
  });

  const plansNeedingCards = [
    ...plansStartingToday.filter((p) => p._count.planningCards === 0),
    ...activePlansWithoutCards.filter((p) => p._count.planningCards === 0),
  ];

  // Deduplicar por ID
  const uniquePlans = Array.from(
    new Map(plansNeedingCards.map((p) => [p.id, p])).values()
  );

  if (uniquePlans.length === 0) {
    return { checked: true };
  }

  // Gerar cards para o primeiro plano encontrado
  const plan = uniquePlans[0];
  console.log(`[CronScheduler] Gerando cards para plano "${plan.bookName}" (${plan.id})...`);

  const generated = await generatePlanningCards(plan.id);

  return {
    checked: true,
    planId: plan.id,
    generated,
  };
}
