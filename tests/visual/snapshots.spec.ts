/**
 * Visual regression tests — Playwright screenshot comparisons.
 *
 * Canonical viewports and theme states are defined here so every toolchain
 * variant applies the same visual contract.  Run `npx playwright test --update-snapshots`
 * on the reference implementation to seed the baseline images; subsequent
 * variant runs compare against those stored PNGs.
 *
 * Stored snapshots live at tests/visual/__snapshots__/ and are committed to
 * the repository.  The metrics report records the pixel diff count per
 * variant for objective comparison.
 */

import { expect, test } from "@playwright/test";

import { CRITERIA } from "../acceptance/criteria";

// ── helpers ───────────────────────────────────────────────────────────────

async function seedNote(page: import("@playwright/test").Page) {
  await page.evaluate(() => indexedDB.deleteDatabase("offline-notes-db"));
  await page.reload();

  await page.getByRole("button", { name: /new note/i }).click();
  await page.getByLabel(/title/i).fill("Visual test note");
  await page
    .getByLabel(/content/i)
    .fill("This is a note body used for visual regression screenshots.");
  await page.getByRole("button", { name: /save note/i }).click();
  await expect(page.getByText("Visual test note")).toBeVisible();
}

async function setTheme(
  page: import("@playwright/test").Page,
  mode: "light" | "dark",
) {
  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark"),
  );
  const wantDark = mode === "dark";
  if (isDark !== wantDark) {
    await page.getByRole("button", { name: /dark|light|theme/i }).click();
  }
}

// ── test suite ────────────────────────────────────────────────────────────

test.describe("Visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test(CRITERIA.SS_01.title, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedNote(page);
    await setTheme(page, "light");
    const card = page.getByRole("article").first();
    await expect(card).toHaveScreenshot("note-card-light-1280.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test(CRITERIA.SS_02.title, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedNote(page);
    await setTheme(page, "dark");
    const card = page.getByRole("article").first();
    await expect(card).toHaveScreenshot("note-card-dark-1280.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test(CRITERIA.SS_03.title, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await seedNote(page);
    await setTheme(page, "light");
    await expect(page).toHaveScreenshot("grid-mobile-375.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test(CRITERIA.SS_04.title, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await seedNote(page);

    for (const mode of ["light", "dark"] as const) {
      await setTheme(page, mode);
      const sidebar = page.getByRole("navigation");
      await expect(sidebar).toHaveScreenshot(`sidebar-${mode}.png`, {
        maxDiffPixelRatio: 0.01,
      });
    }
  });
});
