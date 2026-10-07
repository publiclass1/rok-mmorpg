import { useState } from 'react'
import { JOB_NAMES } from '../game/character/skillsConfig'
import { duelManage } from '../lib/api'
import type { DuelSessionRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  characterId: string
  duel: DuelSessionRow
  onClose: () => void
  onResolved: () => void
}

export function DuelInviteModal({ characterId, duel, onClose, onResolved }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const jobName = JOB_NAMES[duel.challenger_job_id] ?? duel.challenger_job_id

  async function respond(accept: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (accept) {
        await duelManage({
          action: 'accept',
          characterId,
          duelSessionId: duel.id,
        })
      } else {
        await duelManage({
          action: 'decline',
          characterId,
          duelSessionId: duel.id,
        })
      }
      onResolved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatedModal onClose={onClose}>
      <div className="modal-panel">
        <h2 className="modal-title">Duel</h2>
        <p>
          <strong>{duel.challenger_name}</strong> challenges you to a duel
        </p>
        <p className="muted small">
          {jobName} · Base Lv {duel.challenger_base_level}
        </p>
        {error && <p className="small">{error}</p>}
        <div className="row spread gap">
          <button type="button" disabled={busy} onClick={() => void respond(true)}>
            Accept
          </button>
          <button type="button" className="secondary" disabled={busy} onClick={() => void respond(false)}>
            Decline
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
