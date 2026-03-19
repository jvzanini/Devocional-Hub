/**
 * NotebookLM automation via Playwright (Stealth Mode)
 * Gera: Slides (PDF), Infográfico (PDF), Vídeo resumo (Audio Overview)
 *
 * Fluxo:
 * 1. Login Google com sessão persistida (volume Docker)
 * 2. Cria notebook com transcrição + texto bíblico
 * 3. Gera Presentation (slides), Infographic, Audio Overview (vídeo)
 *
 * Setup inicial: chamar POST /api/admin/notebooklm-setup para fazer login
 * manual uma vez. A sessão é salva em playwright-state/ (volume persistente).
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import path from "path";
import fs from "fs";
import os from "os";

const STATE_FILE = path.join(process.cwd(), "playwright-state", "google-session.json");
const NOTEBOOKLM_URL = "https://notebooklm.google.com";

export interface NotebookLMResult {
  slidesPath: string | null;
  infographicPath: string | null;
  audioOverviewPath: string | null;
}

// ─── Stealth Browser Launch ──────────────────────────────────────────────

async function launchStealthBrowser(): Promise<Browser> {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-extensions",
    "--disable-blink-features=AutomationControlled",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-background-networking",
    "--disable-default-apps",
    "--disable-sync",
    "--disable-translate",
    "--metrics-recording-only",
    "--no-first-run",
  ];

  log("Lançando Chromium bundled do Playwright...");
  const browser = await chromium.launch({ headless: true, args });
  log("Chromium lançado com sucesso.");
  return browser;
}

async function createStealthContext(browser: Browser, options?: { recordVideoDir?: string }): Promise<BrowserContext> {
  const stateDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  const contextOptions: Record<string, unknown> = {
    viewport: { width: 1920, height: 1080 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  if (options?.recordVideoDir) {
    contextOptions.recordVideo = { dir: options.recordVideoDir, size: { width: 1280, height: 720 } };
  }

  if (fs.existsSync(STATE_FILE)) {
    contextOptions.storageState = STATE_FILE;
  }

  const context = await browser.newContext(contextOptions);

  // Stealth: override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // @ts-expect-error - stealth override
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, "languages", { get: () => ["pt-BR", "pt", "en-US", "en"] });
  });

  return context;
}

// ─── Google Login ────────────────────────────────────────────────────────

async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes("notebooklm.google.com") && !url.includes("accounts.google.com");
}

async function loginGoogle(page: Page): Promise<boolean> {
  const { GOOGLE_EMAIL, GOOGLE_PASSWORD } = process.env;
  if (!GOOGLE_EMAIL || !GOOGLE_PASSWORD) {
    throw new Error("GOOGLE_EMAIL e GOOGLE_PASSWORD devem estar configurados");
  }

  log("Fazendo login no Google...");

  try {
    log("Navegando para NotebookLM...");
    await page.goto(NOTEBOOKLM_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    log(`URL atual: ${page.url()}`);

    if (await isLoggedIn(page)) {
      log("Já logado (sessão salva).");
      return true;
    }

    // Email
    log("Aguardando campo de email...");
    await page.waitForSelector('input[type="email"]', { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.fill('input[type="email"]', GOOGLE_EMAIL);
    await page.waitForTimeout(800);

    // Screenshot antes de clicar Next
    await page.screenshot({ path: path.join(os.tmpdir(), "nlm-step1-email.png") });
    log("Email preenchido, clicando Next...");
    await page.click("#identifierNext");
    await page.waitForTimeout(3000);
    log(`URL após email: ${page.url()}`);

    // Screenshot após email
    await page.screenshot({ path: path.join(os.tmpdir(), "nlm-step2-after-email.png") });

    // Verificar se pede senha ou alguma tela intermediária
    const pageContent = await page.textContent("body").catch(() => "");
    log(`Conteúdo da página (100 chars): ${pageContent?.substring(0, 100)}`);

    // Password
    log("Aguardando campo de senha...");
    await page.waitForSelector('input[type="password"]:visible', { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.fill('input[type="password"]', GOOGLE_PASSWORD);
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(os.tmpdir(), "nlm-step3-password.png") });
    log("Senha preenchida, clicando Next...");
    await page.click("#passwordNext");
    await page.waitForTimeout(5000);

    log(`URL após senha: ${page.url()}`);
    await page.screenshot({ path: path.join(os.tmpdir(), "nlm-step4-after-password.png") });

    // Verificar se tem tela intermediária (termos, verificação de telefone, etc.)
    const currentUrl = page.url();
    if (currentUrl.includes("challenge") || currentUrl.includes("signin")) {
      log(`Tela intermediária detectada: ${currentUrl}`);
      const bodyText = await page.textContent("body").catch(() => "");
      log(`Texto: ${bodyText?.substring(0, 200)}`);

      // Tentar aceitar termos se existirem
      try {
        const agreeBtn = page.locator('button:has-text("I agree"), button:has-text("Concordo"), button:has-text("Accept"), button:has-text("Aceitar"), button:has-text("Next"), button:has-text("Avançar")');
        if (await agreeBtn.count() > 0) {
          await agreeBtn.first().click({ timeout: 5000 });
          await page.waitForTimeout(3000);
          log("Clicou em botão de aceitar/avançar.");
        }
      } catch { /* ignore */ }
    }

    // Aguarda NotebookLM ou qualquer URL do Google
    try {
      await page.waitForURL("**/notebooklm.google.com/**", { timeout: 30000 });
      log("Login realizado com sucesso!");
      return true;
    } catch {
      log(`URL final: ${page.url()}`);
      // Se chegou em alguma página Google que não é login, considerar sucesso parcial
      if (!page.url().includes("accounts.google.com/v3/signin")) {
        log("Não é mais a página de login — tentando navegar para NotebookLM...");
        await page.goto(NOTEBOOKLM_URL, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);
        if (await isLoggedIn(page)) {
          log("Login confirmado após redirect manual!");
          return true;
        }
      }
      log("Login não completado.");
      await page.screenshot({ path: path.join(os.tmpdir(), "nlm-step5-final.png"), fullPage: true });
      return false;
    }
  } catch (err) {
    log(`Falha no login: ${err}`);
    try {
      await page.screenshot({ path: path.join(os.tmpdir(), "nlm-error.png"), fullPage: true });
    } catch { /* ignore */ }
    return false;
  }
}

