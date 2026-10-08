import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import {
  canAcceptJobChange,
  jobChangeOffersForCurrentJob,
  jobChangeOffersForNpc,
  type JobChangeOffer,
} from '../game/character/jobChange'
import { JOB_NAMES } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
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
}

function describeOffer(offer: JobChangeOffer): string {
  const name = JOB_NAMES[offer.jobId] ?? offer.jobId
  const parts = [`Become ${name}`]
  parts.push(`Job Lv ${offer.requiredJobLevel}+`)
  if (offer.requiredBaseLevel && offer.requiredBaseLevel > 1) {
    parts.push(`Base Lv ${offer.requiredBaseLevel}+`)
  }
  if (offer.zenyCost && offer.zenyCost > 0) {
    parts.push(`${offer.zenyCost} zeny`)
  }
  return parts.join(' · ')
}

export function JobMasterModal({ character, npc, sheet, onClose, onCharacterUpdated }: Props) {
  const allOffers = jobChangeOffersForNpc(npc.id, npc.config)
  const offers = jobChangeOffersForCurrentJob(allOffers, sheet.jobId)
  const progress = { jobId: sheet.jobId, jobLevel: sheet.jobLevel, baseLevel: sheet.baseLevel }

  async function accept(offer: JobChangeOffer) {
    const check = canAcceptJobChange(progress, offer, character.zeny)
    if (!check.ok) return

    const cost = offer.zenyCost ?? 0
    if (cost > 0) {
      const nextZeny = await spendCharacterZeny(character.id, -cost)
      if (nextZeny == null) return
      onCharacterUpdated({ ...character, zeny: nextZeny })
    }

    dispatchCharacterAction({ type: 'changeJob', jobId: offer.jobId })
    onClose()
  }

  return (
    <AnimatedModal onClose={onClose}>
        <ModalHeader title={npc.label} onClose={onClose} />
        <ModalScrollBody>
        <p className="muted small">
          Current: {JOB_NAMES[sheet.jobId] ?? sheet.jobId} · Job Lv {sheet.jobLevel} · Base Lv {sheet.baseLevel}
        </p>
        {offers.length === 0 ? (
          <p className="muted">
            {allOffers.length === 0
              ? 'No job paths configured for this NPC.'
              : 'No advancement paths for your current job.'}
          </p>
        ) : (
          <ul className="item-list">
            {offers.map((offer) => {
              const check = canAcceptJobChange(progress, offer, character.zeny)
              return (
                <li key={offer.jobId} className="row spread">
                  <div>
                    <strong>{JOB_NAMES[offer.jobId] ?? offer.jobId}</strong>
                    <p className="muted small">{describeOffer(offer)}</p>
                    {check.ok === false ? <p className="muted small">{check.reason}</p> : null}
                  </div>
                  <button type="button" disabled={!check.ok} onClick={() => void accept(offer)}>
                    Accept
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        </ModalScrollBody>
    </AnimatedModal>
  )
}
