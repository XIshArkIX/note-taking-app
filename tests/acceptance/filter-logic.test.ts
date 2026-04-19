import { describe, expect, it } from "vitest";

import {
  filterNotes,
  getSummary,
  isOverdue,
  sortNotes,
} from "@/lib/note-filters";
import type { Note } from "@/types/note";

import { CRITERIA } from "./criteria";

// ── fixtures ───────────────────────────────────────────────────────────────

const PAST_MS = Date.now() - 1000 * 60 * 60 * 24; // yesterday
const FUTURE_MS = Date.now() + 1000 * 60 * 60 * 24; // tomorrow

const note = (overrides: Partial<Note> = {}, id = "n1"): Note => ({
  id,
  title: "Test note",
  content: "Content",
  tags: [],
  isPinned: false,
  startDate: new Date(PAST_MS - 1000).toISOString(),
  dueDate: null,
  deletedAt: null,
  createdAt: new Date(PAST_MS - 1000).toISOString(),
  updatedAt: new Date(PAST_MS - 1000).toISOString(),
  ...overrides,
});

const overdue = (id = "overdue") =>
  note({ dueDate: new Date(PAST_MS).toISOString() }, id);

const trashed = (id = "trashed") =>
  note({ deletedAt: new Date(PAST_MS).toISOString() }, id);

const trashedOverdue = (id = "both") =>
  note(
    {
      dueDate: new Date(PAST_MS).toISOString(),
      deletedAt: new Date(PAST_MS).toISOString(),
    },
    id,
  );

// ── filterNotes ─────────────────────────────────────────────────────────────

describe("filterNotes", () => {
  it(CRITERIA.FN_09.title, () => {
    const notes = [note("n1"), trashed("t1")];
    const result = filterNotes(notes as Note[], "all");
    expect(result.map((n) => n.id)).toEqual(["n1"]);
  });

  it(CRITERIA.FN_10.title, () => {
    const notes = [note("n1"), trashed("t1"), overdue("o1")];
    const result = filterNotes(notes as Note[], "trash");
    expect(result.map((n) => n.id)).toEqual(["t1"]);
  });

  it(CRITERIA.FN_11.title, () => {
    const notes = [
      note("live"),
      overdue("od"),
      trashed("tr"),
    ];
    const result = filterNotes(notes as Note[], "archive");
    expect(result.map((n) => n.id)).toEqual(["od"]);
  });

  it(CRITERIA.FN_12.title, () => {
    const notes = [trashedOverdue("both"), overdue("od")];
    const result = filterNotes(notes as Note[], "archive");
    expect(result.map((n) => n.id)).toEqual(["od"]);
  });

  it("archive excludes notes with no dueDate", () => {
    const result = filterNotes([note("n1")], "archive");
    expect(result).toHaveLength(0);
  });

  it("archive excludes notes with a future dueDate", () => {
    const futureNote = note({ dueDate: new Date(FUTURE_MS).toISOString() }, "f1");
    const result = filterNotes([futureNote], "archive");
    expect(result).toHaveLength(0);
  });
});

// ── sortNotes ───────────────────────────────────────────────────────────────

describe("sortNotes", () => {
  it(CRITERIA.FN_13.title, () => {
    const older = note({ isPinned: false, updatedAt: new Date(1000).toISOString() }, "older");
    const pinned = note({ isPinned: true, updatedAt: new Date(500).toISOString() }, "pinned");
    const result = sortNotes([older, pinned]);
    expect(result[0].id).toBe("pinned");
  });

  it(CRITERIA.FN_14.title, () => {
    const old = note({ updatedAt: new Date(1000).toISOString() }, "old");
    const newer = note({ updatedAt: new Date(2000).toISOString() }, "newer");
    const result = sortNotes([old, newer]);
    expect(result[0].id).toBe("newer");
  });

  it("does not mutate the original array", () => {
    const notes = [note("a"), note("b", "b")];
    const original = [...notes];
    sortNotes(notes);
    expect(notes.map((n) => n.id)).toEqual(original.map((n) => n.id));
  });
});

// ── getSummary ───────────────────────────────────────────────────────────────

describe("getSummary", () => {
  const notes = [
    note("live"),
    overdue("od"),
    trashed("tr"),
    trashedOverdue("both"),
  ];

  it(CRITERIA.FN_15.title, () => {
    expect(getSummary(notes).all).toBe(2); // live + od (not trashed)
  });

  it(CRITERIA.FN_16.title, () => {
    expect(getSummary(notes).archive).toBe(1); // od only
  });

  it(CRITERIA.FN_17.title, () => {
    expect(getSummary(notes).trash).toBe(2); // tr + both
  });

  it("all zeros for empty list", () => {
    expect(getSummary([])).toEqual({ all: 0, archive: 0, trash: 0 });
  });
});

// ── isOverdue ────────────────────────────────────────────────────────────────

describe("isOverdue", () => {
  it("returns true when dueDate is in the past", () => {
    const n = overdue();
    expect(isOverdue(n, Date.now())).toBe(true);
  });

  it("returns false when dueDate is in the future", () => {
    const n = note({ dueDate: new Date(FUTURE_MS).toISOString() });
    expect(isOverdue(n, Date.now())).toBe(false);
  });

  it("returns false when dueDate is null", () => {
    expect(isOverdue(note(), Date.now())).toBe(false);
  });
});
