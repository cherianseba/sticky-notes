// One sticky note: move it by the top bar, resize it from the corner, edit its title and text.

import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { isClick, moveRect, resizeRect } from '../geometry'
import { useDismiss } from '../hooks/useDismiss'
import { usePointerDrag } from '../hooks/usePointerDrag'
import type { NotesActions } from '../state/useNotes'
import type { Note, Point, Rect, Size } from '../types'
import { ColorSwatches } from './ColorSwatches'
import { IconButton } from './IconButton'

/** What a note needs from the board it sits on. The board keeps this object stable. */
export interface BoardApi {
  getSize(): Size
  /** `pointer` is in viewport coordinates. */
  isOverTrash(pointer: Point): boolean
  setTrashActive(active: boolean): void
}

interface NoteViewProps {
  readonly note: Note
  readonly actions: NotesActions
  readonly board: BoardApi
  readonly autoFocus: boolean
}

/** What a move or resize remembers from the moment it started. */
interface GestureStart {
  /** The note's position and size when the gesture began. */
  readonly origin: Rect
  readonly bounds: Size
}

interface MoveStart extends GestureStart {
  /** Set when the press landed on the title: if it turns out to be a click, we focus the title. */
  readonly titleToFocus: HTMLInputElement | null
}

/** Presses on the header's buttons or the color popover are clicks, never drags. */
function startedOnControl(event: ReactPointerEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest('button, .popover') !== null
}

/**
 * KEY PERFORMANCE IDEA: while a note is being dragged or resized, its live position lives in
 * this component's own state (`draft`). The shared notes list is updated only once, on release.
 * So during a drag only this one note re-renders, and nothing is saved until the drag ends.
 *
 * `memo` skips re-rendering this note when its props did not change (e.g. another note moved).
 */
export const NoteView = memo(function NoteView({ note, actions, board, autoFocus }: NoteViewProps) {
  const [draft, setDraft] = useState<Rect | null>(null)
  const [overTrash, setOverTrash] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const paletteRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoFocus) textRef.current?.focus()
  }, [autoFocus])

  useDismiss(paletteRef, paletteOpen, () => setPaletteOpen(false))

  const gestureStart = (): GestureStart => ({ origin: note, bounds: board.getSize() })

  const endGesture = (): void => {
    setDraft(null)
    setOverTrash(false)
    board.setTrashActive(false)
  }

  // Move: the whole top bar is the handle, title included.
  // Press + drag on the title moves the note; press + release without moving edits the title.
  const startMove = usePointerDrag<MoveStart>({
    onStart(event) {
      if (startedOnControl(event)) return null
      const title = titleRef.current
      const onTitle = event.target === title
      // While the title is being edited, let the mouse select text instead of dragging.
      if (onTitle && document.activeElement === title) return null
      return { ...gestureStart(), titleToFocus: onTitle ? title : null }
    },
    onMove({ origin, bounds }, delta, pointer) {
      const isOver = board.isOverTrash(pointer)
      setDraft(moveRect(origin, delta, bounds))
      setOverTrash(isOver)
      board.setTrashActive(isOver)
    },
    onEnd({ origin, bounds, titleToFocus }, delta, pointer) {
      endGesture()
      if (board.isOverTrash(pointer)) {
        actions.remove(note.id)
      } else if (isClick(delta)) {
        titleToFocus?.focus()
      } else {
        const { x, y } = moveRect(origin, delta, bounds)
        actions.update(note.id, { x, y })
      }
    },
    onCancel: endGesture,
  })

  const startResize = usePointerDrag<GestureStart>({
    onStart: gestureStart,
    onMove: ({ origin, bounds }, delta) => setDraft(resizeRect(origin, delta, bounds)),
    onEnd({ origin, bounds }, delta) {
      endGesture()
      const { width, height } = resizeRect(origin, delta, bounds)
      actions.update(note.id, { width, height })
    },
    onCancel: endGesture,
  })

  // Show the live draft while a gesture is running, otherwise the saved note.
  const rect = draft ?? note
  const style: CSSProperties = {
    width: rect.width,
    height: rect.height,
    // `transform` instead of left/top: the browser can move the note without recalculating layout.
    transform: `translate(${rect.x}px, ${rect.y}px)${overTrash ? ' scale(0.85)' : ''}`,
    zIndex: note.z,
  }

  let className = 'note'
  if (draft) className += ' note--active'
  if (overTrash) className += ' note--over-trash'

  return (
    <article
      className={className}
      style={style}
      data-color={note.color}
      // Capture phase: any press on the note brings it to the front, before anything else runs.
      onPointerDownCapture={() => actions.bringToFront(note.id)}
    >
      <header className="note__header" onPointerDown={startMove}>
        <span className="note__dot" />
        <input
          ref={titleRef}
          className="note__title"
          value={note.title}
          placeholder="Untitled"
          aria-label="Note title"
          spellCheck={false}
          // Stop a press from focusing the title, so it can start a drag instead.
          // If the press turns out to be a click, `onEnd` above focuses it.
          onMouseDown={(event) => {
            if (document.activeElement !== event.currentTarget) event.preventDefault()
          }}
          onChange={(event) => actions.update(note.id, { title: event.target.value })}
        />
        <div ref={paletteRef} className="note__palette">
          <IconButton
            icon="palette"
            label="Change color"
            pressed={paletteOpen}
            size={15}
            onClick={() => setPaletteOpen((open) => !open)}
          />
          {paletteOpen && (
            <div className="popover">
              <ColorSwatches
                label="Note color"
                selected={note.color}
                onSelect={(color) => {
                  actions.update(note.id, { color })
                  setPaletteOpen(false)
                }}
              />
            </div>
          )}
        </div>
        <IconButton
          icon="trash"
          label="Delete note"
          size={15}
          onClick={() => actions.remove(note.id)}
        />
      </header>

      <textarea
        ref={textRef}
        className="note__text"
        value={note.text}
        placeholder="Write something…"
        aria-label="Note text"
        spellCheck={false}
        onChange={(event) => actions.update(note.id, { text: event.target.value })}
      />

      <div className="note__resize" title="Drag to resize" onPointerDown={startResize} />
    </article>
  )
})
