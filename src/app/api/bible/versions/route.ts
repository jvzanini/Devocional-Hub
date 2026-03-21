import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { discoverPortugueseVersions } from "@/features/bible-reader/lib/version-discovery";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const versions = await discoverPortugueseVersions();
    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[API /bible/versions] Erro:", error);
    return NextResponse.json(
      { error: "Erro ao buscar versões da Bíblia" },
      { status: 500 }
    );
  }
}
