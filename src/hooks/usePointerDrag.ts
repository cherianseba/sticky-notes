// One reusable drag hook. Drawing, moving and resizing a note are all "press, drag, release",
// so they all use this hook and differ only in the maths they do in the callbacks.

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point } from '../types'

/**
 * The callbacks of one drag gesture.
 * - `delta`: how far the pointer has moved since the press.
 * - `pointer`: where the pointer is now.
 * Both are in viewport (client) coordinates.
 */
export interface DragGesture<Context extends object> {
  /** Runs on press. Return whatever the gesture should remember, or `null` to ignore the press. */
  onStart(event: ReactPointerEvent<HTMLElement>): Context | null
  onMove(context: Context, delta: Point, pointer: Point): void
  onEnd(context: Context, delta: Point, pointer: Point): void
  /** Runs when the gesture is cancelled with Escape (or by the browser). */
  onCancel(context: Context): void
}

/**
 * Returns an `onPointerDown` handler that starts the gesture.
 *
 * Performance and robustness:
 * - Pointer capture: the gesture keeps working when the cursor leaves the element or the window.
 * - Moves are throttled to one `onMove` per animation frame (the mouse can fire far more often).
 * - Listeners are added on press and removed on release, so idle notes cost nothing.
 */
export function usePointerDrag<Context extends object>(
  gesture: DragGesture<Context>,
): (event: ReactPointerEvent<HTMLElement>) => void {
  // The listeners live longer than one render, so they read the newest callbacks from a ref.
  const gestureRef = useRef(gesture)
  useLayoutEffect(() => {
    gestureRef.current = gesture
  })

  // Stops the gesture in progress. Also called if the component unmounts mid-drag.
  const stopRef = useRef<(() => void) | null>(null)
  useEffect(() => () => stopRef.current?.(), [])

  return useCallback((event: ReactPointerEvent<HTMLElement>) => {
    // Left button only, and one gesture at a time.
    if (event.button !== 0 || stopRef.current) return
    const context = gestureRef.current.onStart(event)
    if (context === null) return

    const target = event.currentTarget
    const pointerId = event.pointerId
    const start: Point = { x: event.clientX, y: event.clientY }
    let pointer: Point = start
    let frame = 0 // id of the pending animation frame; 0 when none is pending

    const delta = (): Point => ({ x: pointer.x - start.x, y: pointer.y - start.y })

    const onPointerMove = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return
      pointer = { x: e.clientX, y: e.clientY }
      if (frame !== 0) return // an update is already scheduled for this frame
      frame = requestAnimationFrame(() => {
        frame = 0
        gestureRef.current.onMove(context, delta(), pointer)
      })
    }

    const onPointerUp = (e: PointerEvent): void => {
      if (e.pointerId !== pointerId) return
      pointer = { x: e.clientX, y: e.clientY }
      stop()
      gestureRef.current.onEnd(context, delta(), pointer)
    }

    const cancel = (): void => {
      stop()
      gestureRef.current.onCancel(context)
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') cancel()
    }

    const stop = (): void => {
      cancelAnimationFrame(frame)
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', onPointerUp)
      target.removeEventListener('pointercancel', cancel)
      window.removeEventListener('keydown', onKeyDown)
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId)
      stopRef.current = null
    }

    target.setPointerCapture(pointerId)
    target.addEventListener('pointermove', onPointerMove)
    target.addEventListener('pointerup', onPointerUp)
    target.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKeyDown)
    stopRef.current = stop
  }, [])
}
