import type { SelectedPlayerPayload } from '../game/events'

type Props = {
  player: SelectedPlayerPayload
  anchor: { x: number; y: number }
  onDeal: () => void
  partyButton: { label: string; disabled?: boolean; onClick: () => void }
  onInviteDuel: () => void
  onInviteGuild?: { label: string; disabled: boolean; onClick?: () => void }
}

export function PlayerRightClickPopup({ player, anchor, onDeal, partyButton, onInviteDuel, onInviteGuild }: Props) {
  return (
    <div
      className="player-target-popup game-hud-panel"
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label={`Context actions for ${player.name}`}
    >
      <p className="player-target-popup__name">
        <strong>{player.name}</strong>
      </p>
      <div className="target-actions row wrap gap">
        <button type="button" className="hud-btn" onClick={onDeal}>
          Create Deal
        </button>
        <button
          type="button"
          className="hud-btn"
          onClick={partyButton.onClick}
          disabled={partyButton.disabled ?? false}
          title={partyButton.disabled ? partyButton.label : undefined}
        >
          {partyButton.label}
        </button>
        <button type="button" className="hud-btn" onClick={onInviteDuel}>
          Invite Duel
        </button>
        <button type="button" className="hud-btn" disabled aria-disabled="true" title="Coming soon">
          Send message
        </button>
        <button type="button" className="hud-btn" disabled aria-disabled="true" title="Coming soon">
          Add as friend
        </button>
        {onInviteGuild ? (
          <button
            type="button"
            className="hud-btn"
            disabled={onInviteGuild.disabled}
            onClick={onInviteGuild.disabled ? undefined : onInviteGuild.onClick}
            title={onInviteGuild.disabled ? 'Coming soon' : undefined}
          >
            {onInviteGuild.label}
          </button>
        ) : null}
      </div>
    </div>
  )
}

