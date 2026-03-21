import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getBibleIsAudioUrl } from "@/features/bible-reader/lib/bible-is-audio";
import { getWordProjectAudioUrl } from "@/features/bible-reader/lib/word-project-audio";

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
      return NextResponse.json({ audioUrl: null, available: false });
    }

    // 1. Tentar Bible.is (áudio versão-específico: NVI, NAA, NTLH, NVT)
    const bibleIsResult = await getBibleIsAudioUrl(versionId, bookCode, chapter);
    if (bibleIsResult) {
      return NextResponse.json({
        audioUrl: bibleIsResult.url,
        available: true,
      });
    }

    // 2. Fallback: Word Project (narração genérica PT-BR)
    const wordProjectUrl = getWordProjectAudioUrl(bookCode, chapter);
    if (wordProjectUrl) {
      return NextResponse.json({
        audioUrl: wordProjectUrl,
        available: true,
      });
    }

    return NextResponse.json({ audioUrl: null, available: false });
  } catch (error) {
    console.error("[API /bible/audio] Erro:", error);
    return NextResponse.json({ audioUrl: null, available: false });
  }
}
