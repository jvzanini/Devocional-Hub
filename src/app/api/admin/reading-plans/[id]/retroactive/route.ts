import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

/**
 * POST /api/admin/reading-plans/[id]/retroactive
 * Processa marcação retroativa de dias completados e recalcula o plano.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;

  const { completedDays } = await request.json();
  if (!completedDays || !Array.isArray(completedDays)) {
    return NextResponse.json({ error: "completedDays é obrigatório (array)" }, { status: 400 });
  }

  const plan = await prisma.readingPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  let markedCount = 0;
  let skippedDays = 0;

  for (const entry of completedDays) {
    const { date, chapters } = entry as { date: string; chapters: number[] };
    const targetDate = new Date(date);

    // Encontrar o dia do plano para esta data
    const planDay = plan.days.find(d => {
      const dDate = new Date(d.date);
      return dDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
             dDate.getUTCMonth() === targetDate.getUTCMonth() &&
             dDate.getUTCDate() === targetDate.getUTCDate();
    });

    if (!planDay) continue;

    // Marcar como completado
    await prisma.readingPlanDay.update({
      where: { id: planDay.id },
      data: { completed: true, actualChapters: chapters.join(", ") },
    });

    // Criar ChapterReading para cada capítulo
    for (const chapter of chapters) {
      await prisma.chapterReading.upsert({
        where: { dayId_chapter: { dayId: planDay.id, chapter } },
        create: { dayId: planDay.id, chapter, isComplete: true, completedAt: new Date() },
        update: { isComplete: true, completedAt: new Date() },
      });
    }

    markedCount++;
  }

  // Contar dias não realizados (passados, não completados, antes de hoje)
  const now = new Date();
  const pastIncompleteDays = plan.days.filter(d => {
    const dayDate = new Date(d.date);
    return dayDate < now && !d.completed;
  });

  // Verificar quais dos pastIncompleteDays foram marcados neste request
  const markedDates = new Set(completedDays.map((e: { date: string }) => e.date));
  const actuallySkipped = pastIncompleteDays.filter(d => {
    const dateStr = d.date.toISOString().split("T")[0];
    return !markedDates.has(dateStr);
  });
  skippedDays = actuallySkipped.length;

  // Recalcular: avançar endDate pela quantidade de dias não realizados
  let newDaysCreated = 0;
  if (skippedDays > 0) {
    // Encontrar capítulos não lidos dos dias pulados
    const chaptersPerDay = plan.chaptersPerDay || 1;
    const additionalDaysNeeded = skippedDays;

    // Gerar novos dias após o endDate atual
    let currentDate = new Date(plan.endDate);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);

    // Calcular próximo capítulo baseado no último dia existente
    const lastDay = plan.days[plan.days.length - 1];
    const lastChapters = lastDay.chapters.split("-").map(Number);
    let nextChapter = Math.max(...lastChapters) + 1;

    for (let i = 0; i < additionalDaysNeeded && nextChapter <= plan.totalChapters; i++) {
      const startCh = nextChapter;
      const endCh = Math.min(startCh + chaptersPerDay - 1, plan.totalChapters);
      nextChapter = endCh + 1;

      await prisma.readingPlanDay.create({
        data: {
          planId: id,
          date: new Date(currentDate),
          chapters: startCh === endCh ? `${startCh}` : `${startCh}-${endCh}`,
        },
      });

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      newDaysCreated++;
    }

    // Atualizar endDate
    if (newDaysCreated > 0) {
      const newEndDate = new Date(currentDate);
      newEndDate.setUTCDate(newEndDate.getUTCDate() - 1);
      await prisma.readingPlan.update({
        where: { id },
        data: { endDate: newEndDate },
      });
    }
  }

  return NextResponse.json({
    marked: markedCount,
    skippedDays,
    newDaysCreated,
    adjustedEndDate: newDaysCreated > 0 ? plan.endDate : null,
  });
}
