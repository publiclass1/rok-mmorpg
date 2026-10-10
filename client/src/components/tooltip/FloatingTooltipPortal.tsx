import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  style: React.CSSProperties
  className?: string
}

export function FloatingTooltipPortal({ children, style, className = 'floating-detail-tooltip' }: Props) {
  return createPortal(
    <div className={className} style={{ position: 'fixed', zIndex: 10000, pointerEvents: 'none', ...style }} role="tooltip">
      {children}
    </div>,
    document.body,
  )
}
