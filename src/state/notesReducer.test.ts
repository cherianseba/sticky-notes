import { describe, expect, it } from 'vitest'
import type { Note } from '../types'
import { notesReducer } from './notesReducer'

function makeNote(id: string, overrides: Partial<Note> = {}): Note {
  return {
    id,
    title: '',
    text: '',
    color: 'yellow',
    locked: false,
    x: 0,
    y: 0,
    width: 200,
    height: 150,
    z: 1,
    ...overrides,
  }
}

const a = makeNote('a', { z: 1 })
const b = makeNote('b', { z: 2 })
const c = makeNote('c', { z: 3 })
const notes: readonly Note[] = [a, b, c]

describe('notesReducer', () => {
  it('replaces everything when notes are loaded', () => {
    const loaded = [makeNote('x')]
    expect(notesReducer(notes, { type: 'loaded', notes: loaded })).toBe(loaded)
  })

  it('adds a note on top of the others', () => {
    const { z: _z, ...newNote } = makeNote('d')
    const result = notesReducer(notes, { type: 'added', note: newNote })
    expect(result).toHaveLength(4)
    expect(result[3]).toEqual({ ...newNote, z: 4 })
  })

  it('gives the first note a z of 1', () => {
    const { z: _z, ...newNote } = makeNote('d')
    expect(notesReducer([], { type: 'added', note: newNote })[0]?.z).toBe(1)
  })

  it('updates only the targeted note and keeps the others identical', () => {
    const result = notesReducer(notes, { type: 'updated', id: 'b', patch: { text: 'hello' } })
    expect(result[1]).toEqual({ ...b, text: 'hello' })
    expect(result[0]).toBe(a)
    expect(result[2]).toBe(c)
  })

  it('returns the same array when an update changes nothing', () => {
    expect(notesReducer(notes, { type: 'updated', id: 'b', patch: { x: b.x, y: b.y } })).toBe(notes)
    expect(notesReducer(notes, { type: 'updated', id: 'missing', patch: { x: 5 } })).toBe(notes)
  })

  it('removes a note, and ignores an unknown id', () => {
    expect(notesReducer(notes, { type: 'removed', id: 'b' })).toEqual([a, c])
    expect(notesReducer(notes, { type: 'removed', id: 'missing' })).toBe(notes)
  })

  it('raises a note above all others', () => {
    const result = notesReducer(notes, { type: 'broughtToFront', id: 'a' })
    expect(result[0]).toEqual({ ...a, z: 4 })
    expect(result[1]).toBe(b)
  })

  it('does nothing when the note is already the only one on top', () => {
    expect(notesReducer(notes, { type: 'broughtToFront', id: 'c' })).toBe(notes)
  })

  it('raises a note that shares the top z with another', () => {
    const tied = [a, makeNote('b', { z: 3 }), c]
    expect(notesReducer(tied, { type: 'broughtToFront', id: 'c' })[2]?.z).toBe(4)
  })

  it('arranges the given notes and leaves the rest untouched', () => {
    const rects = new Map([['a', { x: 20, y: 20, width: 250, height: 220 }]])
    const result = notesReducer(notes, { type: 'arranged', rects })
    expect(result[0]).toEqual({ ...a, x: 20, y: 20, width: 250, height: 220 })
    expect(result[1]).toBe(b)
  })

  it('returns the same array when the arrangement changes nothing', () => {
    const rects = new Map([['a', { x: a.x, y: a.y, width: a.width, height: a.height }]])
    expect(notesReducer(notes, { type: 'arranged', rects })).toBe(notes)
  })
})
