"use client";

import { NoteCard } from "@/components/notes/note-card";
import type { Note } from "@/types/note";

interface NotesGridProps {
  notes: Note[];
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotesGrid({ notes, onTogglePin, onDelete }: NotesGridProps) {
  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No notes in this view yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          onTogglePin={onTogglePin}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
