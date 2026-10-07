import { useState } from 'react'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  onRespawn: () => Promise<void>
  onLeave: () => Promise<void>
}

export function PvpDeathModal({ onRespawn, onLeave }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatedModal onClose={() => {}}>
      <div className="modal-panel">
        <h2 className="modal-title">Defeated in PVP</h2>
        <p>Respawn in the arena with full HP and SP, or leave the PVP room.</p>
        {error && <p className="small">{error}</p>}
        <div className="row spread gap">
          <button type="button" className="secondary" disabled={busy} onClick={() => void run(onLeave)}>
            Leave PVP room
          </button>
          <button type="button" disabled={busy} onClick={() => void run(onRespawn)}>
            Respawn in arena
          </button>
        </div>
      </div>
    </AnimatedModal>
  )
}
