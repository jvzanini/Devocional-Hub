import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { isAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

/**
 * GET /api/reports/evolution
 * Evolução da frequência ao longo do tempo (para gráfico de linha).
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
  const filterUserId = searchParams.get("userId");
  const period = searchParams.get("period") || "monthly";

  const targetUserId = userIsAdmin && filterUserId ? filterUserId : currentUserId;

  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

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

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  if (period === "monthly") {
    const points = monthNames.map((name, idx) => {
      const monthSessions = sessions.filter(s => new Date(s.date).getUTCMonth() === idx);
      const attended = monthSessions.filter(s => attendedIds.has(s.id)).length;
      return {
        label: name,
        frequency: monthSessions.length > 0 ? Math.round((attended / monthSessions.length) * 100) : 0,
        total: monthSessions.length,
        attended,
      };
    });
    return NextResponse.json({ points });
  }

  // Weekly
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

  const points = Array.from(weekMap.entries()).map(([dateStr, data]) => {
    const d = new Date(dateStr);
    return {
      label: `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}`,
      frequency: data.total > 0 ? Math.round((data.attended / data.total) * 100) : 0,
      total: data.total,
      attended: data.attended,
    };
  });

  return NextResponse.json({ points });
}
