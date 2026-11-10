import type { Point, Rect, Size } from './types'

export const MIN_NOTE_SIZE: Size = { width: 168, height: 120 }
export const DEFAULT_NOTE_SIZE: Size = { width: 264, height: 216 }
/** If the range is empty (max < min), `min` wins. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max))
}

/** Translates a rect by `delta`, keeping it fully inside the bounds. */
export function moveRect(rect: Rect, delta: Point, bounds: Size): Rect {
  return {
    ...rect,
    x: clamp(rect.x + delta.x, 0, bounds.width - rect.width),
    y: clamp(rect.y + delta.y, 0, bounds.height - rect.height),
  }
}

/** Moves the bottom-right corner by `delta`, respecting the minimum size and the bounds. */
export function resizeRect(rect: Rect, delta: Point, bounds: Size): Rect {
  return {
    ...rect,
    width: clamp(rect.width + delta.x, MIN_NOTE_SIZE.width, bounds.width - rect.x),
    height: clamp(rect.height + delta.y, MIN_NOTE_SIZE.height, bounds.height - rect.y),
  }
}

/** Builds the rect spanned by two opposite corners, both clamped to the bounds. */
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

/**
 * Returns `count` cells of equal size laid out left to right in as many columns as fit the
 * width, wrapping into rows. If the rows need more height than there is, the last ones stay
 * inside the bounds and overlap.
 */
export function gridCells(count: number, cell: Size, gap: number, bounds: Size): Rect[] {
  const columns = Math.max(1, Math.floor((bounds.width - gap) / (cell.width + gap)))
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return {
      ...cell,
      x: gap + column * (cell.width + gap),
      y: clamp(gap + row * (cell.height + gap), 0, bounds.height - cell.height),
    }
  })
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
  return Math.hypot(delta.x, delta.y) < 4
}
