import { test, expect } from "@playwright/test";

test.describe("Perfil — Minha Jornada", () => {
  test("seção Minha Jornada visível no /profile", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/profile");

    await expect(page.getByText("Minha Jornada")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Streak atual")).toBeVisible();
    await expect(page.getByText("Conquistas")).toBeVisible();
    await expect(page.getByText("Presenças recentes")).toBeVisible();
  });

  test("endpoint /api/me/journey retorna 401 sem sessão", async ({ browser }) => {
    const ctx = await browser.newContext();
    const response = await ctx.request.get("/api/me/journey");
    expect(response.status()).toBe(401);
    await ctx.close();
  });
});
