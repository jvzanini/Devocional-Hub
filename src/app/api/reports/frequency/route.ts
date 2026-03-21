import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { isAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

/**
 * GET /api/reports/frequency
 * Frequência de presença por período (semanal ou mensal).
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const currentUserId = (session.user as { id: string }).id;
  const userRole = ((session.user as { role?: string }).role || "MEMBER") as UserRoleType;
  const userIsAdmin = isAdmin(userRole);

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const filterUserId = searchParams.get("userId");
  const period = searchParams.get("period") || "weekly";

  const targetUserId = userIsAdmin && filterUserId ? filterUserId : currentUserId;

  // Buscar sessões do período
  const startDate = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const endDate = month
    ? new Date(Date.UTC(year, month, 0, 23, 59, 59))
    : new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const sessions = await prisma.session.findMany({
    where: { status: "COMPLETED", date: { gte: startDate, lte: endDate } },
    select: { id: true, date: true },
    orderBy: { date: "asc" },
  });

  const userAttendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      sessionId: { in: sessions.map(s => s.id) },
    },
    select: { sessionId: true },
  });
  const attendedIds = new Set(userAttendances.map(a => a.sessionId));

  // Agrupar por período
  const periods: { label: string; totalDevocionais: number; userPresences: number; frequency: number }[] = [];

  if (period === "weekly") {
    // Agrupar por semana
    const weekMap = new Map<string, { total: number; attended: number }>();
    for (const s of sessions) {
      const d = new Date(s.date);
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
      const key = weekStart.toISOString().split("T")[0];
      if (!weekMap.has(key)) weekMap.set(key, { total: 0, attended: 0 });
      const w = weekMap.get(key)!;
      w.total++;
      if (attendedIds.has(s.id)) w.attended++;
    }
    for (const [dateStr, data] of weekMap) {
      const d = new Date(dateStr);
      const label = `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`;
      periods.push({
        label: `Sem. ${label}`,
        totalDevocionais: data.total,
        userPresences: data.attended,
        frequency: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
      });
    }
  } else {
    // Agrupar por mês
    const monthMap = new Map<string, { total: number; attended: number }>();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (const s of sessions) {
      const d = new Date(s.date);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      if (!monthMap.has(key)) monthMap.set(key, { total: 0, attended: 0 });
      const m = monthMap.get(key)!;
      m.total++;
      if (attendedIds.has(s.id)) m.attended++;
    }
    for (const [key, data] of monthMap) {
      const monthIdx = parseInt(key.split("-")[1]);
      periods.push({
        label: monthNames[monthIdx],
        totalDevocionais: data.total,
        userPresences: data.attended,
        frequency: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
      });
    }
  }

  return NextResponse.json({ periods });
}