async function saveSession(context: BrowserContext): Promise<void> {
  try {
    await context.storageState({ path: STATE_FILE });
    log("Sessão Google salva.");
  } catch (err) {
    log(`Erro ao salvar sessão: ${err}`);
  }
}

// ─── Notebook Creation ──────────────────────────────────────────────────

async function createNotebook(page: Page, transcriptText: string, bibleText: string, chapterRef: string): Promise<boolean> {
  try {
    log("Criando novo notebook...");

    // Clica em "Novo notebook" / "New notebook"
    const newBtn = page.locator('button:has-text("New notebook"), button:has-text("Novo notebook"), button:has-text("Create new"), [aria-label*="new notebook" i], [aria-label*="novo notebook" i]');
    await newBtn.first().click({ timeout: 15000 });
    await page.waitForTimeout(3000);

    // Adicionar fonte 1: Transcrição
    log("Adicionando fonte: Transcrição...");
    await addTextSource(page, `Transcrição do Devocional — ${chapterRef}\n\n${transcriptText.substring(0, 50000)}`);
    await page.waitForTimeout(3000);

    // Adicionar fonte 2: Texto Bíblico
    if (bibleText && bibleText.length > 10) {
      log("Adicionando fonte: Texto Bíblico...");
      await addTextSource(page, `Texto Bíblico (NVI) — ${chapterRef}\n\n${bibleText.substring(0, 50000)}`);
      await page.waitForTimeout(3000);
    }

    log("Notebook criado com sucesso.");
    return true;
  } catch (err) {
    log(`Erro ao criar notebook: ${err}`);
    return false;
  }
}

