import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getAudioUrl } from "@/features/bible-reader/lib/bible-api-client";
import { discoverPortugueseVersions } from "@/features/bible-reader/lib/version-discovery";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, chapterId } = await params;

    // Tentar com o audioBibleId fornecido
    let audioUrl = await getAudioUrl(versionId, chapterId);

    // Fallback: se não encontrou áudio, buscar qualquer versão PT com áudio
    if (!audioUrl) {
      try {
        const versions = await discoverPortugueseVersions();
        const audioVersions = versions.filter(v => v.audioAvailable && v.audioBibleId && v.audioBibleId !== versionId);
        for (const av of audioVersions) {
          audioUrl = await getAudioUrl(av.audioBibleId!, chapterId);
          if (audioUrl) {
            console.log(`[API /bible/audio] Fallback: usando áudio da versão ${av.abbreviation}`);
            break;
          }
        }
      } catch (fallbackErr) {
        console.warn("[API /bible/audio] Erro no fallback de áudio:", fallbackErr);
      }
    }

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
      { error: "Erro ao buscar áudio" },
      { status: 500 }
    );
  }
}
