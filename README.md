# Sticky Notes

A single-page sticky notes board built with React and TypeScript, with no UI or drag-and-drop libraries.

## Approach

The assessment focuses on architecture, performance, typing and usability not on the number of features, so I designed the interactions first and the visuals second. Creating, moving and resizing a note are all drag gestures, so they share a single drag hook and differ only in the geometry they apply. That geometry and every change to the notes lives in plain functions outside React, which keeps them simple to follow and to type strictly. Storage sits behind one small async interface, so local storage and a REST API can be swapped without touching the rest of the app. There are no UI, drag-and-drop or state management libraries. React and React DOM are the only runtime dependencies.

## Features

Required by the assignment instruction (all four):

1. **Create a new note of the specified size at the specified position** - press on the empty board and drag to draw the note. A live outline shows its size. Double-clicking the board drops a default-sized note at the pointer, and the **+ Note** button adds one near the middle.
2. **Change note size by dragging** - drag the grip in a note's bottom-right corner.
3. **Move a note by dragging** - drag a note by its top bar.
4. **Remove a note by dragging it over a predefined "trash" zone** - drag a note over the zone in the bottom-right corner and release; the zone lights up while the note is over it.

Bonus from the assessment instruction (all five):

1. **Entering/editing note text** - every note has a title and a body. A new note is focused straight away.
2. **Moving notes to front (in case of overlapping notes)** - pressing anywhere on a note raises it above the others.
3. **Saving notes to local storage (restoring them on page load)** – notes are saved automatically and restored on page load.
4. **Different note colors** – the toolbar sets the color of new notes. The palette button on a note recolors it.
5. **Saving notes to REST API** – a REST storage adapter, runnable against an asynchronous in-browser mock.

Beyond the assesment instruction:

1. **Search** – notes that do not match the query are dimmed, so the layout stays recognisable.
2. **Delete button** on every note, as a quicker alternative to the trash zone.
3. **Lock** – freezes a note's position and size and protects it from deletion.
4. **Organize Grid** – one button resets the unlocked notes to a standard 250 x 220px and lines them up in rows and columns, as many columns as fit the board.
5. **Light and dark themes** – follows the system setting at first, then remembers the choice.
6. **A help popover listing the gestures**.
7. `Esc` cancels a gesture in progress.

## Running locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev            # notes saved to local storage, http://localhost:5173
npm run dev:mock-api   # notes saved through the REST adapter to the mock API
```

```bash
npm run build      # type-check and build for production into dist/
npm run preview    # serve the production build
npm run typecheck  # type-check only
```

### Where notes are saved

- **Local storage** is the default.
- **Mock API** (`npm run dev:mock-api`, or `VITE_NOTES_STORAGE=mock-api`): the app talks to the same REST adapter it would use against a server, but requests are answered by `src/storage/mockNotesApi.ts`. The mock is asynchronous with a random delay of 150–600 ms per
request, so the "Saving…" state and overlapping edits behave as they would over a network.
- **Real server**: set `VITE_NOTES_API_URL` in `.env.local` (see `.env.example`). The API is
expected to expose the notes as one resource: `GET {url}/notes` returns the array of notes and `PUT {url}/notes` replaces it. No server is included in this repository.

## Architecture

The code is split into three layers with one-way dependencies. **Pure logic** has no React in it: `geometry.ts` holds the maths for moving, resizing and drawing rectangles inside the board `state/notesReducer.ts` is the single place where notes change and `state/autosaver.ts` decides when to save. **Persistence** sits behind the small asynchronous `NotesStorage` interface (`load` / `save`) with a local storage and a REST implementation; the REST one takes its `fetch` function as a parameter, which is how the mock API is plugged in without the adapter knowing. The implementation is chosen once in `main.tsx` and injected into `App`, and everything read from storage is validated at runtime before it is trusted. **The UI** consists of `Board` (draws new notes, owns the trash zone), `NoteView` (one note) and `Toolbar`, with icons drawn as inline SVG. The `useNotes` hook connects it to the other two layers. View settings that are not part of the notes (theme, search query) live in `App`.
All dragging goes through one hook, `usePointerDrag`, which turns Pointer Events into a gesture with `onStart` / `onMove` / `onEnd` / `onCancel` callbacks. It captures the pointer (so a drag survives the cursor leaving the element or the window), coalesces moves to one update per animation frame and supports cancelling. Moving, resizing and drawing a note are three small configurations of this hook that delegate the maths to `geometry.ts`. 
Performance comes from keeping gesture updates local. While a note is dragged or resized, its geometry lives in that note's own state and is committed to the store once, on release. So a gesture re-renders only the note involved (notes are memoized and the reducer keeps untouched notes referentially equal), positions are applied with `transform` so the browser can skip layout and nothing is saved mid-drag. Stacking order is a `z` value per note rather than array order, so raising a note never reorders DOM nodes during a gesture. Saves are debounced and run strictly one at a time with an asynchronous backend two overlapping requests could complete in either order so a change made while a save is in flight is sent only after that save completes.

## Assumptions and trade-offs

- Desktop with a mouse or trackpad, 1024×768 and up in current Chrome, Firefox and Edge.
- Notes cannot be dragged or resized outside the board. If the window is made smaller, notes
beyond the new edge stay where they are and reappear when the window grows again.
- A note cannot be smaller than 168×120 px; a drawn outline below that size is discarded, which also keeps a stray click from creating a note.
- There is no undo for deleting a note or for Organize Grid.
- The note's whole top bar is the drag handle, title included. A click on the title edits it a drag moves the note.
- The REST adapter saves the whole collection on each change, which is simple and adequate for a personal board. A multi-user board would need per-note endpoints and conflict handling.
- Tests cover the logic that can go wrong silently: the geometry, the reducer, the validation of stored data and the save scheduling. They are plain unit tests with no DOM. Components and gestures are not covered by automated tests.
