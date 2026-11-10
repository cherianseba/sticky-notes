import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { NotesStorage } from '../storage/NotesStorage'
import type { Note, NoteColor, NotePatch, Rect } from '../types'
import { createAutosaver, type SaveStatus } from './autosaver'
import { notesReducer } from './notesReducer'

const SAVE_DEBOUNCE_MS = 400

export type LoadStatus = 'loading' | 'ready' | 'failed'

export interface NotesActions {
  /** Returns the id of the created note. */
  add(rect: Rect, color: NoteColor): string
  update(id: string, patch: NotePatch): void
  remove(id: string): void
  bringToFront(id: string): void
  /** Moves and resizes several notes at once; `rects` is keyed by note id. */
  arrange(rects: ReadonlyMap<string, Rect>): void
}

export interface NotesStore {
  readonly notes: readonly Note[]
  readonly loadStatus: LoadStatus
  readonly saveStatus: SaveStatus
  /** Referentially stable for the lifetime of the component. */
  readonly actions: NotesActions
}

export function useNotes(storage: NotesStorage): NotesStore {
  const [notes, dispatch] = useReducer(notesReducer, [])
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // What the storage returned; there is no point in saving it straight back.
  const loadedNotes = useRef<readonly Note[] | null>(null)

  useEffect(() => {
    let cancelled = false
    storage.load().then(
      (loaded) => {
        if (cancelled) return
        loadedNotes.current = loaded
        dispatch({ type: 'loaded', notes: loaded })
        setLoadStatus('ready')
      },
      () => {
        if (!cancelled) setLoadStatus('failed')
      },
    )
    return () => {
      cancelled = true
    }
  }, [storage])

  const autosaver = useMemo(
    () => createAutosaver((snapshot) => storage.save(snapshot), setSaveStatus, SAVE_DEBOUNCE_MS),
    [storage],
  )

  useEffect(() => {
    // Nothing is saved until loading succeeds, so a failed load can never overwrite stored notes.
    if (loadStatus === 'ready' && notes !== loadedNotes.current) autosaver.schedule(notes)
  }, [notes, loadStatus, autosaver])

  useEffect(() => {
    // Do not lose the changes made within the debounce window when the page is closed.
    const flush = (): void => autosaver.flush()
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [autosaver])

  const actions = useMemo<NotesActions>(
    () => ({
      add(rect, color) {
        const id = crypto.randomUUID()
        dispatch({ type: 'added', note: { ...rect, id, color, title: '', text: '', locked: false } })
        return id
      },
      update: (id, patch) => dispatch({ type: 'updated', id, patch }),
      remove: (id) => dispatch({ type: 'removed', id }),
      bringToFront: (id) => dispatch({ type: 'broughtToFront', id }),
      arrange: (rects) => dispatch({ type: 'arranged', rects }),
    }),
    [],
  )

  return { notes, loadStatus, saveStatus, actions }
}
