import { defineConfig, devices } from "@playwright/test";

/**
 * Shared Playwright configuration used by every toolchain variant.
 *
 * The only environment-specific values are BASE_URL (default: localhost:3000)
 * and PLAYWRIGHT_CI (set automatically in all CI templates).
 *
 * Snapshot directory is fixed so baselines created by the reference
 * implementation are comparable against any variant run.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI || process.env.PLAYWRIGHT_CI);

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts"],
  snapshotDir: "./tests/visual/__snapshots__",
  outputDir: "./playwright-results",

  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  fullyParallel: true,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-results/results.json" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: isCI ? "on-first-retry" : "off",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
      testMatch: ["**/visual/snapshots.spec.ts"],
    },
  ],

  webServer: isCI
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
