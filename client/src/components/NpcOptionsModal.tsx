import type { NpcRow } from '../types/database'
import { dungeonFloors } from '../game/world/dungeonConfig'
import { isCustomWarpDestination, type WarpDestination } from '../game/world/warpDestinationCategory'
import { AnimatedModal } from './motion/AnimatedModal'

export type NpcMenuChoice =
  | { kind: 'storage'; label: string }
  | { kind: 'save'; label: string }
  | { kind: 'job_master'; label: string }
  | { kind: 'shop'; label: string }
  | { kind: 'healer'; label: string; zenyCost: number }
  | { kind: 'teleport'; label: string; destinationMapId: string }
  | { kind: 'dungeon'; label: string; floorId: string; disabled?: boolean }
  | { kind: 'cancel'; label: string }

export function npcMenuChoices(
  npc: NpcRow,
  options?: { baseLevel?: number; partyEnabled?: boolean },
): NpcMenuChoice[] {
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
      const destinations = (npc.config?.destinations ?? []) as WarpDestination[]
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
    case 'dungeon': {
      const baseLevel = options?.baseLevel ?? 1
      const partyOk = options?.partyEnabled ?? false
      for (const floor of dungeonFloors()) {
        const levelOk = baseLevel >= floor.minLevel
        let label = `${floor.name} (Lv ${floor.minLevel}–${floor.maxLevel})`
        if (!partyOk) label += ' — party required'
        else if (!levelOk) label += ` — need Lv ${floor.minLevel}`
        choices.push({
          kind: 'dungeon',
          floorId: floor.id,
          label,
          disabled: !partyOk || !levelOk,
        })
      }
      break
    }
    default:
      break
  }

  choices.push({ kind: 'cancel', label: 'Close' })
  return choices
}

function teleportSections(npc: NpcRow): { custom: NpcMenuChoice[]; standard: NpcMenuChoice[] } {
  const custom: NpcMenuChoice[] = []
  const standard: NpcMenuChoice[] = []
  const destinations = (npc.config?.destinations ?? []) as WarpDestination[]
  for (const dest of destinations) {
    const choice: NpcMenuChoice = {
      kind: 'teleport',
      label: dest.label || dest.map_id,
      destinationMapId: dest.map_id,
    }
    if (isCustomWarpDestination(dest)) custom.push(choice)
    else standard.push(choice)
  }
  return { custom, standard }
}

type Props = {
  npc: NpcRow
  baseLevel: number
  partyEnabled: boolean
  onChoose: (choice: NpcMenuChoice) => void
  onClose: () => void
}

function ChoiceButton({
  choice,
  onChoose,
  onClose,
}: {
  choice: NpcMenuChoice
  onChoose: (c: NpcMenuChoice) => void
  onClose: () => void
}) {
  const disabled =
    (choice.kind === 'cancel' && choice.label.startsWith('No destinations')) ||
    (choice.kind === 'dungeon' && choice.disabled)
  return (
    <li>
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
}

export function NpcOptionsModal({ npc, baseLevel, partyEnabled, onChoose, onClose }: Props) {
  const choices = npcMenuChoices(npc, { baseLevel, partyEnabled })
  const isTeleport = npc.npc_type === 'teleport'
  const sections = isTeleport ? teleportSections(npc) : null

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal npc-options-modal">
      <div className="row spread modal-drag-handle">
        <h2 style={{ margin: 0 }}>{npc.label}</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted small">Choose an option</p>
      {isTeleport && sections ? (
        <ul className="npc-options-list">
          {sections.standard.length > 0 && (
            <>
              <li className="npc-options-section">Maps</li>
              {sections.standard.map((choice, index) => (
                <ChoiceButton key={`std-${index}`} choice={choice} onChoose={onChoose} onClose={onClose} />
              ))}
            </>
          )}
          {sections.custom.length > 0 && (
            <>
              <li className="npc-options-section">Custom maps</li>
              {sections.custom.map((choice, index) => (
                <ChoiceButton key={`custom-${index}`} choice={choice} onChoose={onChoose} onClose={onClose} />
              ))}
            </>
          )}
          {sections.standard.length === 0 && sections.custom.length === 0 && (
            <ChoiceButton
              choice={{ kind: 'cancel', label: 'No destinations available' }}
              onChoose={onChoose}
              onClose={onClose}
            />
          )}
          <ChoiceButton choice={{ kind: 'cancel', label: 'Close' }} onChoose={onChoose} onClose={onClose} />
        </ul>
      ) : (
        <ul className="npc-options-list">
          {choices.map((choice, index) => (
            <ChoiceButton key={`${choice.kind}-${index}`} choice={choice} onChoose={onChoose} onClose={onClose} />
          ))}
        </ul>
      )}
    </AnimatedModal>
  )
}