async function addTextSource(page: Page, text: string): Promise<void> {
  // Clicar em "Add source" / "Adicionar fonte"
  const addBtn = page.locator(
    'button:has-text("Add source"), button:has-text("Adicionar fonte"), button:has-text("Add"), [aria-label*="source" i], [aria-label*="fonte" i]'
  );
  await addBtn.first().click({ timeout: 10000 });
  await page.waitForTimeout(1500);

  // Selecionar "Copied text" / "Texto copiado"
  const pasteBtn = page.locator(
    'button:has-text("Copied text"), button:has-text("Texto copiado"), button:has-text("Paste text"), button:has-text("Colar texto"), [data-value="TEXT"]'
  );
  await pasteBtn.first().click({ timeout: 8000 });
  await page.waitForTimeout(1000);

  // Preencher textarea
  const textarea = page.locator('textarea, [contenteditable="true"], [role="textbox"]');
  await textarea.last().click({ timeout: 5000 });
  await textarea.last().fill(text);
  await page.waitForTimeout(500);

  // Confirmar inserção
  const insertBtn = page.locator(
    'button:has-text("Insert"), button:has-text("Inserir"), button:has-text("Add"), button:has-text("Adicionar")'
  );
  await insertBtn.first().click({ timeout: 8000 });
  await page.waitForTimeout(2000);
}

// ─── Content Generation ─────────────────────────────────────────────────

async function generateSlides(page: Page, downloadDir: string): Promise<string | null> {
  try {
    log("Gerando Slides...");

    // Abrir Notebook Guide
    const guideBtn = page.locator(
      'button:has-text("Notebook guide"), button:has-text("Guia do notebook"), [aria-label*="guide" i], [aria-label*="guia" i]'
    );
    await guideBtn.first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Clicar em Presentation
    const presBtn = page.locator(
      'button:has-text("Presentation"), button:has-text("Apresentação"), button:has-text("Slides")'
    );
    await presBtn.first().click({ timeout: 10000 });
    await page.waitForTimeout(20000); // Aguarda geração

    // Download
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    const dlBtn = page.locator('button[aria-label*="download" i], button[aria-label*="Download" i], button:has-text("Download")');
    await dlBtn.first().click({ timeout: 10000 });
    const download = await downloadPromise;

    const slidesPath = path.join(downloadDir, `slides-${Date.now()}.pdf`);
    await download.saveAs(slidesPath);
    log(`Slides salvos: ${slidesPath}`);
    return slidesPath;
  } catch (err) {
    log(`Falha ao gerar slides: ${err}`);
    return null;
  }
}

async function generateInfographic(page: Page, downloadDir: string): Promise<string | null> {
  try {
    log("Gerando Infográfico...");

    const btn = page.locator(
      'button:has-text("Infographic"), button:has-text("Infográfico")'
    );
    await btn.first().click({ timeout: 10000 });
    await page.waitForTimeout(20000);

    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    const dlBtn = page.locator('button[aria-label*="download" i], button:has-text("Download")').last();
    await dlBtn.click({ timeout: 10000 });
    const download = await downloadPromise;

    const infPath = path.join(downloadDir, `infographic-${Date.now()}.pdf`);
    await download.saveAs(infPath);
    log(`Infográfico salvo: ${infPath}`);
    return infPath;
  } catch (err) {
    log(`Falha ao gerar infográfico: ${err}`);
    return null;
  }
}

async function generateAudioOverview(page: Page, downloadDir: string): Promise<string | null> {
  try {
    log("Gerando Audio Overview (Vídeo)...");

    // Clicar em Audio Overview / Deep Dive
    const audioBtn = page.locator(
      'button:has-text("Audio Overview"), button:has-text("Visão geral em áudio"), button:has-text("Deep Dive"), [aria-label*="audio" i]'
    );
    await audioBtn.first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Tentar customizar para PT-BR
    try {
      const customBtn = page.locator('button:has-text("Customize"), button:has-text("Personalizar")');
      await customBtn.first().click({ timeout: 5000 });
      await page.waitForTimeout(1000);

      // Procurar campo de instruções
      const instructionField = page.locator('textarea');
      if (await instructionField.count() > 0) {
        await instructionField.last().fill(
          "Gere o conteúdo inteiramente em português brasileiro. Use linguagem pastoral e acessível."
        );
        await page.waitForTimeout(500);
      }
    } catch {
      log("Customização de idioma não disponível, usando padrão.");
    }

    // Clicar em Generate / Gerar
    const genBtn = page.locator(
      'button:has-text("Generate"), button:has-text("Gerar"), button:has-text("Create")'
    );
    await genBtn.first().click({ timeout: 10000 });

    // Audio Overview demora 2-5 minutos
    log("Aguardando geração do Audio Overview (até 5 min)...");
    await page.waitForSelector(
      'audio, video, [aria-label*="Play" i], button:has-text("Play"), [data-testid*="audio" i], [data-testid*="player" i]',
      { timeout: 360000 } // 6 min max
    );
    await page.waitForTimeout(5000);

    // Tentar download
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });

    // Procurar menu ou botão de download
    const menuBtn = page.locator(
      'button[aria-label*="more" i], button[aria-label*="menu" i], button[aria-label*="options" i], button[aria-label*="download" i]'
    );
    await menuBtn.first().click({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Clicar na opção de download no menu
    try {
      const dlOption = page.locator(
        '[role="menuitem"]:has-text("Download"), li:has-text("Download"), button:has-text("Download")'
      );
      await dlOption.first().click({ timeout: 5000 });
    } catch {
      // Download direto pode já ter iniciado
    }

    const download = await downloadPromise;
    const ext = download.suggestedFilename().split(".").pop() || "wav";
    const audioPath = path.join(downloadDir, `audio-overview-${Date.now()}.${ext}`);
    await download.saveAs(audioPath);

    log(`Audio Overview salvo: ${audioPath}`);
    return audioPath;
  } catch (err) {
    log(`Falha ao gerar Audio Overview: ${err}`);
    try {
      const debugDir = path.join(downloadDir, "debug");
      fs.mkdirSync(debugDir, { recursive: true });
      await page.screenshot({ path: path.join(debugDir, "audio-error.png"), fullPage: true });
    } catch { /* ignore */ }
    return null;
  }
}

