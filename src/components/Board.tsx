// The board: draws new notes, renders every note, and owns the trash zone.

import { useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, Ref } from 'react'
import {
  DEFAULT_NOTE_SIZE,
  MIN_NOTE_SIZE,
  containsPoint,
  isAtLeast,
  moveRect,
  rectFromCorners,
} from '../geometry'
import { usePointerDrag } from '../hooks/usePointerDrag'
import type { NotesActions } from '../state/useNotes'
import type { Note, NoteColor, Point, Rect, Size } from '../types'
import { NoteView, type BoardApi } from './NoteView'
import { TrashZone } from './TrashZone'

/** What the parent (App) can ask the board to do through a ref. */
export interface BoardHandle {
  /** Adds a default-sized note near the middle of the board. */
  addNote(): void
}

interface BoardProps {
  readonly ref: Ref<BoardHandle>
  readonly notes: readonly Note[]
  readonly actions: NotesActions
  readonly newNoteColor: NoteColor
}

/** What the "draw a note" gesture remembers from the press. */
interface DrawStart {
  /** Where the press happened, in board coordinates. */
  readonly anchor: Point
  readonly bounds: Size
}

const NO_MOVE: Point = { x: 0, y: 0 }
/** Notes added with the button are offset from each other so they do not stack exactly. */
const CASCADE_STEP = 24
const CASCADE_LENGTH = 8

/** Converts a viewport point into a point relative to the board's top-left corner. */
function toBoardPoint(board: HTMLElement, client: Point): Point {
  const box = board.getBoundingClientRect()
  return { x: client.x - box.left, y: client.y - box.top }
}

function drawnRect({ anchor, bounds }: DrawStart, delta: Point): Rect {
  return rectFromCorners(anchor, { x: anchor.x + delta.x, y: anchor.y + delta.y }, bounds)
}

export function Board({ ref, notes, actions, newNoteColor }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const trashRef = useRef<HTMLDivElement>(null)
  const [trashActive, setTrashActive] = useState(false)
  const [drawing, setDrawing] = useState<Rect | null>(null)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)

  // Created once and never changes, so it does not break React.memo on NoteView.
  // It reads the DOM through refs at the moment it is called, so it is always up to date.
  const boardApi = useMemo<BoardApi>(
    () => ({
      getSize() {
        const board = boardRef.current
        return { width: board?.clientWidth ?? 0, height: board?.clientHeight ?? 0 }
      },
      isOverTrash(pointer) {
        const zone = trashRef.current?.getBoundingClientRect()
        return zone !== undefined && containsPoint(zone, pointer)
      },
      setTrashActive,
    }),
    [],
  )

  const createNote = (rect: Rect): void => {
    setLastCreatedId(actions.add(rect, newNoteColor))
  }

  /** Creates a default-sized note with its top-left corner at `corner`, kept inside the board. */
  const createDefaultNoteAt = (corner: Point): void => {
    createNote(moveRect({ ...corner, ...DEFAULT_NOTE_SIZE }, NO_MOVE, boardApi.getSize()))
  }

  useImperativeHandle(ref, () => ({
    addNote() {
      const bounds = boardApi.getSize()
      const offset = (notes.length % CASCADE_LENGTH) * CASCADE_STEP
      createDefaultNoteAt({
        x: (bounds.width - DEFAULT_NOTE_SIZE.width) / 2 + offset,
        y: (bounds.height - DEFAULT_NOTE_SIZE.height) / 3 + offset,
      })
    },
  }))

  // Press on the empty board and drag to draw a note of any size.
  const startDrawing = usePointerDrag<DrawStart>({
    onStart(event) {
      // Only presses on the empty board draw; presses on a note are handled by the note.
      if (event.target !== event.currentTarget) return null
      return {
        anchor: toBoardPoint(event.currentTarget, { x: event.clientX, y: event.clientY }),
        bounds: boardApi.getSize(),
      }
    },
    onMove: (start, delta) => setDrawing(drawnRect(start, delta)),
    onEnd(start, delta) {
      setDrawing(null)
      const rect = drawnRect(start, delta)
      // Too small means it was probably just a click, so no note is created.
      if (isAtLeast(rect, MIN_NOTE_SIZE)) createNote(rect)
    },
    onCancel: () => setDrawing(null),
  })

  const createAtPointer = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return
    createDefaultNoteAt(toBoardPoint(event.currentTarget, { x: event.clientX, y: event.clientY }))
  }

  const drawingIsValid = drawing !== null && isAtLeast(drawing, MIN_NOTE_SIZE)

  return (
    <div
      ref={boardRef}
      className="board"
      onPointerDown={startDrawing}
      onDoubleClick={createAtPointer}
    >
      <TrashZone ref={trashRef} active={trashActive} />

      {notes.length === 0 && drawing === null && (
        <p className="board__hint">
          Drag on the board to draw a note of any size,
          <br />
          or double-click to drop one where you point.
        </p>
      )}

      {notes.map((note) => (
        <NoteView
          key={note.id}
          note={note}
          actions={actions}
          board={boardApi}
          autoFocus={note.id === lastCreatedId}
        />
      ))}

      {/* Live outline while a note is being drawn. */}
      {drawing && (
        <div
          className={drawingIsValid ? 'drawing' : 'drawing drawing--too-small'}
          data-color={newNoteColor}
          style={{
            width: drawing.width,
            height: drawing.height,
            transform: `translate(${drawing.x}px, ${drawing.y}px)`,
          }}
        >
          <span className="drawing__size">
            {drawingIsValid
              ? `${Math.round(drawing.width)} × ${Math.round(drawing.height)}`
              : 'Keep dragging…'}
          </span>
        </div>
      )}
    </div>
  )
}
