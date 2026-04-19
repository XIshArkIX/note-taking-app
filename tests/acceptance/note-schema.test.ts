import { describe, expect, it } from "vitest";

import {
  createNoteSchema,
  noteTagSchema,
  updateNoteSchema,
} from "@/lib/note-schema";

import { CRITERIA } from "./criteria";

// ── helpers ────────────────────────────────────────────────────────────────

const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-12-31T23:59:59.000Z";

const validCreate = () => ({
  title: "Buy groceries",
  content: "Milk, eggs, bread",
});

// ── createNoteSchema ────────────────────────────────────────────────────────

describe("createNoteSchema", () => {
  it(CRITERIA.FN_01.title, () => {
    const result = createNoteSchema.safeParse(validCreate());
    expect(result.success).toBe(true);
  });

  it(CRITERIA.FN_02.title, () => {
    const result = createNoteSchema.safeParse({
      ...validCreate(),
      title: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it(CRITERIA.FN_03.title, () => {
    const tags = [
      { name: "a", type: "info" },
      { name: "b", type: "warn" },
      { name: "c", type: "error" },
      { name: "d", type: "info" },
    ];
    const result = createNoteSchema.safeParse({ ...validCreate(), tags });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toMatch(/tags/);
  });

  it(CRITERIA.FN_04.title, () => {
    const result = createNoteSchema.safeParse({
      ...validCreate(),
      startDate: FUTURE,
      dueDate: PAST,
    });
    expect(result.success).toBe(false);
    const msg = JSON.stringify((result as { error: unknown }).error);
    expect(msg.toLowerCase()).toMatch(/due/);
  });

  it("accepts max 3 tags (boundary)", () => {
    const tags = [
      { name: "a", type: "info" },
      { name: "b", type: "warn" },
      { name: "c", type: "error" },
    ];
    expect(createNoteSchema.safeParse({ ...validCreate(), tags }).success).toBe(
      true,
    );
  });

  it("accepts missing dueDate", () => {
    expect(
      createNoteSchema.safeParse({ ...validCreate(), startDate: PAST }).success,
    ).toBe(true);
  });

  it("accepts dueDate equal to startDate", () => {
    expect(
      createNoteSchema.safeParse({
        ...validCreate(),
        startDate: PAST,
        dueDate: PAST,
      }).success,
    ).toBe(true);
  });

  it("trims title whitespace", () => {
    const result = createNoteSchema.safeParse({
      ...validCreate(),
      title: "  spaced  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("spaced");
  });
});

// ── updateNoteSchema ────────────────────────────────────────────────────────

describe("updateNoteSchema", () => {
  it(CRITERIA.FN_05.title, () => {
    const result = updateNoteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it(CRITERIA.FN_06.title, () => {
    expect(
      updateNoteSchema.safeParse({ title: "New title" }).success,
    ).toBe(true);
  });

  it("accepts deletedAt ISO string", () => {
    expect(
      updateNoteSchema.safeParse({ deletedAt: PAST }).success,
    ).toBe(true);
  });

  it("accepts deletedAt: null (restore from trash)", () => {
    expect(
      updateNoteSchema.safeParse({ deletedAt: null }).success,
    ).toBe(true);
  });

  it("rejects dueDate earlier than startDate", () => {
    const result = updateNoteSchema.safeParse({
      startDate: FUTURE,
      dueDate: PAST,
    });
    expect(result.success).toBe(false);
  });
});

// ── noteTagSchema ───────────────────────────────────────────────────────────

describe("noteTagSchema", () => {
  it(CRITERIA.FN_07.title, () => {
    const result = noteTagSchema.safeParse({ name: "urgent", type: "custom" });
    expect(result.success).toBe(false);
  });

  it(CRITERIA.FN_08.title, () => {
    const result = noteTagSchema.safeParse({
      name: "info-tag",
      type: "info",
      color: "#ff0000",
    });
    expect(result.success).toBe(false);
  });

  it("accepts custom tag with valid hex color", () => {
    expect(
      noteTagSchema.safeParse({
        name: "mine",
        type: "custom",
        color: "#2563eb",
      }).success,
    ).toBe(true);
  });

  it("accepts 3-char hex color on custom tag", () => {
    expect(
      noteTagSchema.safeParse({ name: "x", type: "custom", color: "#abc" })
        .success,
    ).toBe(true);
  });

  it("rejects malformed hex color", () => {
    expect(
      noteTagSchema.safeParse({
        name: "x",
        type: "custom",
        color: "blue",
      }).success,
    ).toBe(false);
  });

  it("accepts all preset tag types without color", () => {
    for (const type of ["info", "warn", "error"] as const) {
      expect(
        noteTagSchema.safeParse({ name: "tag", type }).success,
      ).toBe(true);
    }
  });

  it("rejects tag name longer than 32 chars", () => {
    expect(
      noteTagSchema.safeParse({ name: "x".repeat(33), type: "info" }).success,
    ).toBe(false);
  });
});
