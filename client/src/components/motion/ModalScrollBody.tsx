import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function ModalScrollBody({ children, className }: Props) {
  return (
    <div className={['modal-scroll-body', className].filter(Boolean).join(' ')}>{children}</div>
  )
}
