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

export type NoteColor = (typeof NOTE_COLORS)[number]

/** Position and size are in board coordinates (pixels from the board's top-left corner). */
export interface Note extends Rect {
  readonly id: string
  readonly title: string
  readonly text: string
  readonly color: NoteColor
  /** A locked note cannot be moved, resized or deleted; its content stays editable. */
  readonly locked: boolean
  /** Stacking order: the note with the highest value is on top. */
  readonly z: number
}

export type NotePatch = Partial<Omit<Note, 'id' | 'z'>>

export type Theme = 'light' | 'dark'
