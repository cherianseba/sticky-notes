import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point } from '../types'

/**
 * Callbacks of a drag gesture. `delta` is the pointer offset from the start of the gesture and
 * `pointer` its current position, both in client (viewport) coordinates.
 */
export interface DragGesture<Context extends object> {
  /** Captures whatever the gesture needs to remember; return `null` to ignore the press. */
  onStart(event: ReactPointerEvent<HTMLElement>): Context | null
  onMove(context: Context, delta: Point, pointer: Point): void
  onEnd(context: Context, delta: Point, pointer: Point): void
  onCancel(context: Context): void
}

/**
 * Turns pointer events into a drag gesture and returns the `onPointerDown` handler that starts it.
 *
 * The pointer is captured, so the gesture keeps working when the cursor leaves the element or
 * the window. Moves are coalesced to one `onMove` per animation frame. Pressing Escape cancels.
 */
export function usePointerDrag<Context extends object>(
  gesture: DragGesture<Context>,
): (event: ReactPointerEvent<HTMLElement>) => void {
  // The listeners below outlive the render that created them, so they read the latest callbacks.
  const latestGesture = useRef(gesture)
  useLayoutEffect(() => {
    latestGesture.current = gesture
  })

  const stopActiveGesture = useRef<(() => void) | null>(null)
  useEffect(() => () => stopActiveGesture.current?.(), [])

  return useCallback((event) => {
    if (event.button !== 0 || stopActiveGesture.current) return
    const started = latestGesture.current.onStart(event)
    if (started === null) return
    // A separate binding keeps the non-null type inside the hoisted handlers below.
    const context: Context = started

    const target = event.currentTarget
    const { pointerId } = event
    const start: Point = { x: event.clientX, y: event.clientY }
    let pointer = start
    let frame = 0

    const track = (e: PointerEvent): void => {
      pointer = { x: e.clientX, y: e.clientY }
    }
    const delta = (): Point => ({ x: pointer.x - start.x, y: pointer.y - start.y })

    const stop = (): void => {
      cancelAnimationFrame(frame)
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerup', handleUp)
      target.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', handleKeyDown)
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
      stopActiveGesture.current = null
    }

    function handleMove(e: PointerEvent): void {
      if (e.pointerId !== pointerId) return
      track(e)
      if (frame !== 0) return
      frame = requestAnimationFrame(() => {
        frame = 0
        latestGesture.current.onMove(context, delta(), pointer)
      })
    }

    function handleUp(e: PointerEvent): void {
      if (e.pointerId !== pointerId) return
      track(e)
      stop()
      latestGesture.current.onEnd(context, delta(), pointer)
    }

    function cancel(): void {
      stop()
      latestGesture.current.onCancel(context)
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') cancel()
    }

    target.setPointerCapture(pointerId)
    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerup', handleUp)
    target.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', handleKeyDown)
    stopActiveGesture.current = stop
  }, [])
}
