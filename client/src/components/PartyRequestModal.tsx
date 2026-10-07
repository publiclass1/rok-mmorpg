import { useState } from 'react'
import { partyManage } from '../lib/api'
import type { PartyRequestRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  characterId: string
  request: PartyRequestRow
  fromName: string
  onClose: () => void
  onResolved: () => void
}

export function PartyRequestModal({ characterId, request, fromName, onClose, onResolved }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const title =
    request.kind === 'invite'
      ? `${fromName} invites you to a party`
      : `${fromName} wants to join your party`

  async function respond(accept: boolean) {
    setBusy(true)
    setError(null)
    try {
      await partyManage({
        action: accept ? 'accept' : 'decline',
        characterId,
        requestId: request.id,
      })
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
        <h2 className="modal-title">Party</h2>
        <p>{title}</p>
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
