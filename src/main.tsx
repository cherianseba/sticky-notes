import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { createNotesStorage } from './storage/createNotesStorage'
import './styles.css'

const storage = createNotesStorage(import.meta.env)

const root = document.getElementById('root')
if (!root) throw new Error('Root element is missing')

createRoot(root).render(
  <StrictMode>
    <App storage={storage} />
  </StrictMode>,
)
