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

/**
 * Drops the cached db connection so the next `getNotesDb()` opens a fresh
 * database.  Used only in tests (e.g. with fake-indexeddb) to guarantee
 * isolation between cases.  Calling this in production code is a no-op but
 * will force a reconnection on next use.
 */
export const resetDb = async () => {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const NOTES_STORE_NAME = NOTES_STORE;
