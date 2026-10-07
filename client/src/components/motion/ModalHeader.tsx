import type { ReactNode } from 'react'
import { ModalCloseButton } from './ModalCloseButton'

type Props = {
  title: ReactNode
  onClose: () => void
  closeLabel?: string
  className?: string
  trailing?: ReactNode
}

export function ModalHeader({ title, onClose, closeLabel, className, trailing }: Props) {
  return (
    <div
      className={['row spread modal-drag-handle modal-header', className].filter(Boolean).join(' ')}
    >
      <h2 className="modal-title">{title}</h2>
      <div className="modal-header__end">
        {trailing}
        <ModalCloseButton onClose={onClose} label={closeLabel} />
      </div>
    </div>
  )
}
