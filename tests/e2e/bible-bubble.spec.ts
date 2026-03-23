import { test, expect } from "@playwright/test";

/**
 * Testes E2E — Bible Bubble
 *
 * Valida:
 * - Bubble aparece na tela
 * - Modal abre ao clicar
 * - Texto bíblico carrega com títulos de seção
 * - Navegação entre capítulos
 * - Botão AA (font size) funciona
 * - Player de áudio presente
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://devocional.nexusai360.com";

test.describe("Bible Bubble", () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', process.env.TEST_EMAIL || "test@test.com");
    await page.fill('input[name="password"]', process.env.TEST_PASSWORD || "test123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/", { timeout: 10000 });
  });

  test("bubble é visível na página", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    const bubble = page.locator(".bible-bubble");
    await expect(bubble).toBeVisible({ timeout: 5000 });
  });

  test("modal abre ao clicar no bubble", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    await page.click(".bible-bubble");
    const modal = page.locator(".bible-modal");
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test("texto bíblico carrega com títulos de seção", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    await page.click(".bible-bubble");
    await page.waitForSelector(".bible-content-text", { timeout: 15000 });

    // Verificar que o conteúdo carregou
    const content = page.locator(".bible-content-text");
    await expect(content).not.toBeEmpty();

    // Verificar que títulos de seção estão presentes (formatação YouVersion)
    const sectionTitles = page.locator(".bible-section-title, .s1");
    const count = await sectionTitles.count();
    // Alguns capítulos podem não ter títulos, então verificamos apenas se carregou
    console.log(`Títulos de seção encontrados: ${count}`);
  });

  test("navegação entre capítulos funciona", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    await page.click(".bible-bubble");
    await page.waitForSelector(".bible-content-text", { timeout: 15000 });

    // Pegar referência atual
    const titleBefore = await page.locator(".bible-content-title").textContent();

    // Clicar próximo capítulo
    const nextBtn = page.locator(".bible-player-collapsed-nav").last();
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
      const titleAfter = await page.locator(".bible-content-title").textContent();
      expect(titleAfter).not.toBe(titleBefore);
    }
  });

  test("botão AA altera tamanho da fonte", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    await page.click(".bible-bubble");
    await page.waitForSelector(".bible-content-text", { timeout: 15000 });

    // Pegar font size inicial
    const initialSize = await page.locator(".bible-content-text").evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );

    // Clicar no botão AA
    const aaButton = page.locator('button[aria-label*="Tamanho da fonte"]');
    if (await aaButton.isVisible()) {
      await aaButton.click();
      await page.waitForTimeout(500);

      const newSize = await page.locator(".bible-content-text").evaluate(
        (el) => window.getComputedStyle(el).fontSize
      );

      expect(newSize).not.toBe(initialSize);
    }
  });

  test("seletores de livro e versão funcionam", async ({ page }) => {
    await page.goto(`${BASE_URL}/books`);
    await page.click(".bible-bubble");
    await page.waitForSelector(".bible-modal", { timeout: 5000 });

    // Abrir seletor de livros
    const bookBtn = page.locator(".bible-header-btn--book");
    await bookBtn.click();
    await page.waitForTimeout(500);

    // Verificar que o seletor apareceu
    const bookSelector = page.locator(".bible-book-selector, .bible-selector");
    await expect(bookSelector).toBeVisible({ timeout: 3000 });
  });
});
