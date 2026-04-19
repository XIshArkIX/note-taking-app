/**
 * Machine-readable acceptance criteria registry.
 *
 * Each entry maps a stable test ID (used in CI reports, the variant catalog,
 * and test `describe` blocks) to its README source and the test tier that
 * covers it.  Test files import CRITERIA to annotate `it(CRITERIA.FN_01.title`
 * so the human-readable label stays in one place.
 *
 * Tier key
 *   unit   – pure function, no DOM, no IDB; runs in Node / any test runner
 *   int    – integration; needs fake-indexeddb or equivalent IDB shim
 *   e2e    – requires a running app + browser driver (Playwright / Cypress)
 *   visual – screenshot comparison; requires Playwright
 */

export type Tier = "unit" | "int" | "e2e" | "visual";

export interface Criterion {
  id: string;
  title: string;
  readmeAnchor: string;
  tier: Tier;
}

export const CRITERIA = {
  // ── Zod schema validation ──────────────────────────────────────────────────
  FN_01: {
    id: "FN-01",
    title: "createNoteSchema accepts valid minimal payload",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_02: {
    id: "FN-02",
    title: "createNoteSchema rejects title longer than 120 characters",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_03: {
    id: "FN-03",
    title: "createNoteSchema rejects more than 3 tags",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "unit",
  },
  FN_04: {
    id: "FN-04",
    title: "createNoteSchema rejects dueDate earlier than startDate",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_05: {
    id: "FN-05",
    title: "updateNoteSchema rejects an empty payload",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_06: {
    id: "FN-06",
    title: "updateNoteSchema accepts partial fields",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_07: {
    id: "FN-07",
    title: "noteTagSchema requires color on custom tags",
    readmeAnchor: "data-validation",
    tier: "unit",
  },
  FN_08: {
    id: "FN-08",
    title: "noteTagSchema rejects color on non-custom tags",
    readmeAnchor: "data-validation",
    tier: "unit",
  },

  // ── Filter & sort logic ────────────────────────────────────────────────────
  FN_09: {
    id: "FN-09",
    title: "filterNotes('all') excludes trashed notes",
    readmeAnchor: "left-sidebar-filters",
    tier: "unit",
  },
  FN_10: {
    id: "FN-10",
    title: "filterNotes('trash') returns only notes with deletedAt set",
    readmeAnchor: "trash-behavior",
    tier: "unit",
  },
  FN_11: {
    id: "FN-11",
    title: "filterNotes('archive') returns overdue non-trashed notes only",
    readmeAnchor: "archive-behavior",
    tier: "unit",
  },
  FN_12: {
    id: "FN-12",
    title: "filterNotes('archive') excludes trashed overdue notes",
    readmeAnchor: "archive-behavior",
    tier: "unit",
  },
  FN_13: {
    id: "FN-13",
    title: "sortNotes places pinned notes before unpinned",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "unit",
  },
  FN_14: {
    id: "FN-14",
    title: "sortNotes orders by updatedAt descending within same pin state",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "unit",
  },
  FN_15: {
    id: "FN-15",
    title: "getSummary counts only non-trashed notes in 'all'",
    readmeAnchor: "left-sidebar-filters",
    tier: "unit",
  },
  FN_16: {
    id: "FN-16",
    title: "getSummary counts overdue non-trashed notes in 'archive'",
    readmeAnchor: "archive-behavior",
    tier: "unit",
  },
  FN_17: {
    id: "FN-17",
    title: "getSummary counts all deletedAt-set notes in 'trash'",
    readmeAnchor: "trash-behavior",
    tier: "unit",
  },

  // ── Repository / IndexedDB integration ────────────────────────────────────
  INT_01: {
    id: "INT-01",
    title: "notesRepository.create persists note and returns it",
    readmeAnchor: "offline-first-storage",
    tier: "int",
  },
  INT_02: {
    id: "INT-02",
    title: "notesRepository.create defaults startDate to now when omitted",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "int",
  },
  INT_03: {
    id: "INT-03",
    title: "notesRepository.update applies partial changes only",
    readmeAnchor: "data-validation",
    tier: "int",
  },
  INT_04: {
    id: "INT-04",
    title: "notesRepository.togglePin flips isPinned on subsequent calls",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "int",
  },
  INT_05: {
    id: "INT-05",
    title:
      "notesRepository.softDelete sets deletedAt without deleting the record",
    readmeAnchor: "trash-behavior",
    tier: "int",
  },
  INT_06: {
    id: "INT-06",
    title: "notesRepository.list returns normalised tag objects",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "int",
  },

  // ── End-to-end journeys ────────────────────────────────────────────────────
  E2E_01: {
    id: "E2E-01",
    title: "User creates a note and it appears in the grid",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "e2e",
  },
  E2E_02: {
    id: "E2E-02",
    title: "User pins a note and it moves to the top of the grid",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "e2e",
  },
  E2E_03: {
    id: "E2E-03",
    title: "User moves a note to trash; it disappears from All",
    readmeAnchor: "trash-behavior",
    tier: "e2e",
  },
  E2E_04: {
    id: "E2E-04",
    title: "Archive filter shows overdue notes; non-overdue notes are absent",
    readmeAnchor: "archive-behavior",
    tier: "e2e",
  },
  E2E_05: {
    id: "E2E-05",
    title: "Theme toggle switches light/dark; preference persists on reload",
    readmeAnchor: "bottom-sidebar-theme-switcher",
    tier: "e2e",
  },
  E2E_06: {
    id: "E2E-06",
    title: "Sidebar filter badges reflect correct note counts",
    readmeAnchor: "left-sidebar-filters",
    tier: "e2e",
  },

  // ── Visual / screenshot ────────────────────────────────────────────────────
  SS_01: {
    id: "SS-01",
    title: "Note card renders correctly in light mode at 1280px",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "visual",
  },
  SS_02: {
    id: "SS-02",
    title: "Note card renders correctly in dark mode at 1280px",
    readmeAnchor: "note-cards-in-a-grid",
    tier: "visual",
  },
  SS_03: {
    id: "SS-03",
    title: "Grid layout renders correctly on mobile viewport (375px)",
    readmeAnchor: "responsive-layout",
    tier: "visual",
  },
  SS_04: {
    id: "SS-04",
    title: "Sidebar renders correctly in light and dark modes",
    readmeAnchor: "left-sidebar-filters",
    tier: "visual",
  },
} as const satisfies Record<string, Criterion>;

export type CriterionId = keyof typeof CRITERIA;

/** Flat list of all criteria — useful for reporting. */
export const ALL_CRITERIA: Criterion[] = Object.values(CRITERIA);
