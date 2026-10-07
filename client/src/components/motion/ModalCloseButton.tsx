type Props = {
  onClose: () => void
  label?: string
}

export function ModalCloseButton({ onClose, label = 'Close' }: Props) {
  return (
    <button
      type="button"
      className="modal-close-btn"
      onClick={onClose}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">×</span>
    </button>
  )
}
