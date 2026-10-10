import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import {
  activeRentalAt,
  canRentOffer,
  formatRentalRequirements,
  rentalCatalogEntry,
  rentalDurationTiers,
  rentalOffersForNpc,
  rentalTierZenyCost,
  type ActiveRental,
} from '../game/character/rental'
import type { RoRentalDurationTierId, RoRentalKind } from '../content/ro/types'
import type { CharacterSheetPayload } from '../game/events'
import { getCharacterSession } from '../game/character/characterSessionBridge'
import type { CharacterRow, NpcRow } from '../types/database'
import { spendCharacterZeny } from '../lib/zeny'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  character: CharacterRow
  npc: NpcRow
  sheet: CharacterSheetPayload
  onClose: () => void
  onCharacterUpdated: (character: CharacterRow) => void
  onMessage?: (text: string) => void
}

function describeActive(active: ActiveRental): string {
  const entry = rentalCatalogEntry(active.kind)
  const seconds = Math.max(0, Math.ceil((active.expiresAt - Date.now()) / 1000))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${mins}m`)
  return `${entry.name} — ${parts.join(' ')} remaining`
}

export function RentalModal({ character, npc, sheet, onClose, onCharacterUpdated, onMessage }: Props) {
  const offers = rentalOffersForNpc(npc.id)
  const tiers = rentalDurationTiers()
  const session = getCharacterSession()
  const active = activeRentalAt(session)
  const progress = { jobId: sheet.jobId, skills: sheet.skills }

  async function rent(kind: RoRentalKind, tierId: RoRentalDurationTierId) {
    const check = canRentOffer(session, kind, tierId, character.zeny)
    if (check.ok === false) {
      onMessage?.(check.reason)
      return
    }
    const tier = tiers.find((t) => t.id === tierId)
    if (!tier) return
    const cost = rentalTierZenyCost(tier)
    if (cost > 0) {
      const nextZeny = await spendCharacterZeny(character.id, -cost)
      if (nextZeny == null) {
        onMessage?.('Payment failed')
        return
      }
      onCharacterUpdated({ ...character, zeny: nextZeny })
    }
    dispatchCharacterAction({ type: 'rentEquipment', kind, tierId })
    onMessage?.(`Rented ${rentalCatalogEntry(kind).name} (${tier.label}).`)
    onClose()
  }

  function dismiss() {
    dispatchCharacterAction({ type: 'dismissRental' })
    onMessage?.('Rental returned.')
    onClose()
  }

  return (
    <AnimatedModal onClose={onClose}>
      <ModalHeader title={npc.label} onClose={onClose} />
      <ModalScrollBody>
      <p className="muted small">Equipment rental · one active rental at a time</p>
      {active ? (
        <div className="panel" style={{ marginBottom: 12 }}>
          <strong>Active rental</strong>
          <p className="small">{describeActive(active)}</p>
          <button type="button" onClick={dismiss}>Dismiss (free)</button>
        </div>
      ) : null}
      {offers.length === 0 ? (
        <p className="muted">No rentals configured.</p>
      ) : (
        <ul className="item-list">
          {offers.map((kind) => {
            const entry = rentalCatalogEntry(kind)
            return (
              <li key={kind} className="rental-offer-row">
                <div>
                  <strong>{entry.name}</strong>
                  <p className="muted small">{formatRentalRequirements(kind)}</p>
                  <p className="muted small">Speed ×{entry.speedMultiplier}</p>
                </div>
                <div className="rental-tier-buttons">
                  {tiers.map((tier) => {
                    const tierId = tier.id as RoRentalDurationTierId
                    const cost = rentalTierZenyCost(tier)
                    const check = canRentOffer(session, kind, tierId, character.zeny)
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        className="rental-tier-btn"
                        disabled={!check.ok}
                        title={check.ok === false ? check.reason : undefined}
                        onClick={() => void rent(kind, tierId)}
                      >
                        <span className="rental-tier-btn-label">{tier.label}</span>
                        <span className="muted small">{cost.toLocaleString()}z</span>
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <p className="muted small" style={{ marginTop: 8 }}>
        Job: {progress.jobId} · Zeny: {character.zeny.toLocaleString()}
      </p>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
