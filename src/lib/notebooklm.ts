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
  logs: string[];
}

// ─── Stealth Browser Launch ──────────────────────────────────────────────

function findBundledChromium(): string | null {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright";
  try {
    const entries = fs.readdirSync(browsersPath);
    log(`Conteúdo de ${browsersPath}: ${JSON.stringify(entries)}`);
    const chromiumDir = entries.find(e => e.startsWith("chromium-") || e.startsWith("chromium_"));
    if (chromiumDir) {
      // Tentar vários caminhos possíveis
      const candidates = [
        path.join(browsersPath, chromiumDir, "chrome-linux64", "chrome"),
        path.join(browsersPath, chromiumDir, "chrome-linux", "chrome"),
        path.join(browsersPath, chromiumDir, "chrome", "chrome"),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          log(`Chromium bundled encontrado: ${candidate}`);
          return candidate;
        }
      }
      // Listar conteúdo do diretório para debug
      try {
        const subEntries = fs.readdirSync(path.join(browsersPath, chromiumDir));
        log(`Conteúdo de ${chromiumDir}: ${JSON.stringify(subEntries)}`);
      } catch { /* ignore */ }
    }
  } catch (e) {
    log(`Erro ao escanear ${browsersPath}: ${e}`);
  }
  return null;
}

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
    "--disable-crash-reporter",
    "--disable-breakpad",
    "--metrics-recording-only",
    "--no-first-run",
  ];

  // Deixar Playwright descobrir o browser automaticamente (mais confiável)
  try {
    log(`Playwright executablePath: ${chromium.executablePath()}`);
  } catch (e) {
    log(`executablePath erro: ${e}`);
  }

  log("Lançando Chromium via Playwright (auto-discovery)...");
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

/**
 * Cria notebook com KB unificada usando o fluxo real do NotebookLM:
 * 1. Clica "Criar novo" → dialog aparece com opções de fonte
 * 2. Clica "Texto copiado" no dialog
 * 3. Cola o texto na textarea e clica "Inserir"
 * 4. Aguarda notebook carregar com a fonte
 */
async function createNotebookWithKB(page: Page, knowledgeBase: string, chapterRef: string): Promise<boolean> {
  try {
    log("Criando novo notebook com KB unificada...");

    // 1. Clica em "Criar novo"
    const newBtn = page.locator('button:has-text("Criar novo"), button:has-text("New notebook"), button:has-text("Create new")');
    await newBtn.first().waitFor({ state: "visible", timeout: 30000 });
    await newBtn.first().click({ timeout: 15000 });
    log("Clicou em 'Criar novo'");

    // 2. Aguardar dialog de fontes aparecer (mostra "Texto copiado" entre as opções)
    await page.waitForTimeout(5000);

    // 3. Clicar em "Texto copiado" — pode ser button, span, div, etc.
    log("Procurando 'Texto copiado' no dialog...");
    const textoCopiado = page.locator('text="Texto copiado"');
    try {
      await textoCopiado.first().waitFor({ state: "visible", timeout: 15000 });
      await textoCopiado.first().click({ timeout: 10000 });
      log("Clicou em 'Texto copiado'");
    } catch {
      // Fallback: tentar locators mais genéricos
      log("Tentando locator alternativo para 'Texto copiado'...");
      const alt = page.locator('*:has-text("Texto copiado"):not(:has(*:has-text("Texto copiado")))');
      await alt.first().click({ timeout: 10000 });
      log("Clicou via locator alternativo");
    }
    await page.waitForTimeout(3000);

    // 4. Preencher textarea dentro do dialog overlay ("Cole o texto aqui")
    log("Preenchendo textarea com KB...");
    // O dialog "Cole o texto copiado" abre como overlay — buscar textarea dentro dele
    const textarea = page.locator('.cdk-overlay-container textarea, [class*="overlay"] textarea, textarea[placeholder*="Cole"], textarea[placeholder*="Paste"], textarea[placeholder*="texto"]');
    await textarea.first().waitFor({ state: "visible", timeout: 15000 });
    await textarea.first().fill(knowledgeBase.substring(0, 100000));
    log(`KB inserida: ${knowledgeBase.length} chars`);
    await page.waitForTimeout(1000);

    // 5. Clicar "Inserir" dentro do overlay
    log("Clicando 'Inserir'...");
    const inserirBtn = page.locator('.cdk-overlay-container button:has-text("Inserir"), .cdk-overlay-container button:has-text("Insert"), button:has-text("Inserir"), button:has-text("Insert")');
    await inserirBtn.first().waitFor({ state: "visible", timeout: 10000 });
    await inserirBtn.first().click({ timeout: 10000 });
    log("Clicou em 'Inserir'");

    // 6. Aguardar notebook carregar com a fonte (sidebar mostra "Texto colado")
    log("Aguardando notebook processar fonte...");
    await page.waitForTimeout(15000);

    // Verificar se fonte foi carregada
    try {
      await page.locator('text="Texto colado"').first().waitFor({ state: "visible", timeout: 30000 });
      log("Fonte 'Texto colado' confirmada no sidebar!");
    } catch {
      log("Aviso: 'Texto colado' não encontrado no sidebar, mas continuando...");
    }

    log("Notebook criado com KB unificada.");
    return true;
  } catch (err) {
    log(`Erro ao criar notebook com KB: ${err}`);
    return false;
  }
}

