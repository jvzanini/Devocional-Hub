import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { isAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

/**
 * GET /api/reports/hours
 * Total de horas de devocional.
 * Admin: soma usando o maior tempo de permanência de cada sessão.
 * Usuário: soma suas próprias durações.
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

  const startDate = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const endDate = month
    ? new Date(Date.UTC(year, month, 0, 23, 59, 59))
    : new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  const sessions = await prisma.session.findMany({
    where: { status: "COMPLETED", date: { gte: startDate, lte: endDate } },
    select: { id: true },
  });
  const sessionIds = sessions.map(s => s.id);

  let totalSeconds = 0;

  if (userIsAdmin && !filterUserId) {
    // Admin sem filtro: soma o maior tempo de permanência de cada sessão
    for (const sid of sessionIds) {
      const maxAttendance = await prisma.attendance.findFirst({
        where: { sessionId: sid },
        orderBy: { duration: "desc" },
        select: { duration: true },
      });
      if (maxAttendance) totalSeconds += maxAttendance.duration;
    }
  } else {
    // Usuário específico: soma suas durações
    const targetUserId = userIsAdmin && filterUserId ? filterUserId : currentUserId;
    const attendances = await prisma.attendance.findMany({
      where: { userId: targetUserId, sessionId: { in: sessionIds } },
      select: { duration: true },
    });
    totalSeconds = attendances.reduce((sum, a) => sum + a.duration, 0);
  }

  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  const formattedTotal = totalHours > 0
    ? `${totalHours}h${totalMinutes > 0 ? ` ${totalMinutes}min` : ""}`
    : `${totalMinutes}min`;

  return NextResponse.json({ totalHours, totalMinutes, totalSeconds, formattedTotal });
}
