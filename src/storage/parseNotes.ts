import { NOTE_COLORS, type Note, type NoteColor } from '../types'

function isNoteColor(value: unknown): value is NoteColor {
  return (NOTE_COLORS as readonly unknown[]).includes(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Returns a note holding only the known fields, or `null` if an essential one is missing or malformed. */
function parseNote(value: unknown): Note | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, title, text, color, locked, x, y, width, height, z } = value as Record<
    string,
    unknown
  >
  if (
    typeof id !== 'string' ||
    typeof text !== 'string' ||
    !isNoteColor(color) ||
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height) ||
    !isFiniteNumber(z)
  ) {
    return null
  }
  return {
    id,
    text,
    color,
    x,
    y,
    width,
    height,
    z,
    // Not essential: a note without them is still worth keeping.
    title: typeof title === 'string' ? title : '',
    locked: locked === true,
  }
}

/** Stored data is untrusted (edited by hand, written by another version, etc.): keep only valid notes. */
export function parseNotes(data: unknown): Note[] {
  if (!Array.isArray(data)) return []
  return data.map(parseNote).filter((note) => note !== null)
}
