import { NextResponse } from "next/server";
import { prisma } from "@/shared/lib/db";
import { requireRole } from "@/features/permissions/lib/permission-guard";
import { computeUserJourney } from "@/features/engagement/lib/user-journey";
import { PipelineStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("ADMIN");
  if (!guard.authorized) return guard.response;

  const { id } = await params;

  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, name: true, email: true,
      church: true, team: true, subTeam: true,
      createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [attendances, sessions, unlocks] = await Promise.all([
    prisma.attendance.findMany({
      where: { userId: id },
      select: { sessionId: true, joinTime: true, duration: true },
    }),
    prisma.session.findMany({
      where: { status: PipelineStatus.COMPLETED, date: { gte: user.createdAt } },
      select: { id: true, status: true, chapterRef: true, date: true },
    }),
    prisma.userAchievement.findMany({
      where: { userId: id },
      select: { userId: true, key: true, unlockedAt: true },
    }),
  ]);

  const journey = computeUserJourney(
    { ...user, whatsapp: null },
    sessions.map((s) => ({ ...s, status: s.status as string })),
    attendances,
    unlocks,
  );

  return NextResponse.json(journey, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
