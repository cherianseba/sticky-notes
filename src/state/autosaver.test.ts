import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Note } from '../types'
import { createAutosaver, type SaveStatus } from './autosaver'

const DEBOUNCE_MS = 400

/** A `save` whose requests stay pending until the test settles them. */
function createControlledSave() {
  const requests: { notes: readonly Note[]; resolve(): void; reject(): void }[] = []
  const save = (notes: readonly Note[]): Promise<void> =>
    new Promise((resolve, reject) => {
      requests.push({ notes, resolve, reject: () => reject(new Error('offline')) })
    })
  return { save, requests }
}

function setUp() {
  const { save, requests } = createControlledSave()
  const statuses: SaveStatus[] = []
  const autosaver = createAutosaver(save, (status) => statuses.push(status), DEBOUNCE_MS)
  return { autosaver, requests, statuses }
}

const first: readonly Note[] = []
const second: readonly Note[] = []
const third: readonly Note[] = []

describe('createAutosaver', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('saves once changes have stopped for the debounce delay', async () => {
    const { autosaver, requests } = setUp()
    autosaver.schedule(first)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
    expect(requests).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.notes).toBe(first)
  })

  it('saves only the latest of several quick changes', async () => {
    const { autosaver, requests } = setUp()
    autosaver.schedule(first)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 2)
    autosaver.schedule(second)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.notes).toBe(second)
  })

  it('reports saving as soon as there is a change, and saved when the request completes', async () => {
    const { autosaver, requests, statuses } = setUp()
    autosaver.schedule(first)
    expect(statuses.at(-1)).toBe('saving')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(statuses.at(-1)).toBe('saving')
    requests[0]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(statuses.at(-1)).toBe('saved')
  })

  it('reports failed when the request is rejected', async () => {
    const { autosaver, requests, statuses } = setUp()
    autosaver.schedule(first)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    requests[0]?.reject()
    await vi.advanceTimersByTimeAsync(0)
    expect(statuses.at(-1)).toBe('failed')
  })

  it('never overlaps requests: a change made mid-save is sent after it completes', async () => {
    const { autosaver, requests, statuses } = setUp()
    autosaver.schedule(first)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)

    autosaver.schedule(second)
    autosaver.schedule(third)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2)
    expect(requests).toHaveLength(1)

    requests[0]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(requests).toHaveLength(2)
    expect(requests[1]?.notes).toBe(third)
    expect(statuses.at(-1)).toBe('saving')

    requests[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(statuses.at(-1)).toBe('saved')
  })

  it('retries the newest change after a failed save', async () => {
    const { autosaver, requests, statuses } = setUp()
    autosaver.schedule(first)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    autosaver.schedule(second)
    requests[0]?.reject()
    await vi.advanceTimersByTimeAsync(0)
    expect(requests[1]?.notes).toBe(second)
    requests[1]?.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(statuses.at(-1)).toBe('saved')
  })

  it('flush saves a scheduled change immediately, and only once', async () => {
    const { autosaver, requests } = setUp()
    autosaver.schedule(first)
    autosaver.flush()
    expect(requests).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2)
    expect(requests).toHaveLength(1)
  })

  it('flush does nothing when there is nothing to save', () => {
    const { autosaver, requests } = setUp()
    autosaver.flush()
    expect(requests).toHaveLength(0)
  })
})
