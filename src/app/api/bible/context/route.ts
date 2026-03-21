import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { resolveDevocionalContext } from "@/features/bible-reader/lib/devocional-context";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const context = await resolveDevocionalContext();
    return NextResponse.json({ context });
  } catch (error) {
    console.error("[API /bible/context] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao resolver contexto devocional" },
      { status: 500 }
    );
  }
}
