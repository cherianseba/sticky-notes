/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOTES_STORAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
