import { useRef, useState } from 'react'
import { useDismiss } from '../hooks/useDismiss'
import type { SaveStatus } from '../state/autosaver'
import type { NoteColor, Theme } from '../types'
import { ColorSwatches } from './ColorSwatches'
import { Icon } from './Icon'
import { IconButton } from './IconButton'

interface ToolbarProps {
  readonly newNoteColor: NoteColor
  readonly onNewNoteColorChange: (color: NoteColor) => void
  readonly onAddNote: () => void
  readonly query: string
  readonly onQueryChange: (query: string) => void
  readonly theme: Theme
  readonly onThemeChange: (theme: Theme) => void
  readonly onArrange: () => void
  readonly canArrange: boolean
  readonly saveStatus: SaveStatus
}

const SAVE_STATUS_LABELS: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  failed: 'Saving failed',
}

const HELP_ITEMS: readonly (readonly [action: string, how: string])[] = [
  ['Create', 'Drag on the empty board to draw a note, double-click it, or use the Note button.'],
  ['Move', 'Drag a note by its top bar.'],
  ['Resize', 'Drag the grip in the bottom-right corner.'],
  ['Delete', 'Drop a note on the trash zone, or use the bin button in its top bar.'],
  ['Rename', 'Click the title in the top bar.'],
  ['Lock', 'The padlock freezes position and size and protects from deletion.'],
  ['Organize', 'Organize Grid resets unlocked notes to one size and lines them up in a grid.'],
  ['Cancel', 'Press Esc during any drag.'],
]

export function Toolbar({
  newNoteColor,
  onNewNoteColorChange,
  onAddNote,
  query,
  onQueryChange,
  theme,
  onThemeChange,
  onArrange,
  canArrange,
  saveStatus,
}: ToolbarProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)
  useDismiss(helpRef, helpOpen, () => setHelpOpen(false))

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand__logo" aria-hidden="true" />
        <div>
          <h1 className="brand__name">Sticky Notes</h1>
          <p className="brand__tagline">Interactive workspace</p>
        </div>
      </div>

      <div className="toolbar__create">
        <button type="button" className="add-button" onClick={onAddNote}>
          <Icon name="plus" size={16} />
          Note
        </button>
        <ColorSwatches
          label="Color of new notes"
          selected={newNoteColor}
          onSelect={onNewNoteColorChange}
        />
      </div>

      <label className="search">
        <Icon name="search" size={16} />
        <input
          type="search"
          className="search__input"
          value={query}
          placeholder="Search…"
          aria-label="Search notes"
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <p
        className={
          saveStatus === 'failed' ? 'toolbar__status toolbar__status--error' : 'toolbar__status'
        }
        role="status"
      >
        {SAVE_STATUS_LABELS[saveStatus]}
      </p>

      <div className="toolbar__actions">
        <IconButton
          icon="arrange"
          label="Organize Grid"
          disabled={!canArrange}
          onClick={onArrange}
        />
        <IconButton
          icon={theme === 'dark' ? 'sun' : 'moon'}
          label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
        />
        <div ref={helpRef} className="toolbar__help">
          <IconButton
            icon="info"
            label="How it works"
            pressed={helpOpen}
            onClick={() => setHelpOpen((open) => !open)}
          />
          {helpOpen && (
            <dl className="help popover">
              {HELP_ITEMS.map(([action, how]) => (
                <div key={action} className="help__item">
                  <dt>{action}</dt>
                  <dd>{how}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </header>
  )
}
