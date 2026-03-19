import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "playwright-state", "google-session.json");

/**
 * POST — Recebe sessão Google (storage state do Playwright) e salva no servidor
 * Body: JSON do storageState do Playwright (cookies + origins)
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json();

    // Validar que tem a estrutura esperada
    if (!body.cookies || !Array.isArray(body.cookies)) {
      return NextResponse.json(
        { success: false, message: "Formato inválido. Esperado: storageState do Playwright com campo 'cookies'." },
        { status: 400 }
      );
    }

    // Salvar
    const stateDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(body, null, 2));

    const googleCookies = body.cookies.filter((c: { domain: string }) =>
      c.domain.includes("google.com") || c.domain.includes("notebooklm")
    );

    return NextResponse.json({
      success: true,
      message: `Sessão salva com ${googleCookies.length} cookies Google. NotebookLM pronto para uso.`,
      cookieCount: body.cookies.length,
      googleCookieCount: googleCookies.length,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: `Erro ao salvar sessão: ${err}` },
      { status: 500 }
    );
  }
}