// ─── Orquestrador Principal ─────────────────────────────────────────────

export async function runNotebookLMAutomation(
  sessionId: string,
  transcriptText: string,
  bibleText: string,
  chapterRef: string
): Promise<NotebookLMResult> {
  const downloadDir = path.join(os.tmpdir(), `devocional-${sessionId}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await launchStealthBrowser();

  let slidesPath: string | null = null;
  let infographicPath: string | null = null;
  let audioOverviewPath: string | null = null;

  try {
    const context = await createStealthContext(browser);
    const page = await context.newPage();

    // Login
    const loggedIn = await loginGoogle(page);
    if (!loggedIn) {
      log("Login falhou. Execute POST /api/admin/notebooklm-setup para configurar a sessão.");
      await context.close();
      return { slidesPath: null, infographicPath: null, audioOverviewPath: null };
    }
    await saveSession(context);

    // Criar notebook
    const created = await createNotebook(page, transcriptText, bibleText, chapterRef);
    if (!created) {
      await context.close();
      return { slidesPath: null, infographicPath: null, audioOverviewPath: null };
    }

    // Gerar conteúdos (cada um independente)
    slidesPath = await generateSlides(page, downloadDir);
    infographicPath = await generateInfographic(page, downloadDir);
    audioOverviewPath = await generateAudioOverview(page, downloadDir);

    // Screenshot final
    await page.screenshot({ path: path.join(downloadDir, "debug-final.png"), fullPage: true });

    await context.close();
  } catch (err) {
    log(`Erro geral: ${err}`);
  } finally {
    await browser.close();
  }

  return { slidesPath, infographicPath, audioOverviewPath };
}

// ─── Setup: Login interativo para salvar sessão ─────────────────────────

/**
 * Faz login no Google e salva a sessão.
 * Chamado pelo endpoint POST /api/admin/notebooklm-setup
 * Precisa ser executado UMA VEZ após cada deploy (ou quando sessão expirar).
 */
export async function setupGoogleSession(): Promise<{ success: boolean; message: string }> {
  let browser: Browser;
  try {
    browser = await launchStealthBrowser();
  } catch (err) {
    return { success: false, message: `Chromium não iniciou: ${err}` };
  }

  try {
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    log("Página criada, iniciando login...");

    const loggedIn = await loginGoogle(page);
    if (loggedIn) {
      await saveSession(context);
      await context.close();
      return { success: true, message: "Sessão Google salva com sucesso. NotebookLM está pronto." };
    }

    await context.close();
    return { success: false, message: "Login Google falhou. Verifique se 2FA/chave de segurança está desativada temporariamente." };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log(`Setup falhou: ${errMsg}`);
    return { success: false, message: `Erro no setup: ${errMsg}` };
  } finally {
    await browser.close();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

export function hasGoogleSession(): boolean {
  return fs.existsSync(STATE_FILE);
}

export function clearGoogleSession(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    log("Sessão Google removida.");
  }
}

function log(message: string): void {
  console.log(`[NotebookLM] ${message}`);
}