// ─── Content Generation (Estúdio) ────────────────────────────────────────
// Os items do Estúdio ficam no painel direito:
// "Apresentação de slides", "Resumo em Vídeo", "Infográfico"
// Cada um tem um ícone de edit (lápis) para gerar

async function generateStudioItem(page: Page, itemName: string, downloadDir: string, fileName: string): Promise<string | null> {
  try {
    log(`Gerando ${itemName}...`);

    // Fechar qualquer overlay/modal que esteja aberto
    try {
      const backdrop = page.locator('.cdk-overlay-backdrop');
      if (await backdrop.count() > 0) {
        await backdrop.first().click({ force: true, timeout: 3000 });
        await page.waitForTimeout(1000);
        log("Overlay fechado antes de clicar no item.");
      }
    } catch { /* ignore */ }

    // Clicar no item do Estúdio — usar force para bypass de overlay residual
    const itemBtn = page.locator(`text="${itemName}"`);
    await itemBtn.first().waitFor({ state: "visible", timeout: 15000 });
    await itemBtn.first().click({ timeout: 10000, force: true });
    log(`Clicou em '${itemName}'`);
    await page.waitForTimeout(5000);

    // Verificar se aparece botão "Gerar" / "Generate"
    try {
      const genBtn = page.locator('button:has-text("Gerar"), button:has-text("Generate"), button:has-text("Criar"), button:has-text("Create")');
      if (await genBtn.count() > 0) {
        await genBtn.first().click({ timeout: 10000 });
        log(`Clicou em 'Gerar' para ${itemName}`);
      }
    } catch { /* pode não ter botão gerar separado */ }

    // Aguardar geração (pode levar 30s-3min)
    log(`Aguardando geração de ${itemName} (até 4 min)...`);

    // Configurar listener de download ANTES de clicar
    const downloadPromise = page.waitForEvent("download", { timeout: 240000 });

    // Procurar botão de download (pode demorar até aparecer)
    const dlBtn = page.locator('button[aria-label*="download" i], button[aria-label*="Download" i], button:has-text("Download"), button:has-text("Baixar"), [aria-label*="Baixar" i], [aria-label*="download" i]');
    await dlBtn.first().waitFor({ state: "visible", timeout: 180000 });
    log(`Botão de download encontrado para ${itemName}`);
    await dlBtn.first().click({ timeout: 10000 });

    const download = await downloadPromise;
    const ext = download.suggestedFilename().split(".").pop() || "pdf";
    const filePath = path.join(downloadDir, `${fileName}-${Date.now()}.${ext}`);
    await download.saveAs(filePath);
    log(`${itemName} salvo: ${filePath}`);

    // Fechar modal/overlay se existir e aguardar retorno ao Estúdio
    try {
      const closeBtn = page.locator('button[aria-label*="close" i], button[aria-label*="fechar" i], button:has-text("×"), button:has-text("Fechar")');
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click({ timeout: 5000 });
      }
    } catch { /* ignore */ }
    await page.waitForTimeout(3000);

    return filePath;
  } catch (err) {
    log(`Falha ao gerar ${itemName}: ${err}`);
    // Tentar fechar overlay antes de sair
    try {
      const backdrop = page.locator('.cdk-overlay-backdrop');
      if (await backdrop.count() > 0) {
        await backdrop.first().click({ force: true, timeout: 2000 });
        await page.waitForTimeout(1000);
      }
    } catch { /* ignore */ }
    return null;
  }
}

async function generateSlides(page: Page, downloadDir: string): Promise<string | null> {
  return generateStudioItem(page, "Apresentação de slides", downloadDir, "slides");
}

async function generateInfographic(page: Page, downloadDir: string): Promise<string | null> {
  return generateStudioItem(page, "Infográfico", downloadDir, "infographic");
}

async function generateAudioOverview(page: Page, downloadDir: string): Promise<string | null> {
  return generateStudioItem(page, "Resumo em Vídeo", downloadDir, "audio-overview");
}

// ─── Orquestrador Principal ─────────────────────────────────────────────

