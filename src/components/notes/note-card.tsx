"use client";

import type { Note, NoteTagType } from "@/types/note";

interface NoteCardProps {
  note: Note;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getDescription = (content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 140
    ? `${normalized.slice(0, 140)}...`
    : normalized;
};

const tagClassMap: Record<Exclude<NoteTagType, "custom">, string> = {
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  warn: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  error: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const r = Number.parseInt(
    isShort ? normalized[0] + normalized[0] : normalized.slice(0, 2),
    16,
  );
  const g = Number.parseInt(
    isShort ? normalized[1] + normalized[1] : normalized.slice(2, 4),
    16,
  );
  const b = Number.parseInt(
    isShort ? normalized[2] + normalized[2] : normalized.slice(4, 6),
    16,
  );
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function NoteCard({ note, onTogglePin, onDelete }: NoteCardProps) {
  return (
    <article className="note-card grid h-full grid-rows-[auto_auto_1fr_auto] gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
      <div className="note-card__header flex items-start justify-between gap-3">
        <h3 className="note-card__title line-clamp-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {note.title}
        </h3>
        <button
          type="button"
          onClick={() => onTogglePin(note.id)}
          aria-label={note.isPinned ? "Unpin note" : "Pin note"}
          title={note.isPinned ? "Unpin note" : "Pin note"}
          className="rounded-md border border-zinc-200 px-2 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {note.isPinned ? "📌" : "📍"}
        </button>
      </div>

      <p className="note-card__description text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {getDescription(note.content)}
      </p>

      <div className="note-card__tags flex flex-wrap items-center gap-2">
        {note.tags.slice(0, 3).map((tag, index) => {
          const isCustom = tag.type === "custom" && Boolean(tag.color);
          const customColor = isCustom ? tag.color : undefined;
          const tagClass = tag.type === "custom" ? "" : tagClassMap[tag.type];
          return (
            <span
              key={`${tag.name}-${index}`}
              className={`rounded-full px-2 py-1 text-xs font-medium ${tagClass}`}
              style={
                customColor
                  ? {
                      backgroundColor: hexToRgba(customColor, 0.15),
                      color: customColor,
                    }
                  : undefined
              }
            >
              {tag.name}
            </span>
          );
        })}
      </div>

      <footer className="note-card__footer space-y-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <div className="note-card__dates flex items-center justify-between">
          <span>Start: {formatDate(note.startDate)}</span>
          <span>Due: {formatDate(note.dueDate)}</span>
        </div>
        <button
          type="button"
          onClick={() => onDelete(note.id)}
          className="rounded-md border border-zinc-200 px-2 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Move to Trash
        </button>
      </footer>
    </article>
  );
}
