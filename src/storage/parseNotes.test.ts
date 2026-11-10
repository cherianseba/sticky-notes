import { describe, expect, it } from 'vitest'
import { parseNotes } from './parseNotes'

const valid = {
  id: 'a',
  title: 'Title',
  text: 'Text',
  color: 'green',
  locked: true,
  x: 10,
  y: 20,
  width: 200,
  height: 150,
  z: 3,
}

describe('parseNotes', () => {
  it('accepts well-formed notes', () => {
    expect(parseNotes([valid])).toEqual([valid])
  })

  it('returns nothing for data that is not an array', () => {
    expect(parseNotes(null)).toEqual([])
    expect(parseNotes({ notes: [valid] })).toEqual([])
    expect(parseNotes('[]')).toEqual([])
  })

  it('drops malformed entries and keeps the valid ones', () => {
    const data = [
      valid,
      null,
      'note',
      { ...valid, id: 42 },
      { ...valid, color: 'magenta' },
      { ...valid, x: '10' },
      { ...valid, width: Number.NaN },
      { ...valid, z: undefined },
    ]
    expect(parseNotes(data)).toEqual([valid])
  })

  it('fills in defaults for the optional fields', () => {
    const { title: _title, locked: _locked, ...withoutOptional } = valid
    expect(parseNotes([withoutOptional])).toEqual([{ ...valid, title: '', locked: false }])
  })

  it('strips unknown fields', () => {
    expect(parseNotes([{ ...valid, extra: 'ignored' }])).toEqual([valid])
  })
})
