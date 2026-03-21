import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

/**
 * GET /api/search?q=keyword
 * Busca inteligente em sessões: summary, chapterRef, e conteúdo AI_SUMMARY.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ sessions: [] });
  }

  // Buscar sessões por chapterRef ou summary usando ILIKE (case-insensitive)
  const pattern = `%${query}%`;

  const sessions = await prisma.session.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { chapterRef: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { date: "desc" },
    take: 20,
    select: {
      id: true,
      date: true,
      chapterRef: true,
      summary: true,
    },
  });

  // Também buscar em documentos AI_SUMMARY
  const aiSummaryMatches = await prisma.document.findMany({
    where: {
      type: "AI_SUMMARY",
      fileName: { contains: query, mode: "insensitive" },
    },
    take: 10,
    select: { sessionId: true },
  });

  // Combinar resultados (sem duplicatas)
  const sessionIds = new Set(sessions.map(s => s.id));
  const extraSessionIds = aiSummaryMatches
    .map(d => d.sessionId)
    .filter(id => !sessionIds.has(id));

  let extraSessions: typeof sessions = [];
  if (extraSessionIds.length > 0) {
    extraSessions = await prisma.session.findMany({
      where: { id: { in: extraSessionIds }, status: "COMPLETED" },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        chapterRef: true,
        summary: true,
      },
    });
  }

  // Marcar tipo de match
  const results = [
    ...sessions.map(s => ({
      ...s,
      matchType: s.chapterRef?.toLowerCase().includes(query.toLowerCase())
        ? "chapterRef" as const
        : "summary" as const,
    })),
    ...extraSessions.map(s => ({
      ...s,
      matchType: "ai_summary" as const,
    })),
  ].slice(0, 20);

  return NextResponse.json({ sessions: results });
}
