import type { Note } from '../types'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'

export interface Autosaver {
  /** Requests that `notes` be saved once changes stop arriving for the debounce delay. */
  schedule(notes: readonly Note[]): void
  /** Saves a scheduled snapshot right away. */
  flush(): void
}

/**
 * Debounces saves and runs them strictly one at a time. With an asynchronous backend, two
 * overlapping requests may complete in either order; never overlapping them guarantees that the
 * newest snapshot is the one that ends up stored. Changes made while a save is in flight are
 * saved as soon as it completes.
 */
export function createAutosaver(
  save: (notes: readonly Note[]) => Promise<void>,
  onStatusChange: (status: SaveStatus) => void,
  debounceMs: number,
): Autosaver {
  let pending: readonly Note[] | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let saving = false

  const run = (): void => {
    if (saving || pending === null) return
    const snapshot = pending
    pending = null
    saving = true
    save(snapshot)
      .then(
        () => true,
        () => false,
      )
      .then((succeeded) => {
        saving = false
        if (pending !== null) run()
        else onStatusChange(succeeded ? 'saved' : 'failed')
      })
  }

  return {
    schedule(notes) {
      pending = notes
      // Reported from the moment there is something unsaved, not only while a request runs.
      onStatusChange('saving')
      clearTimeout(timer)
      timer = setTimeout(run, debounceMs)
    },
    flush() {
      clearTimeout(timer)
      run()
    },
  }
}
