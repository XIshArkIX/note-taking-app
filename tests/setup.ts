/**
 * Test setup — fake-indexeddb polyfill.
 *
 * Imported before every test file via vitest.config.ts `setupFiles`.
 * Replaces the global IndexedDB with an in-memory implementation so
 * notesRepository tests run in Node without a real browser.
 */
import "fake-indexeddb/auto";
