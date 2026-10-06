import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { backdropMotion, panelMotion } from './motionPresets'

type Props = {
  children: ReactNode
  onClose?: () => void
  backdropClassName?: string
  panelClassName?: string
  role?: string
  'aria-modal'?: boolean | 'true' | 'false'
}

export function AnimatedModal({
  children,
  onClose,
  backdropClassName = 'modal-backdrop',
  panelClassName = 'panel modal',
  role,
  'aria-modal': ariaModal,
}: Props) {
  return (
    <motion.div
      className={backdropClassName}
      role={role}
      aria-modal={ariaModal}
      onClick={onClose}
      {...backdropMotion}
    >
      <motion.div
        className={panelClassName}
        onClick={(e) => e.stopPropagation()}
        {...panelMotion}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
