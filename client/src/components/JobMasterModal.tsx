import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { canAcceptJobChange, jobChangeOffersFromNpcConfig, type JobChangeOffer } from '../game/character/jobChange'
import { JOB_NAMES } from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import type { CharacterRow, NpcRow } from '../types/database'
import { supabase } from '../lib/supabase'
import { AnimatedModal } from './motion/AnimatedModal'

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
  const offers = jobChangeOffersFromNpcConfig(npc.config)
  const progress = { jobId: sheet.jobId, jobLevel: sheet.jobLevel, baseLevel: sheet.baseLevel }

  async function accept(offer: JobChangeOffer) {
    const check = canAcceptJobChange(progress, offer, character.zeny)
    if (!check.ok) return

    const cost = offer.zenyCost ?? 0
    if (cost > 0) {
      const { data, error } = await supabase
        .from('characters')
        .update({ zeny: character.zeny - cost })
        .eq('id', character.id)
        .select('*')
        .single()
      if (error || !data) return
      onCharacterUpdated(data as CharacterRow)
    }

    dispatchCharacterAction({ type: 'changeJob', jobId: offer.jobId })
    onClose()
  }

  return (
    <AnimatedModal onClose={onClose}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>{npc.label}</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted small">
          Current: {JOB_NAMES[sheet.jobId] ?? sheet.jobId} · Job Lv {sheet.jobLevel} · Base Lv {sheet.baseLevel}
        </p>
        {offers.length === 0 ? (
          <p className="muted">No job paths configured for this NPC.</p>
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
    </AnimatedModal>
  )
}
