type Props = {
  active: boolean
  onClick: () => void
}

export function AutoAttackHudButton({ active, onClick }: Props) {
  return (
    <button
      type="button"
      className={`auto-attack-hud-btn hud-menu-btn${active ? ' auto-attack-hud-btn--active' : ''}`}
      title="Auto attack"
      aria-label="Auto attack settings"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="hud-menu-btn__icon">
        <svg
          width={20}
          height={20}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.35}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="10" cy="10" r="6.5" />
          <circle cx="10" cy="10" r="2.25" fill="currentColor" stroke="none" />
          <path d="M10 2.5v2" />
          <path d="M10 15.5v2" />
          <path d="M2.5 10h2" />
          <path d="M15.5 10h2" />
        </svg>
      </span>
      <span className="hud-menu-btn__label">Auto</span>
    </button>
  )
}
