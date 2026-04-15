import { NextResponse } from "next/server";
import { PipelineStatus } from "@prisma/client";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { computeAdminInsights } from "@/features/engagement/lib/admin-insights";

export async function GET() {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const [users, attendances, sessions, unlocks] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null, active: true },
      select: {
        id: true, name: true, email: true,
        church: true, team: true, subTeam: true,
        whatsapp: true, createdAt: true,
      },
    }),
    prisma.attendance.findMany({
      select: { userId: true, sessionId: true, joinTime: true },
    }),
    prisma.session.findMany({
      where: { status: PipelineStatus.COMPLETED },
      select: { id: true, status: true, chapterRef: true, date: true },
    }),
    prisma.userAchievement.findMany({
      select: { userId: true, key: true, unlockedAt: true },
    }),
  ]);

  // status é PipelineStatus (enum), mas SessionLike espera string — cast seguro
  const sessionsForInsights = sessions.map((s) => ({
    ...s,
    status: s.status as string,
  }));

  const insights = computeAdminInsights(users, sessionsForInsights, attendances, unlocks);

  return NextResponse.json(insights, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
