"use client";

import { useMemo, useRef, useState } from "react";

import { NotesGrid } from "@/components/notes/notes-grid";
import { NotesSidebar } from "@/components/sidebar/notes-sidebar";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useNotesStore } from "@/hooks/use-notes-store";
import { createNoteSchema } from "@/lib/note-schema";
import type { NoteTag, NoteTagType } from "@/types/note";

const presetTagTypes: Exclude<NoteTagType, "custom">[] = [
  "info",
  "warn",
  "error",
];

const toDateTimeLocalValue = (date: Date) => {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const toIsoOrNull = (value: string) =>
  value ? new Date(value).toISOString() : null;

const getFilterTitle = (filter: string) => {
  if (filter === "archive") {
    return "Archive (Overdue)";
  }

  if (filter === "trash") {
    return "Trash";
  }

  return "All Notes";
};

export default function Home() {
  const {
    notes,
    activeFilter,
    summary,
    isLoading,
    error,
    setActiveFilter,
    createNote,
    togglePin,
    moveToTrash,
  } = useNotesStore();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<NoteTag[]>([]);
  const [startDate, setStartDate] = useState(() =>
    toDateTimeLocalValue(new Date()),
  );
  const [dueDate, setDueDate] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagType, setTagType] = useState<NoteTagType>("info");
  const [customTagColor, setCustomTagColor] = useState("#6366f1");
  const [tagInputError, setTagInputError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createDialogRef = useRef<HTMLDialogElement>(null);

  const pinnedCount = useMemo(
    () => notes.filter((note) => note.isPinned).length,
    [notes],
  );

  const addTag = () => {
    const trimmedName = tagName.trim();
    setTagInputError(null);

    if (!trimmedName) {
      setTagInputError("Tag name is required.");
      return;
    }

    if (tags.length >= 3) {
      setTagInputError("You can add up to 3 tags.");
      return;
    }

    if (
      tags.some((tag) => tag.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
      setTagInputError("Tag names must be unique.");
      return;
    }

    const nextTag: NoteTag =
      tagType === "custom"
        ? { name: trimmedName, type: "custom", color: customTagColor }
        : { name: trimmedName, type: tagType };

    setTags((current) => [...current, nextTag]);
    setTagName("");
    setTagType("info");
  };

  const removeTag = (name: string) => {
    setTags((current) => current.filter((tag) => tag.name !== name));
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTags([]);
    setStartDate(toDateTimeLocalValue(new Date()));
    setDueDate("");
    setTagName("");
    setTagType("info");
    setCustomTagColor("#6366f1");
    setTagInputError(null);
  };

  const openCreateDialog = () => {
    setSubmitError(null);
    const dialog = createDialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeCreateDialog = () => {
    createDialogRef.current?.close();
  };

  const handleCreateNote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const parsed = createNoteSchema.safeParse({
      title,
      content,
      tags,
      startDate: new Date(startDate).toISOString(),
      dueDate: toIsoOrNull(dueDate),
    });

    if (!parsed.success) {
      setSubmitError(
        parsed.error.issues[0]?.message ?? "Invalid note payload.",
      );
      return;
    }

    try {
      await createNote(parsed.data);
      resetForm();
      closeCreateDialog();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Could not create note right now.";
      setSubmitError(message);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-6 lg:p-6">
        <NotesSidebar
          activeFilter={activeFilter}
          summary={summary}
          onCreateNote={openCreateDialog}
          onChangeFilter={setActiveFilter}
          footer={<ThemeToggle />}
        />

        <section className="flex flex-1 flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {getFilterTitle(activeFilter)}
            </h2>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Pinned: {pinnedCount}
            </span>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          {isLoading ? (
            <div className="rounded-xl border border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              Loading your notes...
            </div>
          ) : (
            <NotesGrid
              notes={notes}
              onTogglePin={(id) => void togglePin(id)}
              onDelete={(id) => void moveToTrash(id)}
            />
          )}
        </section>
      </main>

      <dialog
        id="create-note-dialog"
        ref={createDialogRef}
        className="z-[2147483647] w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Create Note</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {tags.length}/3 tags selected
            </span>
          </div>

          <form
            onSubmit={handleCreateNote}
            className="grid gap-3 md:grid-cols-2"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Title
              </span>
              <input
                type="text"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Summarizing title"
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Start Date
              </span>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Due Date{" "}
                <span className="font-normal opacity-70">(optional)</span>
              </span>
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Tags
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      No tags added yet.
                    </p>
                  ) : (
                    tags.map((tag) => (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => removeTag(tag.name)}
                        className="rounded-full border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        title="Remove tag"
                      >
                        {tag.name} (
                        {tag.type === "custom" ? tag.color : tag.type}) x
                      </button>
                    ))
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    type="text"
                    value={tagName}
                    onChange={(event) => setTagName(event.target.value)}
                    placeholder="Tag name (e.g. Shopping)"
                    className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Add Tag
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <select
                    value={tagType}
                    onChange={(event) =>
                      setTagType(event.target.value as NoteTagType)
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
                  >
                    {presetTagTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                    <option value="custom">custom color</option>
                  </select>
                  {tagType === "custom" ? (
                    <input
                      type="color"
                      value={customTagColor}
                      onChange={(event) =>
                        setCustomTagColor(event.target.value)
                      }
                      aria-label="Custom tag color"
                      className="h-10 w-full rounded-lg border border-zinc-300 bg-transparent p-1 dark:border-zinc-700 sm:w-16"
                    />
                  ) : (
                    <div />
                  )}
                </div>
              </div>
              {tagInputError ? (
                <p className="text-xs text-rose-600">{tagInputError}</p>
              ) : null}
            </div>
            <label className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Content
              </span>
              <textarea
                required
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Description and note body..."
                className="min-h-24 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
              />
            </label>
            {submitError ? (
              <p className="md:col-span-2 text-sm text-rose-600">
                {submitError}
              </p>
            ) : null}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCreateDialog}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                Save Note
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
