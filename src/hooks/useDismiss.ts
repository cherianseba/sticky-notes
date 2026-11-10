import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** While `active`, calls `onDismiss` on a press outside the referenced element or on Escape. */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
): void {
  const latestOnDismiss = useRef(onDismiss)
  useEffect(() => {
    latestOnDismiss.current = onDismiss
  })

  useEffect(() => {
    if (!active) return

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) {
        latestOnDismiss.current()
      }
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') latestOnDismiss.current()
    }

    // Capture phase, so the press is seen whatever the element under it does with the event.
    document.addEventListener('pointerdown', handlePointerDown, true)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, active])
}
