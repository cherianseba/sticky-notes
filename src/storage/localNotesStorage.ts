import type { NotesStorage } from './NotesStorage'
import { parseNotes } from './parseNotes'

const STORAGE_KEY = 'sticky-notes/v1'

export const localNotesStorage: NotesStorage = {
  async load() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    try {
      return parseNotes(JSON.parse(raw))
    } catch {
      return []
    }
  },

  async save(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  },
}
