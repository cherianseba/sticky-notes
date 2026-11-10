/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTES_STORAGE?: string
  readonly VITE_NOTES_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
