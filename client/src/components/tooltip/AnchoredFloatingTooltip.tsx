import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

function anchorKey(anchor: DOMRect): string {
  return `${anchor.left},${anchor.top},${anchor.width},${anchor.height}`
}
import { createPortal } from 'react-dom'
import { floatingTooltipPosition } from './floatingTooltipPosition'

const TOOLTIP_Z_INDEX = 10000

type Props = {
  anchor: DOMRect
  children: ReactNode
  preferredWidth?: number
  className?: string
}

export function AnchoredFloatingTooltip({
  anchor,
  children,
  preferredWidth = 260,
  className = 'floating-detail-tooltip',
}: Props) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = useState(0)
  const anchorId = anchorKey(anchor)

  useLayoutEffect(() => {
    setMeasuredHeight(0)
  }, [anchorId])

  useLayoutEffect(() => {
    const el = innerRef.current
    if (!el) return
    const h = el.getBoundingClientRect().height
    if (h > 0 && Math.abs(h - measuredHeight) > 0.5) {
      setMeasuredHeight(h)
    }
  }, [anchorId, measuredHeight, children])

  const height = measuredHeight > 0 ? measuredHeight : 200
  const { left, top, maxWidth } = floatingTooltipPosition(anchor, preferredWidth, height)

  return createPortal(
    <div
      ref={innerRef}
      className={className}
      style={{
        position: 'fixed',
        zIndex: TOOLTIP_Z_INDEX,
        pointerEvents: 'none',
        left,
        top,
        maxWidth,
      }}
      role="tooltip"
    >
      {children}
    </div>,
    document.body,
  )
}
