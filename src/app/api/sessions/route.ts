import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const book = searchParams.get("book"); // Nome do livro (ex: "Romanos")
  const withProgress = searchParams.get("progress") === "true";

  const where: Record<string, unknown> = {};
  if (book) {
    where.chapterRef = { startsWith: book };
    where.status = "COMPLETED";
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      documents: {
        select: { id: true, type: true, fileName: true, fileSize: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { participants: true } },
    },
  });

  // Se solicitado progresso por livro
  if (withProgress && book) {
    const bibleBook = BIBLE_BOOKS.find(b => b.name === book);
    const totalChapters = bibleBook?.chapters || 0;

    // Extrair capítulos completados
    const completedChaptersSet = new Set<number>();
    for (const s of sessions) {
      if (!s.chapterRef) continue;
      const chapterMatch = s.chapterRef.match(/\d+/g);
      if (chapterMatch) {
        chapterMatch.forEach(n => completedChaptersSet.add(parseInt(n)));
      }
    }

    const completedChapters = completedChaptersSet.size;
    const percentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
    const startDate = sessions.length > 0 ? sessions[sessions.length - 1].date : null;
    const endDate = sessions.length > 0 ? sessions[0].date : null;

    // Roadmap: sessões do livro com dados resumidos
    const roadmap = sessions.map(s => ({
      id: s.id,
      date: s.date,
      chapterRef: s.chapterRef,
      participantCount: s._count.participants,
      completed: s.status === "COMPLETED",
    })).reverse(); // Ordem cronológica

    return NextResponse.json({
      sessions: sessions.map(s => ({ ...s, participantCount: s._count.participants })),
      progress: {
        bookName: book,
        totalChapters,
        completedChapters,
        percentage,
        startDate,
        endDate,
      },
      roadmap,
    });
  }

  return NextResponse.json(sessions);
}
