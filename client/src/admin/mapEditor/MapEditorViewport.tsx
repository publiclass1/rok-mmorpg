import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { MapEditorPanContext } from './MapEditorPanContext'

type Props = {
  children: ReactNode
  panResetRef?: MutableRefObject<(() => void) | null>
}

export function MapEditorViewport({ children, panResetRef }: Props) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [spaceDown, setSpaceDown] = useState(false)
  const [panning, setPanning] = useState(false)
  const panDrag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!panResetRef) return
    panResetRef.current = () => setPan({ x: 0, y: 0 })
    return () => {
      panResetRef.current = null
    }
  }, [panResetRef])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const t = e.target as HTMLElement
        if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const tryStartPan = (clientX: number, clientY: number, button: number) => {
    if (button === 1 || (spaceDown && button === 0)) {
      panDrag.current = { px: clientX, py: clientY, ox: pan.x, oy: pan.y }
      setPanning(true)
      return true
    }
    return false
  }

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (tryStartPan(e.clientX, e.clientY, e.button)) {
      e.preventDefault()
      e.stopPropagation()
      viewportRef.current?.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!panDrag.current) return
    const d = panDrag.current
    setPan({
      x: d.ox + (e.clientX - d.px),
      y: d.oy + (e.clientY - d.py),
    })
  }

  const endPan = (e: React.PointerEvent) => {
    if (panDrag.current) {
      panDrag.current = null
      setPanning(false)
      try {
        viewportRef.current?.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <MapEditorPanContext.Provider value={{ spaceDown, panning }}>
      <div
        ref={viewportRef}
        className={`map-admin-viewport${panning || spaceDown ? ' map-admin-viewport--pan' : ''}`}
        onPointerDownCapture={onPointerDownCapture}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div
          className="map-admin-viewport-inner"
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0)` }}
        >
          {children}
        </div>
      </div>
    </MapEditorPanContext.Provider>
  )
}
