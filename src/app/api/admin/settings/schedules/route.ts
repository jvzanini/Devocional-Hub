import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

/**
 * GET /api/admin/settings/schedules
 * Retorna horários configurados para cada dia da semana.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Buscar todas as settings com prefixo "schedule_"
  const settings = await prisma.appSetting.findMany({
    where: { key: { startsWith: "schedule_" } },
  });

  // Mapear para objeto: { sunday: "06:00", monday: "", ... }
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const schedules: Record<string, string> = {};

  for (const day of dayNames) {
    const setting = settings.find(s => s.key === `schedule_${day}`);
    schedules[day] = setting?.value || "";
  }

  // Calcular dias bloqueados (sem horário configurado)
  const blockedDays: number[] = [];
  dayNames.forEach((day, index) => {
    if (!schedules[day]) {
      blockedDays.push(index); // 0=Sunday, 6=Saturday
    }
  });

  return NextResponse.json({ schedules, blockedDays });
}
