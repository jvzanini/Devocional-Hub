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
    const content = await getChapterContent(versionId, chapterId);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("[API /bible/content] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conteúdo do capítulo" },
      { status: 500 }
    );
  }
}
