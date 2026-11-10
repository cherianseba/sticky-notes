import type { Fetch } from './restNotesStorage'

const DATABASE_KEY = 'sticky-notes/mock-api'
const MIN_LATENCY_MS = 150
const MAX_LATENCY_MS = 600

function networkLatency(): Promise<void> {
  const duration = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)
  return new Promise((resolve) => window.setTimeout(resolve, duration))
}

/**
 * An in-browser stand-in for the notes API, to be passed to `createRestNotesStorage`.
 * It answers asynchronously, with random latency, so requests can overlap and complete at
 * uneven intervals as they would over a network. Local storage plays the server's database
 * so that the data survives a reload.
 */
export const mockNotesApi: Fetch = async (url, init) => {
  await networkLatency()

  if (!new URL(url, window.location.origin).pathname.endsWith('/notes')) {
    return new Response(null, { status: 404 })
  }

  switch (init?.method ?? 'GET') {
    case 'GET':
      return new Response(localStorage.getItem(DATABASE_KEY) ?? '[]', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    case 'PUT':
      if (typeof init?.body !== 'string') return new Response(null, { status: 400 })
      localStorage.setItem(DATABASE_KEY, init.body)
      return new Response(null, { status: 204 })

    default:
      return new Response(null, { status: 405 })
  }
}
