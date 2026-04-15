import { test, expect } from "@playwright/test";

test.describe("Admin — Export CSV Engajamento", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", process.env.ADMIN_EMAIL || "");
    await page.fill("#password", process.env.ADMIN_PASSWORD || "");
    await page.click('button[type="submit"]');
    await page.waitForURL("/", { timeout: 15_000 });
    await page.goto("/admin");
    await page.getByRole("button", { name: /engajamento/i }).click();
  });

  test("download CSV de Top Streaks", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    const topCard = page.getByText("Top Streaks").locator("..");
    await topCard.getByRole("button", { name: /baixar csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain("top-streaks");
    expect(download.suggestedFilename()).toContain(".csv");
  });
});
