import type { Note, NotesFilter, NotesSummary } from "@/types/note";

export const isOverdue = (note: Note, nowMs: number) =>
  note.dueDate !== null && Date.parse(note.dueDate) < nowMs;

export const sortNotes = (notes: Note[]): Note[] =>
  [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

export const getSummary = (notes: Note[]): NotesSummary => {
  const nowMs = Date.now();
  return notes.reduce<NotesSummary>(
    (acc, note) => {
      if (note.deletedAt !== null) {
        acc.trash += 1;
        return acc;
      }
      acc.all += 1;
      if (isOverdue(note, nowMs)) {
        acc.archive += 1;
      }
      return acc;
    },
    { all: 0, archive: 0, trash: 0 },
  );
};

export const filterNotes = (notes: Note[], filter: NotesFilter): Note[] => {
  const nowMs = Date.now();

  if (filter === "trash") {
    return notes.filter((note) => note.deletedAt !== null);
  }

  if (filter === "archive") {
    return notes.filter(
      (note) => note.deletedAt === null && isOverdue(note, nowMs),
    );
  }

  return notes.filter((note) => note.deletedAt === null);
};
