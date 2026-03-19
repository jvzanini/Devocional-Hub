import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status: status as "UPCOMING" | "IN_PROGRESS" | "COMPLETED" } : {};

  const plans = await prisma.readingPlan.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      days: { orderBy: { date: "asc" } },
    },
  });

  return NextResponse.json(plans);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const { bookName, bookCode, bookOrder, chaptersPerDay, totalChapters, startDate, selectedDates } = body;

  if (!bookName || !bookCode || !selectedDates?.length) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  // Check if book already has an active plan
  const existingActive = await prisma.readingPlan.findFirst({
    where: { bookCode, status: { in: ["UPCOMING", "IN_PROGRESS"] } },
  });
  if (existingActive) {
    return NextResponse.json({ error: "Este livro já possui um plano ativo" }, { status: 409 });
  }

  // Calculate chapters per day
  const sortedDates = [...selectedDates].sort();
  const endDate = sortedDates[sortedDates.length - 1];

  // Generate day entries
  let currentChapter = 1;
  const daysData = sortedDates.map((dateStr: string) => {
    const start = currentChapter;
    const end = Math.min(start + chaptersPerDay - 1, totalChapters);
    currentChapter = end + 1;
    return {
      date: new Date(dateStr),
      chapters: start === end ? `${start}` : `${start}-${end}`,
    };
  });

  const plan = await prisma.readingPlan.create({
    data: {
      bookName,
      bookCode,
      bookOrder,
      chaptersPerDay,
      totalChapters,
      startDate: new Date(sortedDates[0]),
      endDate: new Date(endDate),
      status: new Date(sortedDates[0]) <= new Date() ? "IN_PROGRESS" : "UPCOMING",
      days: { create: daysData },
    },
    include: { days: { orderBy: { date: "asc" } } },
  });

  return NextResponse.json(plan);
}
