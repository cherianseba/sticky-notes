// The single place where the list of notes changes. Pure function: (old notes, action) => new notes.

import type { Note, NotePatch } from '../types'

/** A note before it gets its stacking order (the reducer assigns `z`). */
export type NewNote = Omit<Note, 'z'>

export type NotesAction =
  | { readonly type: 'loaded'; readonly notes: readonly Note[] }
  | { readonly type: 'added'; readonly note: NewNote }
  | { readonly type: 'updated'; readonly id: string; readonly patch: NotePatch }
  | { readonly type: 'removed'; readonly id: string }
  | { readonly type: 'broughtToFront'; readonly id: string }

function topZ(notes: readonly Note[]): number {
  return notes.reduce((max, note) => Math.max(max, note.z), 0)
}

function isNoOp(note: Note, patch: NotePatch): boolean {
  return (Object.keys(patch) as (keyof NotePatch)[]).every((key) => patch[key] === note[key])
}

/** True when the note is already above every other note, so raising it would change nothing. */
function isAloneOnTop(notes: readonly Note[], target: Note): boolean {
  return notes.every((note) => note === target || note.z < target.z)
}

/**
 * Performance rule used by every case: when nothing changes, return the SAME array; when one
 * note changes, every other note keeps the SAME object. React.memo on NoteView then skips the
 * notes that did not change, and the autosaver skips saves when nothing changed.
 */
export function notesReducer(notes: readonly Note[], action: NotesAction): readonly Note[] {
  switch (action.type) {
    case 'loaded':
      return action.notes

    case 'added':
      return [...notes, { ...action.note, z: topZ(notes) + 1 }]

    case 'updated': {
      const target = notes.find((note) => note.id === action.id)
      if (!target || isNoOp(target, action.patch)) return notes
      const updated: Note = { ...target, ...action.patch }
      return notes.map((note) => (note === target ? updated : note))
    }

    case 'removed': {
      const remaining = notes.filter((note) => note.id !== action.id)
      return remaining.length === notes.length ? notes : remaining
    }

    case 'broughtToFront': {
      // Raising changes `z` only; the array order (and so the DOM order) stays the same.
      const target = notes.find((note) => note.id === action.id)
      if (!target || isAloneOnTop(notes, target)) return notes
      const raised: Note = { ...target, z: topZ(notes) + 1 }
      return notes.map((note) => (note === target ? raised : note))
    }
  }
}
