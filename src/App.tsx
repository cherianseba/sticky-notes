import { useEffect, useMemo, useRef, useState } from 'react'
import { Board, type BoardHandle } from './components/Board'
import { Toolbar } from './components/Toolbar'
import { usePreference } from './hooks/usePreference'
import { normalizeQuery } from './search'
import { useNotes } from './state/useNotes'
import type { NotesStorage } from './storage/NotesStorage'
import type { NoteColor, Theme } from './types'

interface AppProps {
  readonly storage: NotesStorage
}

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function App({ storage }: AppProps) {
  const { notes, loadStatus, saveStatus, actions } = useNotes(storage)
  const [newNoteColor, setNewNoteColor] = useState<NoteColor>('yellow')
  const [query, setQuery] = useState('')
  const [theme, setTheme] = usePreference('sticky-notes/theme', isTheme, systemTheme)
  const boardRef = useRef<BoardHandle>(null)
  const normalizedQuery = useMemo(() => normalizeQuery(query), [query])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <div className="app">
      <Toolbar
        newNoteColor={newNoteColor}
        onNewNoteColorChange={setNewNoteColor}
        onAddNote={() => boardRef.current?.addNote()}
        query={query}
        onQueryChange={setQuery}
        theme={theme}
        onThemeChange={setTheme}
        onArrange={() => boardRef.current?.organizeGrid()}
        canArrange={notes.length > 0}
        saveStatus={saveStatus}
      />
      {loadStatus === 'ready' ? (
        <Board
          ref={boardRef}
          notes={notes}
          actions={actions}
          newNoteColor={newNoteColor}
          query={normalizedQuery}
        />
      ) : (
        <p className="app__message" role="status">
          {loadStatus === 'loading'
            ? 'Loading notes…'
            : 'Your notes could not be loaded. Reload the page to try again.'}
        </p>
      )}
    </div>
  )
}
