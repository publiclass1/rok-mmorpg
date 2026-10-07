import { useState } from 'react'
import { AnimatedModal } from './motion/AnimatedModal'
import { mapDisplayName } from '../game/world/mapDisplayName'

type Props = {
  saveMapId: string
  onStay: () => void
  onReturnToSave: () => Promise<void>
}

export function DeathModal({ saveMapId, onStay, onReturnToSave }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function returnToSave() {
    setBusy(true)
    setError(null)
    try {
      await onReturnToSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Respawn failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatedModal onClose={onStay}>
      <div className="modal-panel">
        <h2 className="modal-title">Defeated</h2>
        <p>You have been defeated. Stay here as a corpse, or return to your last save point.</p>
        <p className="muted small">
          Save point: <strong>{mapDisplayName(saveMapId)}</strong>
        </p>
        {error && <p className="small">{error}</p>}
        <div className="row spread gap">
          <button type="button" className="secondary" disabled={busy} onClick={onStay}>
            Stay
          </button>
          <button type="button" disabled={busy} onClick={() => void returnToSave()}>
            Return to save point
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
