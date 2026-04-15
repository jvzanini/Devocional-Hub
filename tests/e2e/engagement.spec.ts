import { test, expect } from "@playwright/test";

test.describe("Engajamento — Sua Jornada", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
  });

  test("widget Sua Jornada aparece no dashboard", async ({ page }) => {
    const card = page.getByRole("region", { name: "Sua jornada" });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await page.screenshot({ path: "tests/e2e/screenshots/journey-card.png", fullPage: false });
  });

  test("badges renderizam", async ({ page }) => {
    const card = page.getByRole("region", { name: "Sua jornada" });
    const grid = card.getByRole("list");
    await expect(grid).toBeVisible();
    const badges = grid.getByRole("listitem");
    expect(await badges.count()).toBeGreaterThanOrEqual(7);
  });
});
