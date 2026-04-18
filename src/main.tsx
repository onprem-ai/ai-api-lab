import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import './index.css'
import App from './App.tsx'
import { useStore } from './store/useStore'

// Sync theme state with html element class
function ThemeSync() {
  const { theme } = useStore()
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ThemeSync />
  </StrictMode>,
)
