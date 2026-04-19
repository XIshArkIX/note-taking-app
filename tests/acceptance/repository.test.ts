/**
 * Integration tests for notesRepository.
 *
 * These tests require an IndexedDB shim.  The vitest config points
 * `@/lib/db` at a module that uses `fake-indexeddb` instead of the
 * real browser IDB.  For Jest, configure moduleNameMapper equivalently.
 *
 * Every test calls resetDb() in beforeEach so each case gets a clean store.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { resetDb } from "@/lib/db";
import { notesRepository } from "@/lib/notes-repository";

import { CRITERIA } from "./criteria";

// ── helpers ────────────────────────────────────────────────────────────────

const minCreate = (overrides = {}) => ({
  title: "Test note",
  content: "Content body",
  ...overrides,
});

// ── tests ──────────────────────────────────────────────────────────────────

describe("notesRepository", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it(CRITERIA.INT_01.title, async () => {
    const created = await notesRepository.create(minCreate());
    const all = await notesRepository.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(created.id);
    expect(all[0].title).toBe("Test note");
  });

  it(CRITERIA.INT_02.title, async () => {
    const before = Date.now();
    const note = await notesRepository.create(minCreate());
    const after = Date.now();
    const startMs = Date.parse(note.startDate);
    expect(startMs).toBeGreaterThanOrEqual(before);
    expect(startMs).toBeLessThanOrEqual(after);
  });

  it(CRITERIA.INT_03.title, async () => {
    const note = await notesRepository.create(minCreate());
    const updated = await notesRepository.update(note.id, {
      title: "Changed title",
    });
    expect(updated.title).toBe("Changed title");
    expect(updated.content).toBe("Content body");
  });

  it(CRITERIA.INT_04.title, async () => {
    const note = await notesRepository.create(minCreate());
    expect(note.isPinned).toBe(false);
    const pinned = await notesRepository.togglePin(note.id);
    expect(pinned.isPinned).toBe(true);
    const unpinned = await notesRepository.togglePin(note.id);
    expect(unpinned.isPinned).toBe(false);
  });

  it(CRITERIA.INT_05.title, async () => {
    const note = await notesRepository.create(minCreate());
    const deleted = await notesRepository.softDelete(note.id);
    expect(deleted.deletedAt).not.toBeNull();
    const all = await notesRepository.list();
    // record still exists in the store
    expect(all).toHaveLength(1);
    expect(all[0].deletedAt).not.toBeNull();
  });

  it(CRITERIA.INT_06.title, async () => {
    await notesRepository.create(
      minCreate({
        tags: [{ name: "info", type: "info" }],
      }),
    );
    const all = await notesRepository.list();
    expect(all[0].tags[0]).toMatchObject({ name: "info", type: "info" });
  });

  it("throws when updating a non-existent note", async () => {
    await expect(
      notesRepository.update("missing-id", { title: "x" }),
    ).rejects.toThrow("Note not found");
  });

  it("throws when toggling pin of a non-existent note", async () => {
    await expect(notesRepository.togglePin("missing-id")).rejects.toThrow(
      "Note not found",
    );
  });
});