export async function runNotebookLMAutomation(
  sessionId: string,
  transcriptText: string,
  bibleText: string,
  chapterRef: string,
  knowledgeBase?: string
): Promise<NotebookLMResult> {
  // Ativar captura de logs para retornar junto com o resultado
  _capturedLogs = [];

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
    log("Passo 1: Login Google...");
    const loggedIn = await loginGoogle(page);
    if (!loggedIn) {
      log("Login falhou. Execute POST /api/admin/notebooklm-setup para configurar a sessão.");
      await context.close();
      { const l = _capturedLogs || []; _capturedLogs = null; return { slidesPath: null, infographicPath: null, audioOverviewPath: null, logs: l }; }
    }
    log("Passo 1: Login OK");
    await saveSession(context);

    // Aguardar carregamento completo da página NotebookLM
    log("Aguardando NotebookLM carregar...");
    await page.waitForTimeout(8000);

    // Passo 2: Criar notebook e inserir KB
    log("Passo 2: Criando notebook e inserindo KB...");

    // Construir KB se não fornecida
    const kb = knowledgeBase || `Transcrição do Devocional — ${chapterRef}\n\n${transcriptText}\n\n---\n\nTexto Bíblico:\n${bibleText}`;

    const created = await createNotebookWithKB(page, kb, chapterRef);
    if (!created) {
      log("Passo 2: Criação do notebook falhou.");
      await page.screenshot({ path: path.join(downloadDir, "debug-notebook-fail.png"), fullPage: true });
      await context.close();
      { const l = _capturedLogs || []; _capturedLogs = null; return { slidesPath: null, infographicPath: null, audioOverviewPath: null, logs: l }; }
    }
    log("Passo 2: Notebook criado OK");

    // Gerar conteúdos (cada um independente)
    log("Passo 3: Gerando slides...");
    slidesPath = await generateSlides(page, downloadDir);
    log(`Slides: ${slidesPath ? "OK" : "FALHOU"}`);

    log("Passo 4: Gerando infográfico...");
    infographicPath = await generateInfographic(page, downloadDir);
    log(`Infográfico: ${infographicPath ? "OK" : "FALHOU"}`);

    log("Passo 5: Gerando Audio Overview...");
    audioOverviewPath = await generateAudioOverview(page, downloadDir);
    log(`Audio Overview: ${audioOverviewPath ? "OK" : "FALHOU"}`);

    // Screenshot final
    await page.screenshot({ path: path.join(downloadDir, "debug-final.png"), fullPage: true });

    await context.close();
  } catch (err) {
    const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err);
    log(`Erro geral NotebookLM: ${errMsg}`);
  } finally {
    await browser.close();
  }

  const logs = _capturedLogs || [];
  _capturedLogs = null;
  return { slidesPath, infographicPath, audioOverviewPath, logs };
}

// ─── Setup: Login interativo para salvar sessão ─────────────────────────

/**
 * Faz login no Google e salva a sessão.
 * Chamado pelo endpoint POST /api/admin/notebooklm-setup
 * Precisa ser executado UMA VEZ após cada deploy (ou quando sessão expirar).
 */
export async function setupGoogleSession(): Promise<{ success: boolean; message: string; logs?: string[] }> {
  // Ativar captura global de logs
  _capturedLogs = [];
  const captureLog = log;

  // Diagnóstico pré-launch
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || "/ms-playwright";
  captureLog(`PLAYWRIGHT_BROWSERS_PATH: ${browsersPath}`);
  try {
    const entries = fs.readdirSync(browsersPath);
    captureLog(`Conteúdo de ${browsersPath}: ${JSON.stringify(entries)}`);
  } catch (e) {
    captureLog(`Erro ao ler ${browsersPath}: ${e}`);
  }
  captureLog(`/usr/bin/chromium existe: ${fs.existsSync("/usr/bin/chromium")}`);
  captureLog(`/usr/bin/chromium-browser existe: ${fs.existsSync("/usr/bin/chromium-browser")}`);
  try {
    captureLog(`Playwright executablePath(): ${chromium.executablePath()}`);
  } catch (e) {
    captureLog(`executablePath() erro: ${e}`);
  }

  let browser: Browser;
  try {
    browser = await launchStealthBrowser();
  } catch (err) {
    return { success: false, message: `Chromium não iniciou: ${err}`, logs: _capturedLogs || [] };
  }

  try {
    const context = await createStealthContext(browser);
    const page = await context.newPage();
    captureLog("Página criada, iniciando login...");

    const loggedIn = await loginGoogle(page);
    if (loggedIn) {
      await saveSession(context);
      await context.close();
      return { success: true, message: "Sessão Google salva com sucesso. NotebookLM está pronto.", logs: _capturedLogs || [] };
    }

    await context.close();
    return { success: false, message: "Login Google falhou. Verifique se 2FA/chave de segurança está desativada temporariamente.", logs: _capturedLogs || [] };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    captureLog(`Setup falhou: ${errMsg}`);
    return { success: false, message: `Erro no setup: ${errMsg}`, logs: _capturedLogs || [] };
  } finally {
    await browser.close();
    _capturedLogs = null;
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

// Log capturable — durante setup, logs são coletados para retornar na resposta
let _capturedLogs: string[] | null = null;

function log(message: string): void {
  console.log(`[NotebookLM] ${message}`);
  if (_capturedLogs) _capturedLogs.push(message);
}
