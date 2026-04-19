// Re-exports all public schema types for the monorepo.
// Source of truth lives in apps/notes-app/src/lib/note-schema.ts (path from packages/notes-schema/src/).
// this package makes it consumable by other packages/apps in the workspace.

export type {
  CreateNoteSchema,
  UpdateNoteSchema,
} from "../../../apps/notes-app/src/lib/note-schema";
export {
  createNoteSchema,
  noteTagSchema,
  updateNoteSchema,
} from "../../../apps/notes-app/src/lib/note-schema";
