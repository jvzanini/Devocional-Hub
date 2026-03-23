import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getChapterContentHtml } from "@/features/bible-reader/lib/holy-bible-client";
import { formatBibleContent } from "@/features/bible-reader/lib/bible-formatter";
import { fetchYouVersionContent, isYouVersionAvailable } from "@/features/bible-reader/lib/youversion-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, chapterId } = await params;

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

    // Estratégia: tentar YouVersion primeiro (conteúdo formatado completo)
    // Se falhar, buscar da Holy Bible API + texto sem formatação extra
    if (isYouVersionAvailable(versionId)) {
      try {
        const yvResult = await fetchYouVersionContent(versionId, bookCode, chapter);
        if (yvResult && yvResult.content) {
          return NextResponse.json({
            content: {
              content: yvResult.content,
              copyright: yvResult.copyright,
              reference: yvResult.reference,
            },
          });
        }
      } catch (yvErr) {
        console.warn(`[API /bible/content] YouVersion falhou, tentando Holy Bible API:`, yvErr);
      }
    }

    // Fallback: Holy Bible API (texto sem títulos de seção)
    const result = await getChapterContentHtml(bibleId, bookCode, chapter);

    // Tentar formatar com YouVersion mesmo como fallback
    const formattedContent = await formatBibleContent(
      result.content,
      result.reference,
      versionId,
      bookCode,
      chapter
    );

    return NextResponse.json({
      content: {
        content: formattedContent,
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
