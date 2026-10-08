import type { ReactNode } from 'react'

export type GameHudMenuItem = {
  id: string
  label: string
  title?: string
  variant?: 'default' | 'leave'
  onClick: () => void
}

type Props = {
  items: GameHudMenuItem[]
}

function HudMenuIcon({ id }: { id: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.35,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  const icons: Record<string, ReactNode> = {
    stats: (
      <svg {...common}>
        <path d="M4 16V9" />
        <path d="M10 16V4" />
        <path d="M16 16v-6" />
      </svg>
    ),
    inventory: (
      <svg {...common}>
        <path d="M5 7h10l-1 10H6L5 7Z" />
        <path d="M7 7V5a3 3 0 0 1 6 0v2" />
      </svg>
    ),
    equipment: (
      <svg {...common}>
        <path d="M10 3 4 6v5c0 3.5 2.8 5.5 6 6 3.2-.5 6-2.5 6-6V6l-6-3Z" />
      </svg>
    ),
    skills: (
      <svg {...common}>
        <path d="M10 2.5 11.8 7h4.7l-3.8 2.8 1.5 4.7L10 12.8 5.8 14.5l1.5-4.7L3.5 7h4.7L10 2.5Z" />
      </svg>
    ),
    party: (
      <svg {...common}>
        <circle cx="7" cy="8" r="2.25" />
        <circle cx="13.5" cy="8" r="2.25" />
        <path d="M3.5 16c0-2.2 1.6-3.5 3.5-3.5S10.5 13.8 10.5 16" />
        <path d="M10.5 16c0-2.2 1.6-3.5 3.5-3.5S17.5 13.8 17.5 16" />
      </svg>
    ),
    guild: (
      <svg {...common}>
        <path d="M10 3v14" />
        <path d="M6 6h8" />
        <path d="M5 9h10" />
        <path d="M4 12h12" />
        <path d="M3 15h14" />
      </svg>
    ),
    vendor: (
      <svg {...common}>
        <path d="M4 8h12" />
        <path d="M5 8 6.5 4h7L15 8" />
        <path d="M6 8v8h8V8" />
        <circle cx="10" cy="12" r="1.25" fill="currentColor" stroke="none" />
      </svg>
    ),
    display: (
      <svg {...common}>
        <path d="M3 6h14v8H3z" />
        <path d="M7 14v2h6v-2" />
        <path d="M8 4h4l1 2H7z" />
      </svg>
    ),
    leave: (
      <svg {...common}>
        <path d="M8 4H4v12h4" />
        <path d="M11 10H7" />
        <path d="m14 7 3 3-3 3" />
      </svg>
    ),
  }

  return icons[id] ?? (
    <svg {...common}>
      <circle cx="10" cy="10" r="6" />
    </svg>
  )
}

export function GameHudMenu({ items }: Props) {
  return (
    <nav className="game-hud-menu" aria-label="Game menu">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`hud-menu-btn${item.variant === 'leave' ? ' hud-menu-btn--leave' : ''}`}
          onClick={item.onClick}
          title={item.title ?? item.label}
          aria-label={item.label}
        >
          <span className="hud-menu-btn__icon">
            <HudMenuIcon id={item.id} />
          </span>
          <span className="hud-menu-btn__label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
