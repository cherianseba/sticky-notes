import type { Ref } from 'react'
import { Icon } from './Icon'

interface TrashZoneProps {
  readonly ref: Ref<HTMLDivElement>
  readonly active: boolean
}

export function TrashZone({ ref, active }: TrashZoneProps) {
  return (
    <div ref={ref} className={active ? 'trash trash--active' : 'trash'}>
      <Icon name="trash" size={26} />
      <span>{active ? 'Release to delete' : 'Drag a note here to delete'}</span>
    </div>
  )
}
