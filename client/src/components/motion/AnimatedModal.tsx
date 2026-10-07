import { useRef, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { panelMotion } from './motionPresets'
import { useModalDrag } from './useModalDrag'

type Props = {
  children: ReactNode
  onClose?: () => void
  backdropClassName?: string
  panelClassName?: string
  role?: string
  'aria-modal'?: boolean | 'true' | 'false'
  draggable?: boolean
}

export function AnimatedModal({
  children,
  backdropClassName = 'modal-layer',
  panelClassName = 'panel modal',
  role,
  'aria-modal': ariaModal,
  draggable = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { pos, isDragging } = useModalDrag(panelRef, draggable)
  const panelClass = [panelClassName, isDragging ? 'modal-panel--dragging' : ''].filter(Boolean).join(' ')

  return (
    <div className={backdropClassName} role={role} aria-modal={ariaModal}>
      <motion.div
        ref={panelRef}
        className={panelClass}
        style={
          pos
            ? { position: 'fixed', left: pos.x, top: pos.y, margin: 0, visibility: 'visible' }
            : { position: 'fixed', left: '50%', top: '12vh', margin: 0, visibility: 'hidden' }
        }
        onClick={(e) => e.stopPropagation()}
        {...panelMotion}
      >
        {children}
      </motion.div>
    </div>
  )
}
