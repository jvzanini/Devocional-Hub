import { auth } from "@/features/auth/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/shared/lib/db";
import { BIBLE_BOOKS } from "@/features/bible/lib/bible-books";
import { BooksPageClient } from "@/features/bible/components/BooksPageClient";

function extractBookName(chapterRef: string): string {
  if (!chapterRef) return "Outros";
  const match = chapterRef.match(/^(\d?\s?[A-Za-zÀ-ú]+)/);
  if (match) return match[1].trim();
  return chapterRef.split(" ")[0] || "Outros";
}

export default async function BooksPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const sessions = await prisma.session.findMany({
    where: {
      status: { in: ["COMPLETED", "RUNNING"] },
    },
    orderBy: { date: "desc" },
    include: {
      documents: { select: { id: true } },
      participants: { select: { id: true } },
    },
  });

  // Agrupar sessões por livro
  const bookMap: Record<string, {
    sessions: {
      id: string;
      chapterRef: string;
      summary: string;
      date: string;
      status: string;
      documentsCount: number;
      participantsCount: number;
    }[];
  }> = {};

  for (const s of sessions) {
    const bookName = extractBookName(s.chapterRef);
    if (!bookMap[bookName]) {
      bookMap[bookName] = { sessions: [] };
    }
    bookMap[bookName].sessions.push({
      id: s.id,
      chapterRef: s.chapterRef,
      summary: s.summary,
      date: s.date.toISOString(),
      status: s.status,
      documentsCount: s.documents.length,
      participantsCount: s.participants.length,
    });
  }

  // Construir dados dos livros com sessões
  const booksData = BIBLE_BOOKS
    .map((book) => {
      const data = bookMap[book.name];
      const sessionCount = data?.sessions.length || 0;
      const completedChapters = data
        ? new Set(
            data.sessions
              .filter((s) => s.status === "COMPLETED")
              .map((s) => s.chapterRef)
          ).size
        : 0;
      const progress =
        book.chapters > 0
          ? Math.round((completedChapters / book.chapters) * 100)
          : 0;

      return {
        name: book.name,
        code: book.code,
        abbr: book.abbr,
        testament: book.testament,
        order: book.order,
        totalChapters: book.chapters,
        color: book.color,
        sessionCount,
        progress: Math.min(progress, 100),
        sessions: data?.sessions || [],
      };
    })
    .sort((a, b) => a.order - b.order);

  return <BooksPageClient books={booksData} />;
}
