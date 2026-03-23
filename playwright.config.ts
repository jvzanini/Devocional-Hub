import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Test Configuration — DevocionalHub
 *
 * Testes de frontend automatizados para validação antes do deploy.
 * Uso: npx playwright test
 *
 * @see https://github.com/microsoft/playwright
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  timeout: 30000,

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "https://devocional.nexusai360.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "pt-BR",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
