import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getChapterContentHtml } from "@/features/bible-reader/lib/holy-bible-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, chapterId } = await params;

    // chapterId vem como "ROM.13" do BibleModal
    const [bookCode, chapterStr] = chapterId.split(".");
    const chapter = parseInt(chapterStr, 10);

    if (!bookCode || isNaN(chapter)) {
      return NextResponse.json(
        { error: `Formato de capítulo inválido: ${chapterId}` },
        { status: 400 }
      );
    }

    const bibleId = parseInt(versionId, 10);
    if (isNaN(bibleId)) {
      return NextResponse.json(
        { error: `ID de versão inválido: ${versionId}` },
        { status: 400 }
      );
    }

    const result = await getChapterContentHtml(bibleId, bookCode, chapter);

    return NextResponse.json({
      content: {
        content: result.content,
        copyright: result.copyright,
        reference: result.reference,
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API /bible/content] Erro:`, errMsg);
    return NextResponse.json(
      { error: `Erro ao buscar conteúdo: ${errMsg}` },
      { status: 500 }
    );
  }
}
