"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { notesRepository } from "@/lib/notes-repository";
import type {
  CreateNoteInput,
  Note,
  NotesFilter,
  NotesSummary,
  UpdateNoteInput,
} from "@/types/note";

const isOverdue = (note: Note, nowMs: number) =>
  note.dueDate !== null && Date.parse(note.dueDate) < nowMs;

const sortNotes = (notes: Note[]) =>
  [...notes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });

const getSummary = (notes: Note[]): NotesSummary => {
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

const filterNotes = (notes: Note[], filter: NotesFilter): Note[] => {
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

export const useNotesStore = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFilter, setActiveFilter] = useState<NotesFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setError(null);
    try {
      const allNotes = await notesRepository.list();
      setNotes(sortNotes(allNotes));
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load notes.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const summary = useMemo(() => getSummary(notes), [notes]);
  const visibleNotes = useMemo(
    () => filterNotes(notes, activeFilter),
    [notes, activeFilter],
  );

  const createNote = useCallback(async (input: CreateNoteInput) => {
    const created = await notesRepository.create(input);
    setNotes((previous) => sortNotes([created, ...previous]));
    return created;
  }, []);

  const updateNote = useCallback(async (id: string, input: UpdateNoteInput) => {
    const updated = await notesRepository.update(id, input);
    setNotes((previous) =>
      sortNotes(previous.map((note) => (note.id === id ? updated : note))),
    );
    return updated;
  }, []);

  const togglePin = useCallback(async (id: string) => {
    const updated = await notesRepository.togglePin(id);
    setNotes((previous) =>
      sortNotes(previous.map((note) => (note.id === id ? updated : note))),
    );
    return updated;
  }, []);

  const moveToTrash = useCallback(async (id: string) => {
    const updated = await notesRepository.softDelete(id);
    setNotes((previous) =>
      sortNotes(previous.map((note) => (note.id === id ? updated : note))),
    );
    return updated;
  }, []);

  return {
    notes: visibleNotes,
    activeFilter,
    summary,
    isLoading,
    error,
    setActiveFilter,
    loadNotes,
    createNote,
    updateNote,
    togglePin,
    moveToTrash,
  };
};
