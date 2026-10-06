import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { MapAdminPage } from './admin/MapAdminPage.tsx'

const isMapAdmin = window.location.pathname.startsWith('/admin/maps')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMapAdmin ? <MapAdminPage /> : <App />}
  </StrictMode>,
)
