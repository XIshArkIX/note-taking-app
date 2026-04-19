// Re-exports all public schema types for the monorepo.
// Source of truth lives in apps/notes-app/src/lib/note-schema.ts;
// this package makes it consumable by other packages/apps in the workspace.
export { createNoteSchema, updateNoteSchema, noteTagSchema } from "../../apps/notes-app/src/lib/note-schema";
export type { CreateNoteSchema, UpdateNoteSchema } from "../../apps/notes-app/src/lib/note-schema";
