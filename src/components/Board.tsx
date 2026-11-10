import { useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, Ref } from 'react'
import {
  DEFAULT_NOTE_SIZE,
  MIN_NOTE_SIZE,
  gridCells,
  containsPoint,
  isAtLeast,
  moveRect,
  rectFromCorners,
} from '../geometry'
import { usePointerDrag } from '../hooks/usePointerDrag'
import { matchesQuery } from '../search'
import type { NotesActions } from '../state/useNotes'
import type { Note, NoteColor, Point, Rect, Size } from '../types'
import { NoteView, type NoteEnvironment } from './NoteView'
import { TrashZone } from './TrashZone'

export interface BoardHandle {
  /** Adds a default-sized note near the middle of the board. */
  addNote(): void
  /** Resets the notes to one size and lines them up in a grid. Locked notes are left alone. */
  organizeGrid(): void
}

interface BoardProps {
  readonly ref: Ref<BoardHandle>
  readonly notes: readonly Note[]
  readonly actions: NotesActions
  readonly newNoteColor: NoteColor
  /** Normalized search query; notes that do not match are dimmed. */
  readonly query: string
}

interface DrawContext {
  /** Where the press happened, in board coordinates. */
  readonly anchor: Point
  readonly bounds: Size
}

const NO_MOVE: Point = { x: 0, y: 0 }
/** Notes added with the button are offset from each other so they do not stack exactly. */
const CASCADE_STEP = 24
const GRID_NOTE_SIZE: Size = { width: 250, height: 220 }
const GRID_GAP = 20
const CASCADE_LENGTH = 8

function toBoardPoint(board: HTMLElement, client: Point): Point {
  const box = board.getBoundingClientRect()
  return { x: client.x - box.left, y: client.y - box.top }
}

function drawnRect({ anchor, bounds }: DrawContext, delta: Point): Rect {
  return rectFromCorners(anchor, { x: anchor.x + delta.x, y: anchor.y + delta.y }, bounds)
}

export function Board({ ref, notes, actions, newNoteColor, query }: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const trashRef = useRef<HTMLDivElement>(null)
  const [trashActive, setTrashActive] = useState(false)
  const [drawing, setDrawing] = useState<Rect | null>(null)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)

  const environment = useMemo<NoteEnvironment>(
    () => ({
      getBoardSize() {
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

  const createDefaultNoteAt = (corner: Point): void => {
    createNote(moveRect({ ...corner, ...DEFAULT_NOTE_SIZE }, NO_MOVE, environment.getBoardSize()))
  }

  useImperativeHandle(ref, () => ({
    addNote() {
      const bounds = environment.getBoardSize()
      const offset = (notes.length % CASCADE_LENGTH) * CASCADE_STEP
      createDefaultNoteAt({
        x: (bounds.width - DEFAULT_NOTE_SIZE.width) / 2 + offset,
        y: (bounds.height - DEFAULT_NOTE_SIZE.height) / 3 + offset,
      })
    },
    organizeGrid() {
      const movable = notes.filter((note) => !note.locked)
      const cells = gridCells(movable.length, GRID_NOTE_SIZE, GRID_GAP, environment.getBoardSize())
      actions.arrange(new Map(movable.map((note, index) => [note.id, cells[index] ?? note])))
    },
  }))

  const startDrawing = usePointerDrag<DrawContext>({
    onStart(event) {
      // Only presses on the empty board draw a note; notes handle their own gestures.
      if (event.target !== event.currentTarget) return null
      return {
        anchor: toBoardPoint(event.currentTarget, { x: event.clientX, y: event.clientY }),
        bounds: environment.getBoardSize(),
      }
    },
    onMove: (context, delta) => setDrawing(drawnRect(context, delta)),
    onEnd(context, delta) {
      setDrawing(null)
      const rect = drawnRect(context, delta)
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
          environment={environment}
          autoFocus={note.id === lastCreatedId}
          dimmed={!matchesQuery(note, query)}
        />
      ))}

      {drawing && (
        <div
          className={drawingIsValid ? 'drawing' : 'drawing drawing--too-small'}
          data-color={newNoteColor}
          style={{
            width: drawing.width,
            height: drawing.height,
            transform: `translate3d(${drawing.x}px, ${drawing.y}px, 0)`,
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
