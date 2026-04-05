"use client";

import type { ReactNode } from "react";

import type { NotesFilter, NotesSummary } from "@/types/note";

interface NotesSidebarProps {
  activeFilter: NotesFilter;
  summary: NotesSummary;
  onCreateNote: () => void;
  onChangeFilter: (filter: NotesFilter) => void;
  footer: ReactNode;
}

const filterLabels: Record<NotesFilter, string> = {
  all: "All",
  archive: "Archive",
  trash: "Trash",
};

export function NotesSidebar({
  activeFilter,
  summary,
  onCreateNote,
  onChangeFilter,
  footer,
}: NotesSidebarProps) {
  return (
    <aside className="flex w-full flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 lg:max-w-72">
      <div className="space-y-3">
        <h1 className="px-2 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Anchor-Style Notes
        </h1>
        <p className="px-2 text-xs text-zinc-500 dark:text-zinc-400">
          Local-first notes stored in your browser
        </p>
      </div>

      <button
        type="button"
        onClick={onCreateNote}
        className="mt-4 flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        + Create Note
      </button>

      <nav className="mt-4 space-y-1">
        {(Object.keys(filterLabels) as NotesFilter[]).map((filter) => {
          const count = summary[filter];
          const isActive = filter === activeFilter;
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onChangeFilter(filter)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              <span>{filterLabels[filter]}</span>
              <span className="text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-zinc-200 pt-3 dark:border-zinc-800">
        {footer}
      </div>
    </aside>
  );
}
