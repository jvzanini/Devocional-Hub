import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { getBooks } from "@/features/bible-reader/lib/bible-api-client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { versionId } = await params;
    const books = await getBooks(versionId);
    return NextResponse.json({ books });
  } catch (error) {
    console.error("[API /bible/books] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar livros" },
      { status: 500 }
    );
  }
}
