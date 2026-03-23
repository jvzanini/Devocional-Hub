import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getBibleIsAudioUrl, getBibleIsTimestamps } from "@/features/bible-reader/lib/bible-is-audio";

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

    // Bible.is (áudio versão-específico: NVI, NAA, NTLH, NVT)
    const [result, timestamps] = await Promise.all([
      getBibleIsAudioUrl(versionId, bookCode, chapter),
      getBibleIsTimestamps(versionId, bookCode, chapter),
    ]);
    if (result) {
      return NextResponse.json({
        audioUrl: result.url,
        available: true,
        timestamps, // [] se indisponível (NAA, AT)
      });
    }

    // Sem áudio para esta versão
    return NextResponse.json({ audioUrl: null, available: false });
  } catch (error) {
    console.error("[API /bible/audio] Erro:", error);
    return NextResponse.json({ audioUrl: null, available: false });
  }
}
