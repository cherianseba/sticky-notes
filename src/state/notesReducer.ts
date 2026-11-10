import type { Note, NotePatch, Rect } from '../types'

export type NewNote = Omit<Note, 'z'>

export type NotesAction =
  | { readonly type: 'loaded'; readonly notes: readonly Note[] }
  | { readonly type: 'added'; readonly note: NewNote }
  | { readonly type: 'updated'; readonly id: string; readonly patch: NotePatch }
  | { readonly type: 'removed'; readonly id: string }
  | { readonly type: 'broughtToFront'; readonly id: string }
  | { readonly type: 'arranged'; readonly rects: ReadonlyMap<string, Rect> }

function topZ(notes: readonly Note[]): number {
  return notes.reduce((max, note) => Math.max(max, note.z), 0)
}

function isNoOp(note: Note, patch: NotePatch): boolean {
  return (Object.keys(patch) as (keyof NotePatch)[]).every((key) => patch[key] === note[key])
}

/**
 * Every case returns the previous array when nothing changed, and keeps untouched notes
 * referentially equal, so memoized note components and the persistence layer can rely on identity.
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
      const target = notes.find((note) => note.id === action.id)
      const top = topZ(notes)
      if (!target || (target.z === top && notes.filter((note) => note.z === top).length === 1)) {
        return notes
      }
      const raised: Note = { ...target, z: top + 1 }
      return notes.map((note) => (note === target ? raised : note))
    }

    case 'arranged': {
      let changed = false
      const arranged = notes.map((note) => {
        const rect = action.rects.get(note.id)
        if (!rect || isNoOp(note, rect)) return note
        changed = true
        return { ...note, ...rect }
      })
      return changed ? arranged : notes
    }
  }
}
