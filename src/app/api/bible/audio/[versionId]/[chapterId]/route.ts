import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getAudioUrl } from "@/features/bible-reader/lib/bible-api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; chapterId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, chapterId } = await params;
    const audioUrl = await getAudioUrl(versionId, chapterId);

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
