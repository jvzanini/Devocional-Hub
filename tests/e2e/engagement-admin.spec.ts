import { test, expect } from "@playwright/test";

test.describe("Admin — Aba Engajamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
  });

  test("abre aba Engajamento e mostra 4 cards", async ({ page }) => {
    await page.getByRole("button", { name: /engajamento/i }).click();
    await expect(page.getByText("Comunidade Ativa")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Streaks Ativos")).toBeVisible();
    await expect(page.getByText("Em Risco")).toBeVisible();
    await expect(page.getByText("Conquistas", { exact: false })).toBeVisible();
  });

  test("tabela Top Streaks ou estado vazio renderiza", async ({ page }) => {
    await page.getByRole("button", { name: /engajamento/i }).click();
    await expect(page.getByText("Top Streaks")).toBeVisible({ timeout: 10_000 });
  });
});
