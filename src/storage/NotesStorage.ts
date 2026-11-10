import type { Note } from '../types'

/**
 * Persistence boundary. The interface is asynchronous so that a synchronous store
 * (local storage) and a remote one (REST API) are interchangeable for the app.
 */
export interface NotesStorage {
  load(): Promise<Note[]>
  save(notes: readonly Note[]): Promise<void>
}
