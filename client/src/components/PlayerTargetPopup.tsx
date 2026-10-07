import type { SelectedPlayerPayload } from '../game/events'

type Props = {
  player: SelectedPlayerPayload
  anchor: { x: number; y: number }
  pvpMap?: boolean
  onTrade: () => void
  onDuel: () => void
  onAttack?: () => void
  onInvite: () => void
  onApply: () => void
  onBrowseShop: () => void
}

export function PlayerTargetPopup({
  player,
  anchor,
  pvpMap = false,
  onTrade,
  onDuel,
  onAttack,
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
        {pvpMap && onAttack && (
          <button type="button" className="hud-btn" onClick={onAttack}>
            Attack
          </button>
        )}
        <button type="button" className="hud-btn" onClick={onDuel}>
          Duel
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
