import type { Note } from './types'

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** `query` must already be normalized. An empty query matches every note. */
export function matchesQuery(note: Note, query: string): boolean {
  return (
    query === '' ||
    note.title.toLowerCase().includes(query) ||
    note.text.toLowerCase().includes(query)
  )
}
