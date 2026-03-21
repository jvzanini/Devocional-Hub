import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getChapterContent } from "@/features/bible-reader/lib/bible-api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, chapterId } = await params;

    if (!process.env.BIBLE_API_KEY) {
      console.error("[API /bible/content] BIBLE_API_KEY não configurada");
      return NextResponse.json(
        { error: "API da Bíblia não configurada. Configure BIBLE_API_KEY." },
        { status: 503 }
      );
    }

    console.log(`[API /bible/content] Buscando: versionId=${versionId}, chapterId=${chapterId}`);
    const content = await getChapterContent(versionId, chapterId);

    if (!content || !content.content) {
      console.warn(`[API /bible/content] Conteúdo vazio para ${versionId}/${chapterId}`);
      return NextResponse.json(
        { error: "Conteúdo não encontrado para este capítulo" },
        { status: 404 }
      );
    }

    return NextResponse.json({ content });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API /bible/content] Erro:`, errMsg);
    return NextResponse.json(
      { error: `Erro ao buscar conteúdo: ${errMsg}` },
      { status: 500 }
    );
  }
}
