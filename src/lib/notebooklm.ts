/**
 * NotebookLM automation via Playwright
 * NOTA: Esta automação depende da UI do NotebookLM que pode mudar.
 * O Google pode bloquear logins automatizados — use storageState para persistir sessão.
 */

import { chromium, Browser, BrowserContext, Page } from "playwright";
import path from "path";
import fs from "fs";
import os from "os";

const STATE_FILE = path.join(process.cwd(), "playwright-state", "google-session.json");
const NOTEBOOKLM_URL = "https://notebooklm.google.com";

interface NotebookLMResult {
  slidesPath: string | null;
  infographicPath: string | null;
}

/**
 * Obtém ou cria contexto de browser com sessão Google persistida
 */
async function getBrowserContext(browser: Browser): Promise<BrowserContext> {
  const stateDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  if (fs.existsSync(STATE_FILE)) {
    return browser.newContext({ storageState: STATE_FILE });
  }

  return browser.newContext();
}

/**
 * Salva o estado da sessão para reutilização
 */
async function saveSession(context: BrowserContext): Promise<void> {
  await context.storageState({ path: STATE_FILE });
}

/**
 * Faz login no Google se necessário
 */
async function ensureGoogleLogin(page: Page): Promise<void> {
  await page.goto(NOTEBOOKLM_URL, { waitUntil: "networkidle" });

  // Verifica se já está logado
  const url = page.url();
  if (url.includes("notebooklm.google.com") && !url.includes("accounts.google.com")) {
    return;
  }

  const { GOOGLE_EMAIL, GOOGLE_PASSWORD } = process.env;
  if (!GOOGLE_EMAIL || !GOOGLE_PASSWORD) {
    throw new Error(
      "GOOGLE_EMAIL e GOOGLE_PASSWORD devem estar configurados para automação do NotebookLM"
    );
  }

  // Login Google
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', GOOGLE_EMAIL);
  await page.click("#identifierNext");

  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', GOOGLE_PASSWORD);
  await page.click("#passwordNext");

  // Aguarda redirecionamento
  await page.waitForURL("**/notebooklm.google.com/**", { timeout: 30000 });
}

/**
 * Cria um novo notebook no NotebookLM com as fontes fornecidas
 */
async function createNotebook(
  page: Page,
  title: string,
  transcriptText: string,
  bibleText: string
): Promise<void> {
  // Clica em "Novo notebook"
  const newNotebookBtn = page.locator('button:has-text("New notebook"), button:has-text("Novo notebook")');
  await newNotebookBtn.click({ timeout: 10000 });

  // Aguarda modal ou nova página do notebook
  await page.waitForTimeout(2000);

  // Adiciona fonte — transcrição
  await addTextSource(page, `Transcrição do Devocional\n\n${transcriptText}`);
  await page.waitForTimeout(2000);

  // Adiciona fonte — texto bíblico
  await addTextSource(page, `Texto Bíblico (NVI)\n\n${bibleText}`);
  await page.waitForTimeout(3000);
}

/**
 * Adiciona uma fonte de texto ao notebook
 */
async function addTextSource(page: Page, text: string): Promise<void> {
  // Clica no botão de adicionar fonte
  const addSourceBtn = page.locator(
    'button:has-text("Add source"), button:has-text("Adicionar fonte"), [aria-label*="source"], [aria-label*="fonte"]'
  );
  await addSourceBtn.first().click({ timeout: 10000 });

  // Seleciona opção de "Colar texto"
  const pasteTextOption = page.locator(
    'button:has-text("Copied text"), button:has-text("Texto copiado"), button:has-text("Paste text")'
  );
  await pasteTextOption.first().click({ timeout: 5000 });

  // Preenche a textarea
  const textarea = page.locator('textarea, [contenteditable="true"]').last();
  await textarea.fill(text.substring(0, 50000)); // Limite de caracteres

  // Confirma
  const confirmBtn = page.locator('button:has-text("Insert"), button:has-text("Inserir"), button:has-text("Add")');
  await confirmBtn.first().click({ timeout: 5000 });
}

/**
 * Aciona a geração de apresentação de slides
 */
async function generateSlides(page: Page, downloadDir: string): Promise<string | null> {
  try {
    // Abre o "Notebook Guide"
    const guideBtn = page.locator(
      'button:has-text("Notebook guide"), [aria-label*="guide"]'
    );
    await guideBtn.first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);

    // Clica em "Presentation"
    const presentationBtn = page.locator(
      'button:has-text("Presentation"), button:has-text("Apresentação")'
    );
    await presentationBtn.first().click({ timeout: 10000 });

    // Aguarda geração (pode demorar)
    await page.waitForTimeout(15000);

    // Tenta fazer download
    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const downloadBtn = page.locator(
      'button[aria-label*="download"], button:has-text("Download")'
    );
    await downloadBtn.first().click({ timeout: 5000 });

    const download = await downloadPromise;
    const slidesPath = path.join(downloadDir, `slides-${Date.now()}.pdf`);
    await download.saveAs(slidesPath);

    return slidesPath;
  } catch (err) {
    console.error("Falha ao gerar slides:", err);
    return null;
  }
}

/**
 * Aciona a geração de infográfico
 */
async function generateInfographic(page: Page, downloadDir: string): Promise<string | null> {
  try {
    const infographicBtn = page.locator(
      'button:has-text("Infographic"), button:has-text("Infográfico")'
    );
    await infographicBtn.first().click({ timeout: 10000 });

    await page.waitForTimeout(15000);

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    const downloadBtn = page.locator(
      'button[aria-label*="download"], button:has-text("Download")'
    ).last();
    await downloadBtn.click({ timeout: 5000 });

    const download = await downloadPromise;
    const infographicPath = path.join(downloadDir, `infographic-${Date.now()}.pdf`);
    await download.saveAs(infographicPath);

    return infographicPath;
  } catch (err) {
    console.error("Falha ao gerar infográfico:", err);
    return null;
  }
}

/**
 * Orquestrador principal — roda toda a automação do NotebookLM
 */
export async function runNotebookLMAutomation(
  sessionId: string,
  transcriptText: string,
  bibleText: string,
  chapterRef: string
): Promise<NotebookLMResult> {
  const downloadDir = path.join(os.tmpdir(), `devocional-${sessionId}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let slidesPath: string | null = null;
  let infographicPath: string | null = null;

  try {
    const context = await getBrowserContext(browser);

    // Configura download automático
    context.on("page", (page) => {
      page.on("download", async (download) => {
        await download.saveAs(path.join(downloadDir, download.suggestedFilename()));
      });
    });

    const page = await context.newPage();

    await ensureGoogleLogin(page);
    await saveSession(context);

    const title = `Devocional ${chapterRef} — ${new Date().toLocaleDateString("pt-BR")}`;
    await createNotebook(page, title, transcriptText, bibleText);

    slidesPath = await generateSlides(page, downloadDir);
    infographicPath = await generateInfographic(page, downloadDir);

    // Screenshot de debug
    const screenshotPath = path.join(downloadDir, "debug-screenshot.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    await context.close();
  } finally {
    await browser.close();
  }

  return { slidesPath, infographicPath };
}

/**
 * Verifica se a sessão do Google ainda é válida
 */
export function hasGoogleSession(): boolean {
  return fs.existsSync(STATE_FILE);
}

/**
 * Remove a sessão salva (força novo login)
 */
export function clearGoogleSession(): void {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
}
