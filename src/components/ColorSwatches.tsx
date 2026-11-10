import { NOTE_COLORS, type NoteColor } from '../types'

interface ColorSwatchesProps {
  readonly label: string
  readonly selected: NoteColor
  readonly onSelect: (color: NoteColor) => void
}

export function ColorSwatches({ label, selected, onSelect }: ColorSwatchesProps) {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          data-color={color}
          aria-label={color}
          aria-pressed={color === selected}
          title={color}
          onClick={() => onSelect(color)}
        />
      ))}
    </div>
  )
}
