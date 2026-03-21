import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { isAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

/**
 * GET /api/reports/presence
 * Relatório de presença com filtros avançados.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const userRole = ((session.user as { role?: string }).role || "MEMBER") as UserRoleType;
  const userIsAdmin = isAdmin(userRole);

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;
  const filterUserId = searchParams.get("userId");
  const church = searchParams.get("church");
  const team = searchParams.get("team");
  const subTeam = searchParams.get("subTeam");
  const bookCode = searchParams.get("bookCode");

  // Construir filtro de data
  const startDate = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
  const endDate = month
    ? new Date(Date.UTC(year, month, 0, 23, 59, 59))
    : new Date(Date.UTC(year, 11, 31, 23, 59, 59));

  // Filtro de sessões
  const sessionWhere: Record<string, unknown> = {
    status: "COMPLETED",
    date: { gte: startDate, lte: endDate },
  };
  if (bookCode) {
    sessionWhere.chapterRef = { startsWith: bookCode };
  }

  const sessions = await prisma.session.findMany({
    where: sessionWhere,
    select: { id: true, date: true, chapterRef: true },
  });
  const sessionIds = sessions.map(s => s.id);

  // Filtro de usuários
  const userWhere: Record<string, unknown> = { active: true, deletedAt: null };
  if (!userIsAdmin) {
    userWhere.id = userId;
  } else if (filterUserId) {
    userWhere.id = filterUserId;
  }
  if (church) userWhere.church = church;
  if (team) userWhere.team = team;
  if (subTeam) userWhere.subTeam = subTeam;

  const users = await prisma.user.findMany({
    where: userWhere,
    select: { id: true, name: true, photoUrl: true },
  });

  // Buscar presenças
  const attendances = await prisma.attendance.findMany({
    where: {
      sessionId: { in: sessionIds },
      userId: { in: users.map(u => u.id) },
    },
  });

  // Montar dados por usuário
  const result = users.map(user => {
    const userAttendances = attendances.filter(a => a.userId === user.id);
    const presences = userAttendances.length;
    const frequency = sessions.length > 0 ? Math.round((presences / sessions.length) * 100) : 0;
    const lastPresence = userAttendances.length > 0
      ? userAttendances.sort((a, b) => b.joinTime.getTime() - a.joinTime.getTime())[0].joinTime
      : null;
    const avgDuration = userAttendances.length > 0
      ? Math.round(userAttendances.reduce((sum, a) => sum + a.duration, 0) / userAttendances.length)
      : 0;

    return {
      id: user.id,
      name: user.name,
      photoUrl: user.photoUrl,
      presences,
      frequency,
      lastPresence,
      avgDuration,
    };
  });

  // Anos disponíveis
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const availableYears = [2026];
  for (let y = 2027; y <= currentYear; y++) availableYears.push(y);
  if (currentMonth >= 12) availableYears.push(currentYear + 1);

  return NextResponse.json({
    users: result.sort((a, b) => b.presences - a.presences),
    totalSessions: sessions.length,
    availableYears,
  });
}
