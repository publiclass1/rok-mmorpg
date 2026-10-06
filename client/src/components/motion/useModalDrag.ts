import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

export type PanelPosition = { x: number; y: number }

export function useModalDrag(
  panelRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  getInitialPosition?: (panel: HTMLElement) => PanelPosition,
) {
  const [pos, setPos] = useState<PanelPosition | null>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const getInitialRef = useRef(getInitialPosition)
  getInitialRef.current = getInitialPosition

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const placePanel = () => {
      const w = panel.offsetWidth
      const h = panel.offsetHeight
      if (w < 8 || h < 8) return false
      const next = getInitialRef.current
        ? getInitialRef.current(panel)
        : {
            x: Math.max(8, (window.innerWidth - w) / 2),
            y: Math.max(8, (window.innerHeight - h) / 2),
          }
      posRef.current = next
      setPos(next)
      return true
    }

    if (placePanel()) return
    const id = requestAnimationFrame(() => {
      placePanel()
    })
    return () => cancelAnimationFrame(id)
  }, [panelRef])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel || !enabled) return

    let dragging = false
    let start = { mx: 0, my: 0, px: 0, py: 0 }

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.modal-drag-handle')) return
      if (target.closest('button, input, a, select, textarea, label')) return
      dragging = true
      start = {
        mx: e.clientX,
        my: e.clientY,
        px: posRef.current.x,
        py: posRef.current.y,
      }
      panel.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const next = {
        x: start.px + e.clientX - start.mx,
        y: start.py + e.clientY - start.my,
      }
      posRef.current = next
      setPos(next)
    }

    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      try {
        panel.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }

    panel.addEventListener('pointerdown', onPointerDown)
    panel.addEventListener('pointermove', onPointerMove)
    panel.addEventListener('pointerup', endDrag)
    panel.addEventListener('pointercancel', endDrag)

    return () => {
      panel.removeEventListener('pointerdown', onPointerDown)
      panel.removeEventListener('pointermove', onPointerMove)
      panel.removeEventListener('pointerup', endDrag)
      panel.removeEventListener('pointercancel', endDrag)
    }
  }, [enabled, panelRef])

  return pos
}
