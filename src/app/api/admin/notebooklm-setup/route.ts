import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setupGoogleSession, hasGoogleSession, clearGoogleSession } from "@/lib/notebooklm";

/**
 * GET — Verifica status da sessão Google/NotebookLM
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  return NextResponse.json({
    hasSession: hasGoogleSession(),
    message: hasGoogleSession()
      ? "Sessão Google ativa. NotebookLM está pronto para uso."
      : "Sessão Google não encontrada. Execute POST para configurar.",
  });
}

/**
 * POST — Faz login no Google e salva sessão para NotebookLM
 * Body opcional: { clear: true } para limpar sessão antes de re-login
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body.clear) {
    clearGoogleSession();
  }

  const result = await setupGoogleSession();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
