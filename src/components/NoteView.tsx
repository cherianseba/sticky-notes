import { memo, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { isClick, moveRect, resizeRect } from '../geometry'
import { useDismiss } from '../hooks/useDismiss'
import { usePointerDrag } from '../hooks/usePointerDrag'
import type { NotesActions } from '../state/useNotes'
import type { Note, Point, Rect, Size } from '../types'
import { ColorSwatches } from './ColorSwatches'
import { IconButton } from './IconButton'

/** What a note needs to know about its surroundings. Must be referentially stable. */
export interface NoteEnvironment {
  getBoardSize(): Size
  /** `pointer` is in client coordinates. */
  isOverTrash(pointer: Point): boolean
  setTrashActive(active: boolean): void
}

interface NoteViewProps {
  readonly note: Note
  readonly actions: NotesActions
  readonly environment: NoteEnvironment
  readonly autoFocus: boolean
  /** Set when the note does not match the current search. */
  readonly dimmed: boolean
}

interface GestureContext {
  readonly origin: Rect
  readonly bounds: Size
}

interface MoveContext extends GestureContext {
  /** The title field, if the press landed on it: a press that turns out to be a click edits it. */
  readonly focusOnClick: HTMLElement | null
}

/** Presses on the header's buttons and popover are theirs to handle and never start a drag. */
function startedOnControl(event: ReactPointerEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest('button, .popover') !== null
}

/**
 * While a note is dragged or resized, its geometry lives in local state (`draft`) and is
 * committed to the store only when the gesture ends. A gesture therefore re-renders just this
 * component, once per frame, and never triggers persistence midway.
 */
export const NoteView = memo(function NoteView({
  note,
  actions,
  environment,
  autoFocus,
  dimmed,
}: NoteViewProps) {
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

  const captureContext = (): GestureContext => ({
    origin: note,
    bounds: environment.getBoardSize(),
  })

  const endGesture = (): void => {
    setDraft(null)
    setOverTrash(false)
    environment.setTrashActive(false)
  }

  // The whole header is the drag handle, including the title. A title that is already being
  // edited is left alone so that text can be selected with the mouse.
  const startMove = usePointerDrag<MoveContext>({
    onStart(event) {
      const title = titleRef.current
      const onTitle = event.target === title
      if (note.locked || startedOnControl(event)) return null
      if (onTitle && document.activeElement === title) return null
      return { ...captureContext(), focusOnClick: onTitle ? title : null }
    },
    onMove({ origin, bounds }, delta, pointer) {
      const isOver = environment.isOverTrash(pointer)
      setDraft(moveRect(origin, delta, bounds))
      setOverTrash(isOver)
      environment.setTrashActive(isOver)
    },
    onEnd({ origin, bounds, focusOnClick }, delta, pointer) {
      endGesture()
      if (environment.isOverTrash(pointer)) {
        actions.remove(note.id)
      } else if (isClick(delta)) {
        focusOnClick?.focus()
      } else {
        const { x, y } = moveRect(origin, delta, bounds)
        actions.update(note.id, { x, y })
      }
    },
    onCancel: endGesture,
  })

  const startResize = usePointerDrag<GestureContext>({
    onStart: captureContext,
    onMove: ({ origin, bounds }, delta) => setDraft(resizeRect(origin, delta, bounds)),
    onEnd({ origin, bounds }, delta) {
      endGesture()
      const { width, height } = resizeRect(origin, delta, bounds)
      actions.update(note.id, { width, height })
    },
    onCancel: endGesture,
  })

  const rect = draft ?? note
  const style: CSSProperties = {
    width: rect.width,
    height: rect.height,
    transform: `translate3d(${rect.x}px, ${rect.y}px, 0)${overTrash ? ' scale(0.85)' : ''}`,
    zIndex: note.z,
  }
  const className = [
    'note',
    draft && 'note--active',
    overTrash && 'note--over-trash',
    note.locked && 'note--locked',
    dimmed && 'note--dimmed',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      style={style}
      data-color={note.color}
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
          // Keeps a press from focusing the field, so that it can start a drag instead.
          onMouseDown={(event) => {
            if (!note.locked && document.activeElement !== event.currentTarget) {
              event.preventDefault()
            }
          }}
          onChange={(event) => actions.update(note.id, { title: event.target.value })}
        />
        <IconButton
          icon={note.locked ? 'lock' : 'unlock'}
          label={note.locked ? 'Unlock note' : 'Lock position and size'}
          pressed={note.locked}
          size={15}
          onClick={() => actions.update(note.id, { locked: !note.locked })}
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
          label={note.locked ? 'Unlock the note to delete it' : 'Delete note'}
          disabled={note.locked}
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

      {!note.locked && (
        <div className="note__resize" title="Drag to resize" onPointerDown={startResize} />
      )}
    </article>
  )
})
