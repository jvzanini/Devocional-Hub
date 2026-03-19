/**
 * Script local para exportar sessão Google para o DevocionalHub.
 *
 * Uso:
 *   node scripts/export-google-session.mjs
 *
 * O que faz:
 *   1. Abre um browser REAL (não headless) na página do NotebookLM
 *   2. Você faz login manualmente com sua conta Google
 *   3. Quando o NotebookLM carregar, pressione Enter no terminal
 *   4. Os cookies são salvos e enviados automaticamente para o servidor
 */

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import readline from "readline";

const SERVER_URL = process.env.SERVER_URL || "https://devocional.nexusai360.com";
const SESSION_FILE = path.join(process.cwd(), "playwright-state", "google-session.json");

async function main() {
  console.log("=== Exportar Sessão Google para DevocionalHub ===\n");
  console.log("Abrindo browser...\n");

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });

  const page = await context.newPage();
  await page.goto("https://notebooklm.google.com");

  console.log("============================================");
  console.log("  1. Faça login na sua conta Google");
  console.log("  2. Aguarde o NotebookLM carregar");
  console.log("  3. Pressione ENTER aqui no terminal");
  console.log("============================================\n");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise((resolve) => rl.question("Pressione ENTER quando o NotebookLM tiver carregado... ", resolve));
  rl.close();

  // Verificar se realmente está logado
  const url = page.url();
  if (url.includes("accounts.google.com")) {
    console.log("\n❌ Parece que você ainda está na página de login.");
    console.log("   Tente novamente após completar o login.");
    await browser.close();
    process.exit(1);
  }

  console.log("\nSalvando sessão...");

  // Salvar localmente
  const stateDir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(stateDir)) fs.mkdirSync(stateDir, { recursive: true });
  await context.storageState({ path: SESSION_FILE });
  console.log(`Sessão salva em: ${SESSION_FILE}`);

  // Enviar para o servidor
  console.log(`\nEnviando sessão para ${SERVER_URL}...`);
  try {
    const sessionData = fs.readFileSync(SESSION_FILE, "utf-8");

    // Primeiro login no DevocionalHub
    const csrfRes = await fetch(`${SERVER_URL}/api/auth/csrf`);
    const csrfCookies = csrfRes.headers.getSetCookie?.() || [];
    const { csrfToken } = await csrfRes.json();

    // Pegar credenciais admin do .env se existir
    let adminEmail = process.env.ADMIN_EMAIL || "";
    let adminPassword = process.env.ADMIN_PASSWORD || "";

    if (!adminEmail || !adminPassword) {
      try {
        const envContent = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
        const emailMatch = envContent.match(/ADMIN_EMAIL="?([^"\n]+)"?/);
        const passMatch = envContent.match(/ADMIN_PASSWORD="?([^"\n]+)"?/);
        if (emailMatch) adminEmail = emailMatch[1];
        if (passMatch) adminPassword = passMatch[1];
      } catch { /* no .env file */ }
    }

    if (!adminEmail || !adminPassword) {
      console.log("\n⚠️  Credenciais admin não encontradas no .env");
      console.log("   Envie o arquivo manualmente:");
      console.log(`   curl -b cookies.txt -X POST ${SERVER_URL}/api/admin/notebooklm-session \\`);
      console.log(`     -H "Content-Type: application/json" \\`);
      console.log(`     -d @${SESSION_FILE}`);
      await browser.close();
      return;
    }

    // Login
    const loginRes = await fetch(`${SERVER_URL}/api/auth/callback/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: csrfCookies.join("; "),
      },
      body: `email=${encodeURIComponent(adminEmail)}&password=${encodeURIComponent(adminPassword)}&csrfToken=${csrfToken}`,
      redirect: "manual",
    });

    const loginCookies = loginRes.headers.getSetCookie?.() || [];
    const allCookies = [...csrfCookies, ...loginCookies].join("; ");

    // Upload da sessão
    const uploadRes = await fetch(`${SERVER_URL}/api/admin/notebooklm-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: allCookies,
      },
      body: sessionData,
    });

    const result = await uploadRes.json();
    if (result.success) {
      console.log("\n✅ Sessão enviada com sucesso! NotebookLM está pronto para uso.");
    } else {
      console.log(`\n⚠️  Resposta do servidor: ${result.message || JSON.stringify(result)}`);
      console.log(`   A sessão foi salva localmente em: ${SESSION_FILE}`);
    }
  } catch (err) {
    console.log(`\n⚠️  Erro ao enviar: ${err.message}`);
    console.log(`   A sessão foi salva localmente em: ${SESSION_FILE}`);
  }

  await browser.close();
  console.log("\nBrowser fechado.");
}

main().catch(console.error);
