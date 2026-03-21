import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

/**
 * PATCH /api/admin/reading-plans/[id]/days/[dayId]/chapters
 * Marcar capítulos como lidos (completo ou parcial) com lógica de reaparecimento.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;
  const { id: planId, dayId } = await params;

  const { readings } = await request.json();
  if (!readings || !Array.isArray(readings)) {
    return NextResponse.json({ error: "readings é obrigatório (array)" }, { status: 400 });
  }

  const planDay = await prisma.readingPlanDay.findUnique({
    where: { id: dayId },
    include: { chapterReadings: true },
  });
  if (!planDay || planDay.planId !== planId) {
    return NextResponse.json({ error: "Dia não encontrado" }, { status: 404 });
  }

  const partialChapters: number[] = [];

  for (const reading of readings) {
    const { chapter, isComplete, isPartial } = reading as {
      chapter: number;
      isComplete: boolean;
      isPartial: boolean;
    };

    // Se parcial → automaticamente isComplete=true (checkbox marcada)
    const actualComplete = isPartial ? true : isComplete;

    // Verificar se já existia como parcial antes
    const existing = planDay.chapterReadings.find(cr => cr.chapter === chapter);
    const wasParcialBefore = existing?.isPartial === true;

    await prisma.chapterReading.upsert({
      where: { dayId_chapter: { dayId, chapter } },
      create: {
        dayId,
        chapter,
        isComplete: actualComplete,
        isPartial,
        completedAt: actualComplete ? new Date() : null,
        sessions: 1,
      },
      update: {
        isComplete: actualComplete,
        isPartial,
        completedAt: actualComplete && !existing?.completedAt ? new Date() : existing?.completedAt,
        // Se era parcial e agora completou: incrementar sessions
        sessions: wasParcialBefore && !isPartial ? (existing?.sessions || 1) + 1 : undefined,
      },
    });

    // Rastrear capítulos parciais para reaparecimento
    if (isPartial) {
      partialChapters.push(chapter);
    }
  }

  // Verificar se todos os capítulos do dia foram completados (não parciais)
  const updatedReadings = await prisma.chapterReading.findMany({
    where: { dayId },
  });

  // Parse capítulos planejados para o dia
  const plannedChapters = parseChaptersFromString(planDay.chapters);
  const allComplete = plannedChapters.every(ch => {
    const reading = updatedReadings.find(r => r.chapter === ch);
    return reading?.isComplete && !reading?.isPartial;
  });

  await prisma.readingPlanDay.update({
    where: { id: dayId },
    data: { completed: allComplete },
  });

  // Lógica de reaparecimento: adicionar capítulos parciais ao próximo dia
  if (partialChapters.length > 0) {
    const plan = await prisma.readingPlan.findUnique({
      where: { id: planId },
      include: { days: { orderBy: { date: "asc" } } },
    });

    if (plan) {
      const currentDayIndex = plan.days.findIndex(d => d.id === dayId);
      const nextIncompleteDay = plan.days.find((d, i) => i > currentDayIndex && !d.completed);

      if (nextIncompleteDay) {
        // Verificar se os capítulos parciais já estão no próximo dia
        const nextDayChapters = parseChaptersFromString(nextIncompleteDay.chapters);
        const chaptersToAdd = partialChapters.filter(ch => !nextDayChapters.includes(ch));

        if (chaptersToAdd.length > 0) {
          const allChapters = [...nextDayChapters, ...chaptersToAdd].sort((a, b) => a - b);
          const newChaptersStr = formatChapters(allChapters);

          await prisma.readingPlanDay.update({
            where: { id: nextIncompleteDay.id },
            data: { chapters: newChaptersStr },
          });
        }
      }
    }
  }

  // Auto-completar plano se todos os dias estão completados
  const allDays = await prisma.readingPlanDay.findMany({ where: { planId } });
  if (allDays.every(d => d.completed)) {
    await prisma.readingPlan.update({ where: { id: planId }, data: { status: "COMPLETED" } });
  }

  return NextResponse.json({ success: true, allComplete });
}

function parseChaptersFromString(chapters: string): number[] {
  const result: number[] = [];
  for (const part of chapters.split(",")) {
    const trimmed = part.trim();
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      for (let i = start; i <= end; i++) result.push(i);
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) result.push(n);
    }
  }
  return result;
}

function formatChapters(chapters: number[]): string {
  if (chapters.length === 0) return "";
  const sorted = [...new Set(chapters)].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}
