import { Icon, type IconName } from './Icon'

interface IconButtonProps {
  readonly icon: IconName
  readonly label: string
  readonly onClick: () => void
  /** Set for toggle buttons; omit for plain actions. */
  readonly pressed?: boolean
  readonly disabled?: boolean
  readonly size?: number
}

export function IconButton({ icon, label, onClick, pressed, disabled, size }: IconButtonProps) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
