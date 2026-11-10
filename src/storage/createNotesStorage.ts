import { localNotesStorage } from './localNotesStorage'
import { mockNotesApi } from './mockNotesApi'
import type { NotesStorage } from './NotesStorage'
import { createRestNotesStorage } from './restNotesStorage'

/** Picks where notes are kept from the build-time configuration (see `.env.example`). */
export function createNotesStorage(env: ImportMetaEnv): NotesStorage {
  if (env.VITE_NOTES_API_URL) return createRestNotesStorage(env.VITE_NOTES_API_URL)
  if (env.VITE_NOTES_STORAGE === 'mock-api') return createRestNotesStorage('/api', mockNotesApi)
  return localNotesStorage
}
