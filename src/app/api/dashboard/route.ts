import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  // Current/active reading plan
  const activePlan = await prisma.readingPlan.findFirst({
    where: { status: "IN_PROGRESS" },
    include: { days: { orderBy: { date: "asc" } } },
    orderBy: { startDate: "asc" },
  });

  // Upcoming plan (for preview when <= 3 days left)
  const upcomingPlan = await prisma.readingPlan.findFirst({
    where: { status: "UPCOMING" },
    orderBy: { startDate: "asc" },
  });

  // User attendance stats
  const userAttendances = await prisma.attendance.count({ where: { userId } });
  const totalSessions = await prisma.session.count({ where: { status: "COMPLETED" } });

  // Schedule settings
  const scheduleSettings = await prisma.appSetting.findMany({
    where: { key: { startsWith: "schedule_" } },
  });
  const schedule: Record<string, string> = {};
  scheduleSettings.forEach(s => { schedule[s.key] = s.value; });

  // Zoom link
  const zoomLinkSetting = await prisma.appSetting.findUnique({ where: { key: "zoomLink" } });
  const zoomMeetingIdSetting = await prisma.appSetting.findUnique({ where: { key: "zoomMeetingId" } });

  return NextResponse.json({
    activePlan,
    upcomingPlan,
    attendance: {
      attended: userAttendances,
      total: totalSessions,
      percentage: totalSessions > 0 ? Math.round((userAttendances / totalSessions) * 100) : 0,
    },
    schedule,
    zoomLink: zoomLinkSetting?.value || "",
    zoomMeetingId: zoomMeetingIdSetting?.value || "",
  });
}
