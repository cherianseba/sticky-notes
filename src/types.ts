export interface Point {
  readonly x: number
  readonly y: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

export interface Rect extends Point, Size {}

export const NOTE_COLORS = ['yellow', 'pink', 'green', 'blue', 'purple', 'orange'] as const

/** 'yellow' | 'pink' | ... – derived from the array above, so the two can never drift apart. */
export type NoteColor = (typeof NOTE_COLORS)[number]

/** Position and size are in pixels, measured from the board's top-left corner. */
export interface Note extends Rect {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly color: NoteColor
  /** Stacking order: the note with the highest value is drawn on top. */
  readonly z: number
}

/** The fields of a note that an update may change. */
export type NotePatch = Partial<Omit<Note, 'id' | 'z'>>
