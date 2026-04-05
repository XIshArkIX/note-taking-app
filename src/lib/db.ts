import { type DBSchema, type IDBPDatabase, openDB } from "idb";

import type { Note } from "@/types/note";

const DB_NAME = "offline-notes-db";
const DB_VERSION = 1;
const NOTES_STORE = "notes";

interface NotesDbSchema extends DBSchema {
  notes: {
    key: string;
    value: Note;
  };
}

let dbPromise: Promise<IDBPDatabase<NotesDbSchema>> | null = null;

export const getNotesDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<NotesDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (db.objectStoreNames.contains(NOTES_STORE)) {
          return;
        }

        db.createObjectStore(NOTES_STORE, { keyPath: "id" });
      },
    });
  }

  return dbPromise;
};

export const NOTES_STORE_NAME = NOTES_STORE;
