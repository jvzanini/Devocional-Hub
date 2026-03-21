import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getWordProjectAudioUrl } from "@/features/bible-reader/lib/word-project-audio";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { chapterId } = await params;

    // chapterId vem como "ROM.13" do BibleModal
    const [bookCode, chapterStr] = chapterId.split(".");
    const chapter = parseInt(chapterStr, 10);

    if (!bookCode || isNaN(chapter)) {
      return NextResponse.json(
        { audioUrl: null, available: false },
        { status: 200 }
      );
    }

    // Áudio PT-BR via Word Project (mesma narração para todas as versões)
    const audioUrl = getWordProjectAudioUrl(bookCode, chapter);

    if (!audioUrl) {
      return NextResponse.json(
        { audioUrl: null, available: false },
        { status: 200 }
      );
    }

    return NextResponse.json({ audioUrl, available: true });
  } catch (error) {
    console.error("[API /bible/audio] Erro:", error);
    return NextResponse.json(
      { audioUrl: null, available: false },
      { status: 200 }
    );
  }
}
