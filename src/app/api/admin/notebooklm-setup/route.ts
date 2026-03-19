import { NextResponse } from "next/server";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/shared/lib/db";
import { setupGoogleSession, hasGoogleSession, clearGoogleSession } from "@/features/pipeline/lib/notebooklm";
import { chromium } from "playwright";
import fs from "fs";

/**
 * GET — Verifica status da sessão Google/NotebookLM + diagnóstico Playwright
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: (session.user as { id: string }).id } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  // Diagnóstico Playwright
  let execPath = "desconhecido";
  try { execPath = chromium.executablePath(); } catch (e) { execPath = `erro: ${e}`; }

  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || "(não definido)";
  let browsersDir: string[] = [];
  try { browsersDir = fs.readdirSync(browsersPath); } catch { browsersDir = ["(diretório não encontrado)"]; }

  const systemChromium = fs.existsSync("/usr/bin/chromium");
  const systemChromiumBrowser = fs.existsSync("/usr/bin/chromium-browser");

  return NextResponse.json({
    hasSession: hasGoogleSession(),
    message: hasGoogleSession()
      ? "Sessão Google ativa. NotebookLM está pronto para uso."
      : "Sessão Google não encontrada. Execute POST para configurar.",
    diagnostics: {
      playwrightExecPath: execPath,
      playwrightBrowsersPath: browsersPath,
      browsersDir,
      systemChromiumExists: systemChromium,
      systemChromiumBrowserExists: systemChromiumBrowser,
      execPathExists: fs.existsSync(execPath),
    },
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
