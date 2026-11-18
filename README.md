# Sticky Notes

A single-page sticky notes board built with React and TypeScript. It uses no external UI, drag-and-drop or state libraries: the only runtime dependencies are React and React DOM.

## Approach

Every feature in the assesment isntruction is some kind of drag, so the design starts from one reusable drag hook. Creating, moving and resizing a note are the same gesture (press, drag, release) with different maths. The maths and the state changes are plain functions with no React in them, so they are easy to read and to unit test. Storage sits behind one small asynchronous interface, so local storage and a REST API are interchangeable.

## Features

Required by the assessment instruction:

1. **Create a new note of the specified size at the specified position** - press on the empty board and drag to draw the note. A live outline shows its size. Double-clicking the board drops a default-sized note at the pointer, and the + Note button adds one near the middle.
2. **Change note size by dragging**: drag the grip in a note's bottom-right corner.
3. **Move a note by dragging**: drag a note by its top bar.
4. **Remove a note by dragging it over a predefined "trash" zone**: drag a note over the zone in the bottom-right corner and release. The zone lights up while the note is over it.

Bonus from the assessment instruction (all five):

- **Entering/editing note text**: every note has a title and a body. A new note is focused straight away.
- **Moving notes to front (in case of overlapping notes)**: pressing anywhere on a note raises it above the others.
- **Saving notes to local storage (restoring them on page load)**: notes are saved automatically and restored on page load.
- **Different note colors**: the toolbar sets the color of new notes; the palette button on a note recolors it.
- **Saving notes to REST API**: a REST storage adapter, runnable against an asynchronous in-browser mock.

Also included: a delete button on every note, a help popover listing the gestures, and `Esc` to cancel a gesture in progress.

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
npm test           # unit tests
```

### Where notes are saved

- **Local storage** is the default.
- **Mock API** (`npm run dev:mock-api`, or `VITE_NOTES_STORAGE=mock-api`): the app uses the same REST adapter it would use against a server, but requests are answered by `src/storage/mockNotesApi.ts`, with a random delay of 150–600 ms per request. This shows the "Saving…" state and overlapping edits as they would behave over a network.

## Project structure

```
src/
  main.tsx                 picks the storage and renders <App>
  App.tsx                  layout: Toolbar on top, Board below
  types.ts                 Note, Rect, Point, Size, NoteColor
  geometry.ts              pure maths: move, resize, draw a rect inside the board

  components/
    Board.tsx              draws new notes, renders the notes, owns the trash zone
    NoteView.tsx           one note: move, resize, edit, recolor, delete
    Toolbar.tsx            + Note, color picker, save status, help
    TrashZone.tsx, ColorSwatches.tsx, Icon.tsx, IconButton.tsx

  hooks/
    usePointerDrag.ts      the one drag hook used for draw, move and resize
    useDismiss.ts          closes a popover on an outside click or Esc

  state/
    notesReducer.ts        the only place where notes change (pure function)
    useNotes.ts            React hook: reducer + load + autosave
    autosaver.ts           debounced saves, never two at once

  storage/
    NotesStorage.ts        the interface: load() and save()
    localNotesStorage.ts   local storage implementation
    restNotesStorage.ts    REST implementation (fetch is injectable)
    mockNotesApi.ts        in-browser fake server for the REST adapter
    parseNotes.ts          validates stored data before it is trusted
    createNotesStorage.ts  chooses the implementation from env variables
```

## Architecture

The code is split into three layers with one-way dependencies. **Pure logic** has no React in it: `geometry.ts` does the maths for moving, resizing and drawing rectangles inside the board, `state/notesReducer.ts` is the single place where notes change, and `state/autosaver.ts` decides when to save. **Persistence** sits behind the small asynchronous `NotesStorage` interface (`load` / `save`) with a local storage and a REST implementation; the REST one takes its `fetch` function as a parameter, which is how the asynchronous mock API is plugged in. The implementation is chosen once in `main.tsx` and passed into `App`, and everything read from storage is validated by `parseNotes` before it is trusted. **The UI** is `Board` (draws new notes, owns the trash zone), `NoteView` (one note) and `Toolbar`; the `useNotes` hook connects it to the other two layers. All dragging goes through one hook, `usePointerDrag`, which turns Pointer Events into a gesture
with `onStart` / `onMove` / `onEnd` / `onCancel` callbacks. It captures the pointer (so a drag keeps working when the cursor leaves the element or the window), limits updates to one per animation frame, and cancels on `Esc`. Drawing, moving and resizing a note are three small configurations of this hook that hand the maths to `geometry.ts`.

Performance comes from keeping gesture updates local. While a note is dragged or resized, its live position is kept in that note's own state and committed to the store once, on release, so a gesture re-renders only that note and nothing is saved mid-drag. Notes are memoized, the reducer keeps untouched notes as the same objects, positions are applied with `transform`, and stacking uses a `z` value per note so the DOM order never changes. The details are below.

## Performance

The main idea is to keep gesture updates local:

- **Local draft state while dragging.** While a note is moved or resized, its live position is kept in that note's own component state. The shared notes list is updated once, on release. So during a drag only one note re-renders, and nothing is saved mid-drag.
- **`React.memo` + stable references.** `NoteView` is memoized. The reducer returns the same
  object for every note that did not change, and `actions` and the board helper object never
  change identity, so memo can skip the untouched notes.
- **`transform` for position.** Notes are positioned with `transform: translate(...)`, which the browser can apply without recalculating layout. The note being dragged also gets
  `will-change: transform`.
- **One update per frame.** Pointer moves are batched with `requestAnimationFrame`.
- **`z` instead of array order.** Bringing a note to front changes its `z` value; the array (and so the DOM order) stays the same, so React never moves DOM nodes.
- **Debounced, sequential saves.** Saves wait 400 ms after the last change and never overlap: with a network backend two requests could finish in either order, so a change made during a save is sent after that save completes.

## Assumptions and trade-offs

- Desktop with a mouse or trackpad, 1024×768 and up, in current Chrome, Firefox and Edge.
- Notes cannot be dragged or resized outside the board. If the window shrinks, notes beyond the new edge stay where they are and reappear when the window grows again.
- A note cannot be smaller than 168×120 px. A drawn outline below that size is discarded, which also stops a stray click from creating a note.
- There is no undo for deleting a note.
- The note's whole top bar is the drag handle, title included: a click on the title edits it, a drag moves the note.
- The REST adapter saves the whole collection on each change. That is simple and fine for a
  personal board; a multi-user board would need per-note endpoints and conflict handling.
- Unit tests cover the logic that can go wrong silently: geometry, the reducer, validation of stored data and save scheduling. Components and gestures are not covered by automated tests.