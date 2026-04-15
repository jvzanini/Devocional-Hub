import { test, expect } from "@playwright/test";

test.describe("Admin — Jornada Individual", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
  });

  test("abre modal de jornada a partir da aba Usuários", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários", exact: true }).click();
    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    await expect(page.getByRole("dialog", { name: /jornada/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Conquistas")).toBeVisible();
  });

  test("fechar modal com botão X e com overlay", async ({ page }) => {
    await page.getByRole("button", { name: "Usuários", exact: true }).click();
    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    const dialog = page.getByRole("dialog", { name: /jornada/i });
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: "Fechar" }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole("button", { name: /ver jornada/i }).first().click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(10, 10);
    await expect(dialog).not.toBeVisible();
  });
});
