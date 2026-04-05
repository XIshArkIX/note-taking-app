# Offline-First Notes App

Anchor-inspired self-hostable note-taking web app with local browser persistence using [`idb`](https://www.npmjs.com/package/idb).

## Core Features

- Offline-first storage in IndexedDB via `idb`
- Responsive layout for desktop and mobile
- Left sidebar filters: `All`, `Archive`, `Trash`
- Bottom sidebar theme switcher (`Light`/`Dark`) with local persistence
- Note cards in a grid with:
  - summarizing title
  - description preview limited to first 140 symbols
  - pin icon/button to pin or unpin
  - up to 3 tags (`info`, `warn`, `error`)
  - required start date (default now)
  - optional due date
- Archive behavior: overdue notes only (`dueDate < now`) excluding trashed notes
- Trash behavior: soft-delete using `deletedAt`

## Data Validation

Validation schemas are implemented with `zod` and used for create/update note payloads:

- `createNoteSchema`
- `updateNoteSchema`

## Tech Stack

- Next.js (App Router)
- React
- Tailwind CSS
- `idb`
- `zod`
- Biome

## Project Structure

- `src/app/page.tsx` - app shell, create-note form, sidebar/grid composition
- `src/components/sidebar/notes-sidebar.tsx` - left panel filters + summary
- `src/components/theme/theme-toggle.tsx` - light/dark switcher
- `src/components/notes/note-card.tsx` - note card contract implementation
- `src/components/notes/notes-grid.tsx` - responsive notes grid
- `src/hooks/use-notes-store.ts` - state/filter orchestration
- `src/lib/db.ts` - IndexedDB schema and `idb` setup
- `src/lib/notes-repository.ts` - note CRUD/pin/trash repository
- `src/lib/note-schema.ts` - Zod schemas
- `src/types/note.ts` - domain interfaces/types

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

```bash
npm run lint
```
