// Pure maths for notes on the board. No React here, so every function is easy to unit test.

import type { Point, Rect, Size } from './types'

export const MIN_NOTE_SIZE: Size = { width: 168, height: 120 }
export const DEFAULT_NOTE_SIZE: Size = { width: 264, height: 216 }

/** A press that moves less than this many pixels counts as a click, not a drag. */
const CLICK_TOLERANCE = 4

/** Keeps `value` between `min` and `max`. If the range is empty (max < min), `min` wins. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Moves a rect by `delta`, keeping it fully inside the board. */
export function moveRect(rect: Rect, delta: Point, bounds: Size): Rect {
  return {
    ...rect,
    x: clamp(rect.x + delta.x, 0, bounds.width - rect.width),
    y: clamp(rect.y + delta.y, 0, bounds.height - rect.height),
  }
}

/** Moves the bottom-right corner by `delta`, respecting the minimum size and the board edges. */
export function resizeRect(rect: Rect, delta: Point, bounds: Size): Rect {
  return {
    ...rect,
    width: clamp(rect.width + delta.x, MIN_NOTE_SIZE.width, bounds.width - rect.x),
    height: clamp(rect.height + delta.y, MIN_NOTE_SIZE.height, bounds.height - rect.y),
  }
}

/** The rect between two opposite corners, so drawing works in any direction. */
export function rectFromCorners(a: Point, b: Point, bounds: Size): Rect {
  const ax = clamp(a.x, 0, bounds.width)
  const ay = clamp(a.y, 0, bounds.height)
  const bx = clamp(b.x, 0, bounds.width)
  const by = clamp(b.y, 0, bounds.height)
  return {
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    width: Math.abs(ax - bx),
    height: Math.abs(ay - by),
  }
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

export function isAtLeast(size: Size, min: Size): boolean {
  return size.width >= min.width && size.height >= min.height
}

/** Whether a finished gesture moved so little that it should count as a click. */
export function isClick(delta: Point): boolean {
  return Math.hypot(delta.x, delta.y) < CLICK_TOLERANCE
}
