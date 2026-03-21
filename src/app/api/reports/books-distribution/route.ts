import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { isAdmin } from "@/features/permissions/lib/role-hierarchy";
import type { UserRoleType } from "@/features/permissions/lib/role-hierarchy";

/**
 * GET /api/reports/books-distribution
 * Distribuição de participação por livro bíblico (para gráfico de pizza).
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
  const filterUserId = searchParams.get("userId");
  const targetUserId = userIsAdmin && filterUserId ? filterUserId : currentUserId;

  // Buscar todas as sessões completadas
  const allSessions = await prisma.session.findMany({
    where: { status: "COMPLETED", chapterRef: { not: "" } },
    select: { id: true, chapterRef: true },
  });

  // Buscar presenças do usuário
  const userAttendances = await prisma.attendance.findMany({
    where: { userId: targetUserId },
    select: { sessionId: true },
  });
  const attendedIds = new Set(userAttendances.map(a => a.sessionId));

  // Extrair livros e contar
  const bookCounts = new Map<string, { sessions: number; totalSessions: number }>();

  for (const s of allSessions) {
    const bookName = s.chapterRef.split(/\s+\d/)[0]?.trim();
    if (!bookName) continue;

    if (!bookCounts.has(bookName)) {
      bookCounts.set(bookName, { sessions: 0, totalSessions: 0 });
    }
    const entry = bookCounts.get(bookName)!;
    entry.totalSessions++;
    if (attendedIds.has(s.id)) {
      entry.sessions++;
    }
  }

  // Calcular percentuais
  const totalAttended = Array.from(bookCounts.values()).reduce((sum, b) => sum + b.sessions, 0);
  const books = Array.from(bookCounts.entries())
    .map(([bookName, data]) => ({
      bookName,
      sessions: data.sessions,
      totalSessions: data.totalSessions,
      percentage: totalAttended > 0 ? Math.round((data.sessions / totalAttended) * 100) : 0,
    }))
    .filter(b => b.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json({ books });
}
