import type { SelectedPlayerPayload } from '../game/events'

type Props = {
  player: SelectedPlayerPayload
  anchor: { x: number; y: number }
  onTrade: () => void
  onInvite: () => void
  onApply: () => void
  onBrowseShop: () => void
}

export function PlayerTargetPopup({
  player,
  anchor,
  onTrade,
  onInvite,
  onApply,
  onBrowseShop,
}: Props) {
  return (
    <div
      className="player-target-popup game-hud-panel"
      style={{ left: anchor.x, top: anchor.y }}
      role="dialog"
      aria-label={`Actions for ${player.name}`}
    >
      <p className="player-target-popup__name">
        <strong>{player.name}</strong>
      </p>
      <div className="target-actions row wrap gap">
        <button type="button" className="hud-btn" onClick={onTrade}>
          Trade
        </button>
        <button type="button" className="hud-btn" onClick={onInvite}>
          Join Party
        </button>
        <button type="button" className="hud-btn" onClick={onApply}>
          Apply Party
        </button>
        {player.isVending && (
          <button type="button" className="hud-btn" onClick={onBrowseShop}>
            Browse shop
          </button>
        )}
      </div>
    </div>
  )
}
