export type NoteTagType = "info" | "warn" | "error" | "custom";

export interface NoteTag {
  name: string;
  type: NoteTagType;
  color?: string;
}

export type NotesFilter = "all" | "archive" | "trash";

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: NoteTag[];
  isPinned: boolean;
  startDate: string;
  dueDate: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteInput {
  title: string;
  content: string;
  tags?: NoteTag[];
  isPinned?: boolean;
  startDate?: string;
  dueDate?: string | null;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: NoteTag[];
  isPinned?: boolean;
  startDate?: string;
  dueDate?: string | null;
  deletedAt?: string | null;
}

export interface NotesSummary {
  all: number;
  archive: number;
  trash: number;
}
