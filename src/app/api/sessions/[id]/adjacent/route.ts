import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";

/**
 * GET /api/sessions/[id]/adjacent
 * Retorna IDs do card anterior e próximo do MESMO livro bíblico.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;

  // Buscar sessão atual para obter o chapterRef
  const current = await prisma.session.findUnique({
    where: { id },
    select: { id: true, date: true, chapterRef: true },
  });

  if (!current) {
    return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
  }

  // Extrair prefixo do livro (ex: "Romanos" de "Romanos 10")
  const bookPrefix = current.chapterRef?.split(/\s+\d/)[0]?.trim();

  if (!bookPrefix) {
    return NextResponse.json({ previousId: null, nextId: null });
  }

  // Buscar sessões do mesmo livro ordenadas por data
  const sameBooksessions = await prisma.session.findMany({
    where: {
      chapterRef: { startsWith: bookPrefix },
      status: "COMPLETED",
    },
    orderBy: { date: "asc" },
    select: { id: true, date: true },
  });

  const currentIndex = sameBooksessions.findIndex(s => s.id === id);

  const previousId = currentIndex > 0 ? sameBooksessions[currentIndex - 1].id : null;
  const nextId = currentIndex < sameBooksessions.length - 1 ? sameBooksessions[currentIndex + 1].id : null;

  return NextResponse.json({ previousId, nextId });
}
