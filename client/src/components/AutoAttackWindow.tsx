import { useMemo, useState } from 'react'
import { SkillIcon } from './SkillIcon'
import {
  AUTO_ATTACK_PATROL_RADIUS_MAX,
  AUTO_ATTACK_PATROL_RADIUS_MIN,
  AUTO_ATTACK_ROTATION_SLOTS,
  autoAttackSkillAllowedInRotation,
  type AutoAttackConfig,
  type AutoAttackMovementMode,
} from '../game/combat/autoAttackConfig'
import { mobFilterDefIds } from '../game/combat/autoAttackTargeting'
import { mobsOnMap } from '../game/combat/autoAttackTargeting'
import { canPlaceOnSkillBar } from '../game/character/skillBarEntry'
import { isSkillBarDragEvent, readSkillBarDrag } from '../game/character/skillBarDrag'
import { SKILLS, skillUsableByJob } from '../game/character/skillsConfig'
import { skillTooltipTitle } from '../game/character/skillIconUrl'
import type { CharacterSheetPayload } from '../game/events'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  mapId: string
  sheet: CharacterSheetPayload
  config: AutoAttackConfig
  onChange: (next: AutoAttackConfig) => void
  onClose: () => void
}

function rotationSkillAllowed(skillId: string, sheet: CharacterSheetPayload): boolean {
  if (!autoAttackSkillAllowedInRotation(skillId)) return false
  if (!canPlaceOnSkillBar(skillId, sheet.jobId, sheet.skills)) return false
  const def = SKILLS[skillId]
  if (!def) return skillId === 'basic_attack'
  if (def.type === 'passive') return false
  if (def.target === 'ground') return false
  const level = sheet.skills[skillId] ?? 0
  if (level < 1 && skillId !== 'basic_attack') return false
  return skillUsableByJob(skillId, sheet.jobId)
}

