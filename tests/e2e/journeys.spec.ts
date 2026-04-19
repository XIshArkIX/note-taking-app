/**
 * End-to-end journeys — Playwright
 *
 * Runner-agnostic contract: these tests encode the same scenarios regardless
 * of which Playwright version is used or whether the stack is Next.js, Vite,
 * or Remix.  The only coupling to the host is BASE_URL (injected via env or
 * playwright.config.ts).
 *
 * IndexedDB clock control
 * -----------------------
 * E2E-04 (archive boundary) manipulates `Date.now()` via
 * `page.clock.setFixedTime()` available in Playwright ≥ 1.45.
 * If testing with an older version, skip that test and note it in the report.
 */

import { expect, test } from "@playwright/test";

import { CRITERIA } from "../acceptance/criteria";

// ── helpers ───────────────────────────────────────────────────────────────

/** Opens the create-note dialog and fills the minimal required fields. */
async function openAndFillCreateDialog(
  page: import("@playwright/test").Page,
  {
    title,
    content,
  }: { title: string; content: string },
) {
  await page.getByRole("button", { name: /new note/i }).click();
  await page.getByLabel(/title/i).fill(title);
  await page.getByLabel(/content/i).fill(content);
}

// ── test suite ────────────────────────────────────────────────────────────

test.describe("Notes app acceptance journeys", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Clear IndexedDB so each test starts from an empty store.
    await page.evaluate(() =>
      indexedDB.deleteDatabase("offline-notes-db"),
    );
    await page.reload();
  });

  test(CRITERIA.E2E_01.title, async ({ page }) => {
    await openAndFillCreateDialog(page, {
      title: "Playwright note",
      content: "Written by an automated test",
    });
    await page.getByRole("button", { name: /save note/i }).click();

    await expect(
      page.getByText("Playwright note"),
    ).toBeVisible({ timeout: 5_000 });
  });

  test(CRITERIA.E2E_02.title, async ({ page }) => {
    // Create two notes so the pin order is observable.
    for (const title of ["Alpha", "Beta"]) {
      await openAndFillCreateDialog(page, { title, content: "body" });
      await page.getByRole("button", { name: /save note/i }).click();
      await expect(page.getByText(title)).toBeVisible();
    }

    // Pin "Alpha" (the older note — it should jump to first position).
    await page
      .getByRole("article")
      .filter({ hasText: "Alpha" })
      .getByRole("button", { name: /pin/i })
      .click();

    const cards = page.getByRole("article");
    await expect(cards.first()).toContainText("Alpha");
  });

  test(CRITERIA.E2E_03.title, async ({ page }) => {
    await openAndFillCreateDialog(page, {
      title: "Doomed note",
      content: "Will be trashed",
    });
    await page.getByRole("button", { name: /save note/i }).click();
    await expect(page.getByText("Doomed note")).toBeVisible();

    await page
      .getByRole("article")
      .filter({ hasText: "Doomed note" })
      .getByRole("button", { name: /delete|trash/i })
      .click();

    await expect(page.getByText("Doomed note")).not.toBeVisible();
  });

  test(CRITERIA.E2E_04.title, async ({ page }) => {
    // Fix the clock at "now", create a note with a past dueDate, then check
    // that it appears in Archive.
    const now = new Date("2030-06-15T12:00:00Z");
    await page.clock.setFixedTime(now);
    await page.goto("/");
    await page.evaluate(() => indexedDB.deleteDatabase("offline-notes-db"));
    await page.reload();

    // Create a note with dueDate one hour ago
    await openAndFillCreateDialog(page, {
      title: "Overdue task",
      content: "Should be archived",
    });

    const pastDue = new Date(now.getTime() - 3_600_000);
    const localPastDue = new Date(
      pastDue.getTime() - pastDue.getTimezoneOffset() * 60_000,
    )
      .toISOString()
      .slice(0, 16);

    await page.getByLabel(/due date/i).fill(localPastDue);
    await page.getByRole("button", { name: /save note/i }).click();
    await expect(page.getByText("Overdue task")).toBeVisible();

    // Create a non-overdue note
    await openAndFillCreateDialog(page, {
      title: "Future task",
      content: "Not overdue",
    });
    await page.getByRole("button", { name: /save note/i }).click();

    // Switch to Archive filter
    await page.getByRole("button", { name: /archive/i }).click();
    await expect(page.getByText("Overdue task")).toBeVisible();
    await expect(page.getByText("Future task")).not.toBeVisible();
  });

  test(CRITERIA.E2E_05.title, async ({ page }) => {
    // Toggle theme to dark
    await page.getByRole("button", { name: /dark|light|theme/i }).click();
    // Verify the html element has the dark class or data-theme attribute
    const isDark = await page.evaluate(
      () =>
        document.documentElement.classList.contains("dark") ||
        document.documentElement.dataset.theme === "dark",
    );
    expect(isDark).toBe(true);

    // Reload and confirm persistence
    await page.reload();
    const stillDark = await page.evaluate(
      () =>
        document.documentElement.classList.contains("dark") ||
        document.documentElement.dataset.theme === "dark",
    );
    expect(stillDark).toBe(true);
  });

  test(CRITERIA.E2E_06.title, async ({ page }) => {
    // Start with empty store — sidebar should show 0 for all filters.
    await expect(
      page.getByRole("navigation").getByText(/all/i),
    ).toBeVisible();

    // Create one note; All count should become 1.
    await openAndFillCreateDialog(page, {
      title: "Count test",
      content: "body",
    });
    await page.getByRole("button", { name: /save note/i }).click();
    await expect(page.getByText("Count test")).toBeVisible();

    // The sidebar should display count 1 next to All.
    await expect(
      page.getByRole("navigation").getByText("1"),
    ).toBeVisible();
  });
});
