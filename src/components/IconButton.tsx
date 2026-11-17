import { Icon, type IconName } from './Icon'

interface IconButtonProps {
  readonly icon: IconName
  /** Used for the tooltip and for screen readers, since the button has no visible text. */
  readonly label: string
  readonly onClick: () => void
  /** Set for toggle buttons (e.g. a popover is open); omit for plain actions. */
  readonly pressed?: boolean
  readonly size?: number
}

export function IconButton({ icon, label, onClick, pressed, size }: IconButtonProps) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