export function AutoAttackWindow({ mapId, sheet, config, onChange, onClose }: Props) {
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const mapMobs = useMemo(() => mobsOnMap(mapId), [mapId])

  function patch(partial: Partial<AutoAttackConfig>) {
    onChange({ ...config, ...partial })
  }

  function setRotationSlot(index: number, skillId: string | null) {
    const rotation = [...config.rotation]
    while (rotation.length < AUTO_ATTACK_ROTATION_SLOTS) rotation.push(null)
    rotation[index] = skillId
    patch({ rotation })
  }

  function handleRotationDrop(index: number, e: React.DragEvent) {
    e.preventDefault()
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload) return
    const skillId =
      payload.source === 'list' || payload.source === 'bar' ? payload.skillId : null
    if (!skillId || !rotationSkillAllowed(skillId, sheet)) return
    setRotationSlot(index, skillId)
  }

  function toggleMob(defId: string) {
    if (config.mobFilter.all) {
      const allIds = mapMobs.map((m) => m.defId)
      const next = allIds.filter((id) => id !== defId)
      patch({ mobFilter: { all: false, defIds: next } })
      return
    }
    const set = new Set(mobFilterDefIds(config.mobFilter))
    if (set.has(defId)) set.delete(defId)
    else set.add(defId)
    patch({ mobFilter: { all: false, defIds: [...set] } })
  }

  function setSelectAllMobs(all: boolean) {
    patch({ mobFilter: all ? { all: true } : { all: false, defIds: mapMobs.map((m) => m.defId) } })
  }

  return (
    <AnimatedModal panelClassName="panel modal auto-attack-modal">
      <ModalHeader title="Auto attack" onClose={onClose} />
      <ModalScrollBody>
        <label className="auto-attack-row">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span>Enable auto attack</span>
        </label>

        <section className="auto-attack-section">
          <h3 className="auto-attack-section__title">Skill rotation (9 slots)</h3>
          <p className="muted small">Drag skills from the Skills window (Alt+K).</p>
          <div
            className="skill-bar auto-attack-rotation"
            onDragOver={(e) => {
              if (!isSkillBarDragEvent(e.dataTransfer)) return
              e.preventDefault()
            }}
          >
            {Array.from({ length: AUTO_ATTACK_ROTATION_SLOTS }, (_, index) => {
              const skillId = config.rotation[index] ?? null
              const allowed = skillId ? rotationSkillAllowed(skillId, sheet) : true
              const skill = skillId ? SKILLS[skillId] : null
              const level = skillId ? sheet.skills[skillId] ?? 0 : 0
              const isDropTarget = dropTarget === index
              return (
                <div
                  key={index}
                  className={`skill-slot${!allowed ? ' skill-slot--inactive' : ''}${isDropTarget ? ' skill-slot--drop-target' : ''}`}
                  title={
                    skill
                      ? skillTooltipTitle(skillId!, level)
                      : `Rotation slot ${index + 1}`
                  }
                  onDragOver={(e) => {
                    if (!isSkillBarDragEvent(e.dataTransfer)) return
                    e.preventDefault()
                    setDropTarget(index)
                  }}
                  onDragLeave={() => setDropTarget((c) => (c === index ? null : c))}
                  onDrop={(e) => handleRotationDrop(index, e)}
                  onClick={() => skillId && setRotationSlot(index, null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') setRotationSlot(index, null)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="skill-key">{index + 1}</span>
                  {skillId && allowed ? (
                    <SkillIcon skillId={skillId} level={level} size="xs" draggable={false} />
                  ) : (
                    <span className="skill-slot-empty" aria-hidden>·</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="auto-attack-section">
          <h3 className="auto-attack-section__title">Recovery</h3>
          <label className="auto-attack-row">
            <span>Sit when SP at or below</span>
            <input
              type="number"
              min={1}
              max={100}
              value={config.sitSpPercent}
              onChange={(e) => patch({ sitSpPercent: Number(e.target.value) })}
            />
            <span>%</span>
          </label>
          <label className="auto-attack-row">
            <input
              type="checkbox"
              checked={config.redPotionEnabled}
              onChange={(e) => patch({ redPotionEnabled: e.target.checked })}
            />
            <span>Red potion when HP ≤</span>
            <input
              type="number"
              min={1}
              max={100}
              disabled={!config.redPotionEnabled}
              value={config.redPotionHpPercent}
              onChange={(e) => patch({ redPotionHpPercent: Number(e.target.value) })}
            />
            <span>%</span>
          </label>
          <label className="auto-attack-row">
            <input
              type="checkbox"
              checked={config.bluePotionEnabled}
              onChange={(e) => patch({ bluePotionEnabled: e.target.checked })}
            />
            <span>Blue potion when SP ≤</span>
            <input
              type="number"
              min={1}
              max={100}
              disabled={!config.bluePotionEnabled}
              value={config.bluePotionSpPercent}
              onChange={(e) => patch({ bluePotionSpPercent: Number(e.target.value) })}
            />
            <span>%</span>
          </label>
        </section>

        <section className="auto-attack-section">
          <h3 className="auto-attack-section__title">Movement</h3>
          <label className="auto-attack-row">
            <input
              type="radio"
              name="auto-move"
              checked={config.movementMode === 'stay_still'}
              onChange={() => patch({ movementMode: 'stay_still' as AutoAttackMovementMode })}
            />
            <span>Stay still</span>
          </label>
          <label className="auto-attack-row">
            <input
              type="radio"
              name="auto-move"
              checked={config.movementMode === 'patrol_range'}
              onChange={() => patch({ movementMode: 'patrol_range' as AutoAttackMovementMode })}
            />
            <span>Patrol inside range</span>
          </label>
          {config.movementMode === 'patrol_range' && (
            <label className="auto-attack-row auto-attack-row--stack">
              <span>Patrol radius ({config.patrolRadiusPx}px)</span>
              <input
                type="range"
                min={AUTO_ATTACK_PATROL_RADIUS_MIN}
                max={AUTO_ATTACK_PATROL_RADIUS_MAX}
                value={config.patrolRadiusPx}
                onChange={(e) => patch({ patrolRadiusPx: Number(e.target.value) })}
              />
              <span className="muted small">
                Walk within this circle from where you started auto attack.
              </span>
            </label>
          )}
        </section>

        <section className="auto-attack-section">
          <h3 className="auto-attack-section__title">Map mobs ({mapDisplayShort(mapId)})</h3>
          {mapMobs.length === 0 ? (
            <p className="muted small">No mob spawns on this map.</p>
          ) : (
            <>
              <label className="auto-attack-row">
                <input
                  type="checkbox"
                  checked={config.mobFilter.all}
                  onChange={(e) => setSelectAllMobs(e.target.checked)}
                />
                <span>Attack all mob types on this map</span>
              </label>
              <ul className="auto-attack-mob-list">
                {mapMobs.map((m) => {
                  const checked =
                    config.mobFilter.all || mobFilterDefIds(config.mobFilter).includes(m.defId)
                  return (
                    <li key={m.defId}>
                      <label className="auto-attack-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={config.mobFilter.all}
                          onChange={() => toggleMob(m.defId)}
                        />
                        <span>{m.name}</span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </section>
      </ModalScrollBody>
    </AnimatedModal>
  )
}

function mapDisplayShort(mapId: string): string {
  const parts = mapId.split('_')
  return parts[parts.length - 1] ?? mapId
}
