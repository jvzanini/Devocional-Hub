import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";

export async function GET(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status: status as "UPCOMING" | "IN_PROGRESS" | "COMPLETED" } : {};

  const plans = await prisma.readingPlan.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      days: {
        orderBy: { date: "asc" },
        include: { chapterReadings: true },
      },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN");
  if (!authResult.authorized) return authResult.response;

  const body = await request.json();
  const { bookName, bookCode, bookOrder, chaptersPerDay, totalChapters, startDate, selectedDates, skipWeekendDays } = body;

  if (!bookName || !bookCode) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Check if book already has an active plan
  const existingActive = await prisma.readingPlan.findFirst({
    where: { bookCode, status: { in: ["UPCOMING", "IN_PROGRESS"] } },
  });
  if (existingActive) {
    return NextResponse.json({ error: "Este livro já possui um plano ativo" }, { status: 409 });
  }

  // Buscar horários configurados para saber quais dias pular
  const blockedDays: number[] = skipWeekendDays || [];

  let daysData: { date: Date; chapters: string }[];

  if (selectedDates?.length) {
    // Modo original: datas selecionadas manualmente
    const sortedDates = [...selectedDates].sort();
    let currentChapter = 1;
    daysData = sortedDates.map((dateStr: string) => {
      const start = currentChapter;
      const end = Math.min(start + chaptersPerDay - 1, totalChapters);
      currentChapter = end + 1;
      return {
        date: new Date(dateStr),
        chapters: start === end ? `${start}` : `${start}-${end}`,
      };
    });
  } else if (startDate) {
    // Modo novo: gerar automaticamente a partir de startDate, pulando dias bloqueados
    daysData = [];
    let currentChapter = 1;
    const start = new Date(startDate);
    let currentDate = new Date(start);
    const maxDays = 365; // Safety limit
    let iterations = 0;

    while (currentChapter <= totalChapters && iterations < maxDays) {
      const dayOfWeek = currentDate.getUTCDay();

      if (!blockedDays.includes(dayOfWeek)) {
        const startCh = currentChapter;
        const endCh = Math.min(startCh + chaptersPerDay - 1, totalChapters);
        currentChapter = endCh + 1;
        daysData.push({
          date: new Date(currentDate),
          chapters: startCh === endCh ? `${startCh}` : `${startCh}-${endCh}`,
        });
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      iterations++;
    }
  } else {
    return NextResponse.json({ error: "startDate ou selectedDates é obrigatório" }, { status: 400 });
  }

  if (daysData.length === 0) {
    return NextResponse.json({ error: "Nenhum dia válido para o plano" }, { status: 400 });
  }

  const endDate = daysData[daysData.length - 1].date;
  const actualStartDate = daysData[0].date;

  const plan = await prisma.readingPlan.create({
    data: {
      bookName,
      bookCode,
      bookOrder: bookOrder || 0,
      chaptersPerDay: chaptersPerDay || 1,
      totalChapters,
      startDate: actualStartDate,
      endDate,
      status: actualStartDate <= new Date() ? "IN_PROGRESS" : "UPCOMING",
      days: { create: daysData },
    },
    include: { days: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(plan);
}
