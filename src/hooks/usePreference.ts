import { useCallback, useState } from 'react'

function read<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : null
  } catch {
    return null
  }
}

/** A `useState` whose value is remembered in local storage between visits. */
export function usePreference<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  getDefault: () => T,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, isValid) ?? getDefault())

  const update = useCallback(
    (next: T): void => {
      setValue(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // A preference that cannot be stored still applies for this visit.
      }
    },
    [key],
  )

  return [value, update]
}
