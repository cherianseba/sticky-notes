// Top-level layout: the toolbar on top, the board below it.

import { useRef, useState } from 'react'
import { Board, type BoardHandle } from './components/Board'
import { Toolbar } from './components/Toolbar'
import { useNotes } from './state/useNotes'
import type { NotesStorage } from './storage/NotesStorage'
import type { NoteColor } from './types'

interface AppProps {
  /** Injected from main.tsx, so the app does not care whether notes go to local storage or an API. */
  readonly storage: NotesStorage
}

export function App({ storage }: AppProps) {
  const { notes, loadStatus, saveStatus, actions } = useNotes(storage)
  const [newNoteColor, setNewNoteColor] = useState<NoteColor>('yellow')
  // Only the board knows its own size, so the toolbar's "+ Note" button asks the board to add it.
  const boardRef = useRef<BoardHandle>(null)

  return (
    <div className="app">
      <Toolbar
        newNoteColor={newNoteColor}
        onNewNoteColorChange={setNewNoteColor}
        onAddNote={() => boardRef.current?.addNote()}
        saveStatus={saveStatus}
      />
      {loadStatus === 'ready' ? (
        <Board ref={boardRef} notes={notes} actions={actions} newNoteColor={newNoteColor} />
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
