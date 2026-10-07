import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AdminGate } from './admin/AdminGate.tsx'
import { GameAdminPage } from './admin/GameAdminPage.tsx'
import { MapAdminPage } from './admin/MapAdminPage.tsx'

const path = window.location.pathname
const isMapAdmin = path.startsWith('/admin/maps')
const isGameAdmin = path === '/admin' || path === '/admin/'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isMapAdmin ? (
      <AdminGate title="Map admin">
        <MapAdminPage />
      </AdminGate>
    ) : isGameAdmin ? (
      <AdminGate title="Game admin">
        <GameAdminPage />
      </AdminGate>
    ) : (
      <App />
    )}
  </StrictMode>,
)
