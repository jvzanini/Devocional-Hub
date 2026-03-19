import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const month = searchParams.get("month"); // YYYY-MM
  const church = searchParams.get("church");
  const team = searchParams.get("team");
  const subTeam = searchParams.get("subTeam");

  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  const isAdmin = user?.role === "ADMIN";

  // Non-admin can only see their own attendance
  const targetUserId = isAdmin && userId ? userId : (session.user as { id: string }).id;

  // Build date filter
  const dateFilter: { gte?: Date; lt?: Date } = {};
  if (month) {
    const [y, m] = month.split("-").map(Number);
    dateFilter.gte = new Date(y, m - 1, 1);
    dateFilter.lt = new Date(y, m, 1);
  }

  if (isAdmin && !userId) {
    // Admin viewing all users
    const userFilter: Record<string, unknown> = {};
    if (church) userFilter.church = church;
    if (team) userFilter.team = team;
    if (subTeam) userFilter.subTeam = subTeam;

    const attendances = await prisma.attendance.findMany({
      where: {
        ...(Object.keys(dateFilter).length ? { joinTime: dateFilter } : {}),
        user: Object.keys(userFilter).length ? userFilter : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, church: true, team: true, subTeam: true } },
        session: { select: { id: true, date: true, chapterRef: true } },
      },
      orderBy: { joinTime: "desc" },
    });

    return NextResponse.json(attendances);
  }

  // Specific user attendance
  const attendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      ...(Object.keys(dateFilter).length ? { joinTime: dateFilter } : {}),
    },
    include: {
      session: { select: { id: true, date: true, chapterRef: true, status: true } },
    },
    orderBy: { joinTime: "desc" },
  });

  // Stats
  const totalSessions = await prisma.session.count({ where: { status: "COMPLETED" } });

  return NextResponse.json({
    attendances,
    stats: {
      totalAttended: attendances.length,
      totalSessions,
      percentage: totalSessions > 0 ? Math.round((attendances.length / totalSessions) * 100) : 0,
    },
  });
}
