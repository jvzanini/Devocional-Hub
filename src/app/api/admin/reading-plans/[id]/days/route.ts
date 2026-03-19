import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

async function isAdmin() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  return user?.role === "ADMIN";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  const { id: planId } = await params;
  const { dayId, completed, logNote, actualChapters } = await request.json();

  if (!dayId) return NextResponse.json({ error: "dayId obrigatório" }, { status: 400 });

  const day = await prisma.readingPlanDay.update({
    where: { id: dayId },
    data: {
      completed: completed !== undefined ? completed : undefined,
      logNote: logNote !== undefined ? logNote : undefined,
      actualChapters: actualChapters !== undefined ? actualChapters : undefined,
    },
  });

  // Check if all days are completed → mark plan as COMPLETED
  const allDays = await prisma.readingPlanDay.findMany({ where: { planId } });
  const allCompleted = allDays.every(d => d.completed);
  if (allCompleted) {
    await prisma.readingPlan.update({ where: { id: planId }, data: { status: "COMPLETED" } });
  }

  return NextResponse.json(day);
}
