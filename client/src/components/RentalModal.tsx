import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import {
  activeRentalAt,
  canRentOffer,
  formatRentalRequirements,
  rentalCatalogEntry,
  rentalOffersForNpc,
  type ActiveRental,
} from '../game/character/rental'
import type { RoRentalKind } from '../content/ro/types'
import type { CharacterSheetPayload } from '../game/events'
import { getCharacterSession } from '../game/character/characterSessionBridge'
import type { CharacterRow, NpcRow } from '../types/database'
import { spendCharacterZeny } from '../lib/zeny'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'

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
  const mins = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${entry.name} — ${mins}:${sec.toString().padStart(2, '0')} remaining`
}

export function RentalModal({ character, npc, sheet, onClose, onCharacterUpdated, onMessage }: Props) {
  const offers = rentalOffersForNpc(npc.id)
  const session = getCharacterSession()
  const active = activeRentalAt(session)
  const progress = { jobId: sheet.jobId, skills: sheet.skills }

  async function rent(kind: RoRentalKind) {
    const check = canRentOffer(session, kind, character.zeny)
    if (check.ok === false) {
      onMessage?.(check.reason)
      return
    }
    const cost = rentalCatalogEntry(kind).zenyCost
    if (cost > 0) {
      const nextZeny = await spendCharacterZeny(character.id, -cost)
      if (nextZeny == null) {
        onMessage?.('Payment failed')
        return
      }
      onCharacterUpdated({ ...character, zeny: nextZeny })
    }
    dispatchCharacterAction({ type: 'rentEquipment', kind })
    onMessage?.(`Rented ${rentalCatalogEntry(kind).name}.`)
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
            const check = canRentOffer(session, kind, character.zeny)
            return (
              <li key={kind} className="row spread">
                <div>
                  <strong>{entry.name}</strong>
                  <p className="muted small">{formatRentalRequirements(kind)}</p>
                  <p className="muted small">
                    {Math.round(entry.durationMs / 60000)} min · speed ×{entry.speedMultiplier}
                  </p>
                  {check.ok === false ? <p className="muted small">{check.reason}</p> : null}
                </div>
                <button type="button" disabled={!check.ok} onClick={() => void rent(kind)}>
                  Rent
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="muted small" style={{ marginTop: 8 }}>
        Job: {progress.jobId} · Zeny: {character.zeny}
      </p>
    </AnimatedModal>
  )
}
