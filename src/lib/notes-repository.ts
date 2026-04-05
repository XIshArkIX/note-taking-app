import { getNotesDb, NOTES_STORE_NAME } from "@/lib/db";
import { createNoteSchema, updateNoteSchema } from "@/lib/note-schema";
import type {
  CreateNoteInput,
  Note,
  NoteTag,
  UpdateNoteInput,
} from "@/types/note";

const toIsoNow = () => new Date().toISOString();

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const isPresetTag = (value: string): value is "info" | "warn" | "error" =>
  value === "info" || value === "warn" || value === "error";

const normalizeTag = (tag: unknown): NoteTag | null => {
  if (typeof tag === "string") {
    if (isPresetTag(tag)) {
      return { name: tag, type: tag };
    }

    const trimmed = tag.trim();
    return trimmed ? { name: trimmed, type: "info" } : null;
  }

  if (typeof tag !== "object" || tag === null) {
    return null;
  }

  const candidate = tag as Partial<NoteTag>;
  if (typeof candidate.name !== "string") {
    return null;
  }

  const name = candidate.name.trim();
  if (!name) {
    return null;
  }

  if (
    candidate.type === "info" ||
    candidate.type === "warn" ||
    candidate.type === "error"
  ) {
    return {
      name,
      type: candidate.type,
    };
  }

  if (candidate.type === "custom" && typeof candidate.color === "string") {
    return {
      name,
      type: "custom",
      color: candidate.color,
    };
  }

  return null;
};

const normalizeNoteTags = (note: Note): Note => {
  const normalizedTags = Array.isArray(note.tags)
    ? note.tags.map((tag) => normalizeTag(tag)).filter((tag) => tag !== null)
    : [];

  return {
    ...note,
    tags: normalizedTags,
  };
};

const normalizeCreatedNote = (input: CreateNoteInput): Note => {
  const parsed = createNoteSchema.parse(input);
  const now = toIsoNow();
  const startDate = parsed.startDate ?? now;

  return {
    id: createId(),
    title: parsed.title,
    content: parsed.content,
    tags: parsed.tags ?? [],
    isPinned: parsed.isPinned ?? false,
    startDate,
    dueDate: parsed.dueDate ?? null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
};

const applyUpdate = (current: Note, input: UpdateNoteInput): Note => {
  const parsed = updateNoteSchema.parse(input);
  const merged: Note = {
    ...current,
    ...parsed,
    updatedAt: toIsoNow(),
  };

  const parsedCreateEquivalent = createNoteSchema.parse({
    title: merged.title,
    content: merged.content,
    tags: merged.tags,
    isPinned: merged.isPinned,
    startDate: merged.startDate,
    dueDate: merged.dueDate,
  });

  return {
    ...merged,
    title: parsedCreateEquivalent.title,
    content: parsedCreateEquivalent.content,
    tags: parsedCreateEquivalent.tags ?? [],
    isPinned: parsedCreateEquivalent.isPinned ?? false,
    startDate: parsedCreateEquivalent.startDate ?? merged.startDate,
    dueDate: parsedCreateEquivalent.dueDate ?? null,
  };
};

export const notesRepository = {
  async list() {
    const db = await getNotesDb();
    const notes = await db.getAll(NOTES_STORE_NAME);
    return notes.map((note) => normalizeNoteTags(note));
  },

  async create(input: CreateNoteInput) {
    const note = normalizeCreatedNote(input);
    const db = await getNotesDb();
    await db.put(NOTES_STORE_NAME, note);
    return note;
  },

  async update(id: string, input: UpdateNoteInput) {
    const db = await getNotesDb();
    const current = await db.get(NOTES_STORE_NAME, id);
    if (!current) {
      throw new Error("Note not found");
    }

    const updated = applyUpdate(current, input);
    await db.put(NOTES_STORE_NAME, updated);
    return updated;
  },

  async togglePin(id: string) {
    const db = await getNotesDb();
    const current = await db.get(NOTES_STORE_NAME, id);
    if (!current) {
      throw new Error("Note not found");
    }

    const updated: Note = {
      ...current,
      isPinned: !current.isPinned,
      updatedAt: toIsoNow(),
    };

    await db.put(NOTES_STORE_NAME, updated);
    return updated;
  },

  async softDelete(id: string) {
    const db = await getNotesDb();
    const current = await db.get(NOTES_STORE_NAME, id);
    if (!current) {
      throw new Error("Note not found");
    }

    const updated: Note = {
      ...current,
      deletedAt: toIsoNow(),
      updatedAt: toIsoNow(),
    };

    await db.put(NOTES_STORE_NAME, updated);
    return updated;
  },
};
