import type { NotesStorage } from './NotesStorage'
import { parseNotes } from './parseNotes'

/** The part of the Fetch API the adapter relies on; lets a mock stand in for the network. */
export type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Expects a minimal API that treats the notes as a single resource:
 *   GET {baseUrl}/notes -> Note[]
 *   PUT {baseUrl}/notes <- Note[]
 */
export function createRestNotesStorage(
  baseUrl: string,
  request: Fetch = (url, init) => fetch(url, init),
): NotesStorage {
  const url = `${baseUrl.replace(/\/+$/, '')}/notes`

  return {
    async load() {
      const response = await request(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error(`Loading notes failed with status ${response.status}`)
      return parseNotes(await response.json())
    },

    async save(notes) {
      const response = await request(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes),
        // Lets the last save complete when it is triggered by the page being closed.
        keepalive: true,
      })
      if (!response.ok) throw new Error(`Saving notes failed with status ${response.status}`)
    },
  }
}
