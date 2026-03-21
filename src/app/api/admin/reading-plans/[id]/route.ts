import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;

  const plan = await prisma.readingPlan.findUnique({
    where: { id },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: { chapterReadings: true },
      },
    },
  });

  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;
  const body = await request.json();

  const plan = await prisma.readingPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" } } },
  });
  if (!plan) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  // Atualizar status simples
  if (body.status !== undefined && !body.startDate && !body.chaptersPerDay) {
    const updated = await prisma.readingPlan.update({
      where: { id },
      data: { status: body.status },
      include: { days: { orderBy: { date: "asc" } } },
    });
    return NextResponse.json(updated);
  }

  // Recalcular plano se startDate ou chaptersPerDay mudar
  const chaptersPerDay = body.chaptersPerDay || plan.chaptersPerDay;
  const newStartDate = body.startDate ? new Date(body.startDate) : null;
  const skipWeekendDays: number[] = body.skipWeekendDays || [];

  if (newStartDate || body.chaptersPerDay) {
    // Separar dias completados e não completados
    const completedDays = plan.days.filter(d => d.completed);
    const incompleteDays = plan.days.filter(d => !d.completed);

    // Calcular capítulos já completados
    let nextChapter = 1;
    for (const day of completedDays) {
      const chapters = day.chapters.split("-").map(Number);
      const max = Math.max(...chapters);
      if (max >= nextChapter) nextChapter = max + 1;
    }

    // Recalcular apenas dias futuros
    // Deletar dias não completados
    if (incompleteDays.length > 0) {
      await prisma.readingPlanDay.deleteMany({
        where: { id: { in: incompleteDays.map(d => d.id) } },
      });
    }

    // Gerar novos dias a partir de startDate (ou último dia completado + 1)
    const baseDate = newStartDate || (completedDays.length > 0
      ? new Date(new Date(completedDays[completedDays.length - 1].date).getTime() + 86400000)
      : plan.startDate);

    const newDays: { date: Date; chapters: string }[] = [];
    let currentDate = new Date(baseDate);
    let currentChapter = nextChapter;
    let iterations = 0;

    while (currentChapter <= plan.totalChapters && iterations < 365) {
      const dayOfWeek = currentDate.getUTCDay();
      if (!skipWeekendDays.includes(dayOfWeek)) {
        const startCh = currentChapter;
        const endCh = Math.min(startCh + chaptersPerDay - 1, plan.totalChapters);
        currentChapter = endCh + 1;
        newDays.push({
          date: new Date(currentDate),
          chapters: startCh === endCh ? `${startCh}` : `${startCh}-${endCh}`,
        });
      }
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      iterations++;
    }

    // Criar novos dias
    if (newDays.length > 0) {
      await prisma.readingPlanDay.createMany({
        data: newDays.map(d => ({ planId: id, ...d })),
      });
    }

    // Atualizar endDate do plano
    const endDate = newDays.length > 0 ? newDays[newDays.length - 1].date : plan.endDate;
    await prisma.readingPlan.update({
      where: { id },
      data: {
        chaptersPerDay,
        ...(newStartDate ? { startDate: newStartDate } : {}),
        endDate,
      },
    });
  }

  const updated = await prisma.readingPlan.findUnique({
    where: { id },
    include: { days: { orderBy: { date: "asc" }, include: { chapterReadings: true } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;
  const { id } = await params;

  await prisma.readingPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
