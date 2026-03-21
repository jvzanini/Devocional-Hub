import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getChapters } from "@/features/bible-reader/lib/bible-api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string; bookId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId, bookId } = await params;
    const chapters = await getChapters(versionId, bookId);
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("[API /bible/chapters] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar capítulos" },
      { status: 500 }
    );
  }
}
