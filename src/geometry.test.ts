import { describe, expect, it } from 'vitest'
import {
  MIN_NOTE_SIZE,
  containsPoint,
  gridCells,
  isAtLeast,
  isClick,
  moveRect,
  rectFromCorners,
  resizeRect,
} from './geometry'
import type { Rect, Size } from './types'

const bounds: Size = { width: 1000, height: 700 }
const rect: Rect = { x: 100, y: 100, width: 200, height: 150 }

describe('moveRect', () => {
  it('translates by the delta and keeps the size', () => {
    expect(moveRect(rect, { x: 30, y: -40 }, bounds)).toEqual({ ...rect, x: 130, y: 60 })
  })

  it('stops at the top-left corner of the bounds', () => {
    expect(moveRect(rect, { x: -500, y: -500 }, bounds)).toEqual({ ...rect, x: 0, y: 0 })
  })

  it('stops where the rect touches the bottom-right corner of the bounds', () => {
    expect(moveRect(rect, { x: 5000, y: 5000 }, bounds)).toEqual({ ...rect, x: 800, y: 550 })
  })

  it('pins a rect larger than the bounds to the origin', () => {
    const large: Rect = { x: 50, y: 50, width: 2000, height: 2000 }
    expect(moveRect(large, { x: 10, y: 10 }, bounds)).toEqual({ ...large, x: 0, y: 0 })
  })
})

describe('resizeRect', () => {
  it('moves the bottom-right corner and keeps the position', () => {
    expect(resizeRect(rect, { x: 50, y: 25 }, bounds)).toEqual({ ...rect, width: 250, height: 175 })
  })

  it('does not shrink below the minimum size', () => {
    expect(resizeRect(rect, { x: -500, y: -500 }, bounds)).toEqual({ ...rect, ...MIN_NOTE_SIZE })
  })

  it('does not grow past the bounds', () => {
    expect(resizeRect(rect, { x: 5000, y: 5000 }, bounds)).toEqual({
      ...rect,
      width: 900,
      height: 600,
    })
  })
})

describe('rectFromCorners', () => {
  const expected: Rect = { x: 100, y: 200, width: 300, height: 150 }

  it('builds the same rect whichever corner the drag starts from', () => {
    expect(rectFromCorners({ x: 100, y: 200 }, { x: 400, y: 350 }, bounds)).toEqual(expected)
    expect(rectFromCorners({ x: 400, y: 350 }, { x: 100, y: 200 }, bounds)).toEqual(expected)
    expect(rectFromCorners({ x: 400, y: 200 }, { x: 100, y: 350 }, bounds)).toEqual(expected)
  })

  it('clamps a corner that lies outside the bounds', () => {
    expect(rectFromCorners({ x: 900, y: 600 }, { x: 1500, y: -50 }, bounds)).toEqual({
      x: 900,
      y: 0,
      width: 100,
      height: 600,
    })
  })
})

describe('gridCells', () => {
  const cell: Size = { width: 250, height: 220 }

  it('fills as many columns as fit the width, then wraps', () => {
    const cells = gridCells(4, cell, 20, { width: 1024, height: 704 })
    expect(cells.map(({ x, y }) => [x, y])).toEqual([
      [20, 20],
      [290, 20],
      [560, 20],
      [20, 260],
    ])
    expect(cells.every((c) => c.width === 250 && c.height === 220)).toBe(true)
  })

  it('uses a single column when not even one cell fits', () => {
    const cells = gridCells(2, cell, 20, { width: 200, height: 704 })
    expect(cells.map(({ x }) => x)).toEqual([20, 20])
  })

  it('keeps rows that do not fit vertically inside the bounds', () => {
    const cells = gridCells(10, cell, 20, { width: 1024, height: 704 })
    expect(cells.every((c) => c.y + c.height <= 704)).toBe(true)
  })

  it('returns nothing for no notes', () => {
    expect(gridCells(0, cell, 20, bounds)).toEqual([])
  })
})

describe('containsPoint', () => {
  it('includes the edges and excludes points outside', () => {
    expect(containsPoint(rect, { x: 100, y: 100 })).toBe(true)
    expect(containsPoint(rect, { x: 300, y: 250 })).toBe(true)
    expect(containsPoint(rect, { x: 301, y: 250 })).toBe(false)
    expect(containsPoint(rect, { x: 200, y: 99 })).toBe(false)
  })
})

describe('isAtLeast', () => {
  it('requires both dimensions to reach the minimum', () => {
    expect(isAtLeast({ width: 200, height: 150 }, MIN_NOTE_SIZE)).toBe(true)
    expect(isAtLeast(MIN_NOTE_SIZE, MIN_NOTE_SIZE)).toBe(true)
    expect(isAtLeast({ width: 500, height: 10 }, MIN_NOTE_SIZE)).toBe(false)
  })
})

describe('isClick', () => {
  it('treats a tiny movement as a click and a longer one as a drag', () => {
    expect(isClick({ x: 0, y: 0 })).toBe(true)
    expect(isClick({ x: 2, y: -2 })).toBe(true)
    expect(isClick({ x: 4, y: 0 })).toBe(false)
  })
})
