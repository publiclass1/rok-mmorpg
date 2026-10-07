type Props = {
  onClick: () => void
  disabled?: boolean
  label: string
}

export function ModalResetButton({ onClick, disabled, label }: Props) {
  return (
    <button
      type="button"
      className="modal-icon-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      <svg className="modal-icon-btn__svg" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 2.5a5.5 5.5 0 1 0 4.74 8.24l.9.52A6.5 6.5 0 1 1 8 1.5V0l2.75 2.25L8 4.5V2.5z"
        />
      </svg>
    </button>
  )
}
