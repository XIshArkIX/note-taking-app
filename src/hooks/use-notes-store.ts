"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { filterNotes, getSummary, sortNotes } from "@/lib/note-filters";
import { notesRepository } from "@/lib/notes-repository";
import type {
  CreateNoteInput,
  Note,
  NotesFilter,
  UpdateNoteInput,
} from "@/types/note";

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
