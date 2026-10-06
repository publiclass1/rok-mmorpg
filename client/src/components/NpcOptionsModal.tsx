import type { NpcRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'

export type NpcMenuChoice =
  | { kind: 'storage'; label: string }
  | { kind: 'save'; label: string }
  | { kind: 'job_master'; label: string }
  | { kind: 'shop'; label: string }
  | { kind: 'healer'; label: string; zenyCost: number }
  | { kind: 'teleport'; label: string; destinationMapId: string }
  | { kind: 'cancel'; label: string }

export function npcMenuChoices(npc: NpcRow): NpcMenuChoice[] {
  const choices: NpcMenuChoice[] = []

  switch (npc.npc_type) {
    case 'storage':
      choices.push({ kind: 'storage', label: 'Open storage' })
      break
    case 'save':
      choices.push({ kind: 'save', label: 'Save respawn point' })
      break
    case 'job_master':
      choices.push({ kind: 'job_master', label: 'Job change' })
      break
    case 'shop':
      choices.push({ kind: 'shop', label: 'Browse wares' })
      break
    case 'healer': {
      const cost = typeof npc.config?.zenyCost === 'number' ? Math.max(0, Math.floor(npc.config.zenyCost)) : 0
      choices.push({
        kind: 'healer',
        label: cost > 0 ? `Restore HP/SP (${cost} zeny)` : 'Restore HP/SP (free)',
        zenyCost: cost,
      })
      break
    }
    case 'teleport': {
      const destinations = npc.config?.destinations ?? []
      for (const dest of destinations) {
        choices.push({
          kind: 'teleport',
          label: dest.label || dest.map_id,
          destinationMapId: dest.map_id,
        })
      }
      if (destinations.length === 0) {
        choices.push({ kind: 'cancel', label: 'No destinations available' })
      }
      break
    }
    default:
      break
  }

  choices.push({ kind: 'cancel', label: 'Close' })
  return choices
}

type Props = {
  npc: NpcRow
  onChoose: (choice: NpcMenuChoice) => void
  onClose: () => void
}

export function NpcOptionsModal({ npc, onChoose, onClose }: Props) {
  const choices = npcMenuChoices(npc)

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal npc-options-modal">
        <div className="row spread modal-drag-handle">
          <h2 style={{ margin: 0 }}>{npc.label}</h2>
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted small">Choose an option</p>
        <ul className="npc-options-list">
          {choices.map((choice, index) => {
            const disabled = choice.kind === 'cancel' && choice.label.startsWith('No destinations')
            return (
              <li key={`${choice.kind}-${index}`}>
                <button
                  type="button"
                  className={choice.kind === 'cancel' ? 'secondary' : undefined}
                  disabled={disabled}
                  onClick={() => {
                    if (choice.kind === 'cancel') {
                      onClose()
                      return
                    }
                    onChoose(choice)
                  }}
                >
                  {choice.label}
                </button>
              </li>
            )
          })}
        </ul>
    </AnimatedModal>
  )
}
