import { useMemo, useRef, useState } from 'react'
import { SkillHoverTooltip } from './SkillHoverTooltip'
import { SkillIcon } from './SkillIcon'
import {
  AUTO_ATTACK_PATROL_RADIUS_MAX,
  AUTO_ATTACK_PATROL_RADIUS_MIN,
  AUTO_ATTACK_ROTATION_SLOTS,
  type AutoAttackConfig,
  type AutoAttackMovementMode,
} from '../game/combat/autoAttackConfig'
import { mobFilterDefIds, mobsOnMap } from '../game/combat/autoAttackTargeting'
import {
  isSkillBarDragEvent,
  readSkillBarDrag,
  writeSkillBarDrag,
} from '../game/character/skillBarDrag'
import {
  JOB_NAMES,
  autoAttackAssignableSkills,
  canPlaceOnAutoAttackRotation,
} from '../game/character/skillsConfig'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
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

type AutoAttackTab = 'rotation' | 'recovery' | 'movement' | 'targets'

const AUTO_ATTACK_TABS: { id: AutoAttackTab; label: string }[] = [
  { id: 'rotation', label: 'Rotation' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'movement', label: 'Movement' },
  { id: 'targets', label: 'Targets' },
]

export function AutoAttackWindow({ mapId, sheet, config, onChange, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<AutoAttackTab>('rotation')
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0)
  const dragSourceSlotRef = useRef<number | null>(null)
  const dropHandledRef = useRef(false)
  const suppressClickRef = useRef(false)
  const mapMobs = useMemo(() => mobsOnMap(mapId), [mapId])
  const assignableSkills = useMemo(() => autoAttackAssignableSkills(sheet), [sheet])

  const paletteByJob = useMemo(() => {
    const groups = new Map<string, typeof assignableSkills>()
    for (const def of assignableSkills) {
      const key = def.jobId
      const list = groups.get(key) ?? []
      list.push(def)
      groups.set(key, list)
    }
    return [...groups.entries()].sort((a, b) =>
      (JOB_NAMES[a[0]] ?? a[0]).localeCompare(JOB_NAMES[b[0]] ?? b[0]),
    )
  }, [assignableSkills])

  const mobSelectionCount = config.mobFilter.all
    ? mapMobs.length
    : mobFilterDefIds(config.mobFilter).length

  function patch(partial: Partial<AutoAttackConfig>) {
    onChange({ ...config, ...partial })
  }

  function setRotationSlot(index: number, skillId: string | null) {
    const rotation = [...config.rotation]
    while (rotation.length < AUTO_ATTACK_ROTATION_SLOTS) rotation.push(null)
    rotation[index] = skillId
    patch({ rotation })
  }

  function assignSkillToSlot(index: number, skillId: string) {
    if (!canPlaceOnAutoAttackRotation(skillId, sheet)) {
      emitGameEvent('status', 'That skill cannot be used in auto attack rotation.')
      return
    }
    setRotationSlot(index, skillId)
    const nextEmpty = config.rotation.findIndex((id, i) => i > index && !id)
    if (nextEmpty >= 0) setSelectedSlotIndex(nextEmpty)
    else if (index < AUTO_ATTACK_ROTATION_SLOTS - 1) setSelectedSlotIndex(index + 1)
  }

  function clearRotationDragSourceIfNeeded() {
    const from = dragSourceSlotRef.current
    dragSourceSlotRef.current = null
    if (from == null || dropHandledRef.current) return
    setRotationSlot(from, null)
  }

  function handleRotationGutterDrop(e: React.DragEvent) {
    e.preventDefault()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload || payload.source !== 'autoRotation') return
    setRotationSlot(payload.slot, null)
  }

  function handleRotationDrop(index: number, e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload) return

    if (payload.source === 'autoRotation') {
      if (payload.slot === index) return
      const rotation = [...config.rotation]
      while (rotation.length < AUTO_ATTACK_ROTATION_SLOTS) rotation.push(null)
      rotation[index] = payload.skillId
      rotation[payload.slot] = null
      patch({ rotation })
      setSelectedSlotIndex(index)
      return
    }

    const skillId =
      payload.source === 'list' || payload.source === 'bar' ? payload.skillId : null
    if (!skillId) return
    if (!canPlaceOnAutoAttackRotation(skillId, sheet)) {
      emitGameEvent('status', 'That skill cannot be used in auto attack rotation.')
      return
    }
    setRotationSlot(index, skillId)
    setSelectedSlotIndex(index)
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
      <div className="auto-attack-enable">
        <div className="auto-attack-enable__text">
          <strong>Auto attack</strong>
          <span className="muted small">
            {config.enabled ? 'Running — uses settings below' : 'Off until enabled'}
          </span>
        </div>
        <label className="auto-attack-switch">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          <span className="auto-attack-switch__track" aria-hidden />
        </label>
      </div>

      <div className="auto-attack-tabs skills-window-tabs" role="tablist" aria-label="Auto attack settings">
        {AUTO_ATTACK_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`skills-window-tab${activeTab === tab.id ? ' skills-window-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ModalScrollBody className="auto-attack-tab-body">
        {activeTab === 'rotation' && (
        <section className="auto-attack-card auto-attack-tab-panel" role="tabpanel">
          <h3 className="auto-attack-section__title">Skill rotation</h3>
          <p className="muted small auto-attack-hint">
            Click a slot, then pick a skill below. Drag from Skills (Alt+K) or drag a slot skill
            outside the row to remove.
          </p>
          <div
            className="skill-bar auto-attack-rotation"
            onDragOver={(e) => {
              if (!isSkillBarDragEvent(e.dataTransfer)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={handleRotationGutterDrop}
          >
            {Array.from({ length: AUTO_ATTACK_ROTATION_SLOTS }, (_, index) => {
              const skillId = config.rotation[index] ?? null
              const allowed = skillId ? canPlaceOnAutoAttackRotation(skillId, sheet) : true
              const level = skillId ? sheet.skills[skillId] ?? 0 : 0
              const isDropTarget = dropTarget === index
              const selected = selectedSlotIndex === index
              const canDrag = Boolean(skillId && allowed)
              const rotationSlot = (
                <div
                  key={skillId && allowed ? undefined : index}
                  className={`skill-slot${!allowed ? ' skill-slot--inactive' : ''}${isDropTarget ? ' skill-slot--drop-target' : ''}${selected ? ' skill-slot--selected' : ''}${canDrag ? ' skill-slot--draggable' : ''}`}
                  title={skillId ? undefined : `Rotation slot ${index + 1}`}
                  draggable={canDrag}
                  onDragStart={(e) => {
                    if (!canDrag || !skillId) {
                      e.preventDefault()
                      return
                    }
                    e.stopPropagation()
                    suppressClickRef.current = false
                    dropHandledRef.current = false
                    dragSourceSlotRef.current = index
                    writeSkillBarDrag(e.dataTransfer, {
                      source: 'autoRotation',
                      skillId,
                      slot: index,
                    })
                  }}
                  onDrag={(e) => {
                    if (e.clientX !== 0 || e.clientY !== 0) suppressClickRef.current = true
                  }}
                  onDragEnd={() => {
                    setDropTarget(null)
                    clearRotationDragSourceIfNeeded()
                  }}
                  onDragOver={(e) => {
                    if (!isSkillBarDragEvent(e.dataTransfer)) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTarget(index)
                  }}
                  onDragLeave={() => setDropTarget((c) => (c === index ? null : c))}
                  onDrop={(e) => handleRotationDrop(index, e)}
                  onClick={() => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false
                      return
                    }
                    setSelectedSlotIndex(index)
                  }}
                  onDoubleClick={() => skillId && setRotationSlot(index, null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' || e.key === 'Delete') setRotationSlot(index, null)
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="skill-key">{index + 1}</span>
                  {skillId && allowed ? (
                    <SkillIcon skillId={skillId} level={level} size="xs" draggable={false} title="" />
                  ) : (
                    <span className="skill-slot-empty" aria-hidden>·</span>
                  )}
                </div>
              )

              if (skillId && allowed) {
                return (
                  <SkillHoverTooltip key={index} skillId={skillId} sheet={sheet}>
                    {rotationSlot}
                  </SkillHoverTooltip>
                )
              }
              return rotationSlot
            })}
          </div>

          {assignableSkills.length === 0 ? (
            <p className="muted small">No active skills learned for auto rotation.</p>
          ) : (
            <div className="auto-attack-palette">
              {paletteByJob.map(([jobId, skills]) => (
                <div key={jobId} className="auto-attack-palette-group">
                  <h4 className="auto-attack-palette-group__title">{JOB_NAMES[jobId] ?? jobId}</h4>
                  <div className="auto-attack-palette-grid">
                    {skills.map((def) => {
                      const level = sheet.skills[def.id] ?? 0
                      const paletteBtn = (
                        <button
                          type="button"
                          className="auto-attack-palette-btn"
                          onClick={() => assignSkillToSlot(selectedSlotIndex, def.id)}
                        >
                          <SkillIcon
                            skillId={def.id}
                            level={level}
                            size="sm"
                            draggable
                            drag={{ source: 'list', skillId: def.id }}
                            title=""
                          />
                          <span className="auto-attack-palette-btn__name">{def.name}</span>
                        </button>
                      )
                      return (
                        <SkillHoverTooltip
                          key={def.id}
                          skillId={def.id}
                          sheet={sheet}
                          tabJobId={def.jobId}
                        >
                          {paletteBtn}
                        </SkillHoverTooltip>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        )}

        {activeTab === 'recovery' && (
        <section className="auto-attack-card auto-attack-tab-panel" role="tabpanel">
          <h3 className="auto-attack-section__title">Recovery</h3>
          <label className="auto-attack-row auto-attack-row--stack">
            <span>Sit when SP ≤ {config.sitSpPercent}%</span>
            <input
              type="range"
              min={1}
              max={100}
              value={config.sitSpPercent}
              onChange={(e) => patch({ sitSpPercent: Number(e.target.value) })}
            />
            <span className="muted small">
              Add Sit to a rotation slot to enable auto sit. Stays seated until SP is fully restored.
            </span>
          </label>
          <label className="auto-attack-row">
            <input
              type="checkbox"
              checked={config.redPotionEnabled}
              onChange={(e) => patch({ redPotionEnabled: e.target.checked })}
            />
            <span>Red potion when HP ≤ {config.redPotionHpPercent}%</span>
          </label>
          {config.redPotionEnabled && (
            <input
              type="range"
              className="auto-attack-range-full"
              min={1}
              max={100}
              value={config.redPotionHpPercent}
              onChange={(e) => patch({ redPotionHpPercent: Number(e.target.value) })}
            />
          )}
          <label className="auto-attack-row">
            <input
              type="checkbox"
              checked={config.bluePotionEnabled}
              onChange={(e) => patch({ bluePotionEnabled: e.target.checked })}
            />
            <span>Blue potion when SP ≤ {config.bluePotionSpPercent}%</span>
          </label>
          {config.bluePotionEnabled && (
            <input
              type="range"
              className="auto-attack-range-full"
              min={1}
              max={100}
              value={config.bluePotionSpPercent}
              onChange={(e) => patch({ bluePotionSpPercent: Number(e.target.value) })}
            />
          )}
        </section>
        )}

        {activeTab === 'movement' && (
        <section className="auto-attack-card auto-attack-tab-panel" role="tabpanel">
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
        )}

        {activeTab === 'targets' && (
        <section className="auto-attack-card auto-attack-tab-panel" role="tabpanel">
          <h3 className="auto-attack-section__title">
            Map mobs ({mapDisplayShort(mapId)})
            {!config.mobFilter.all && mapMobs.length > 0 && (
              <span className="auto-attack-mob-count muted small">
                · {mobSelectionCount} selected
              </span>
            )}
          </h3>
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
        )}
      </ModalScrollBody>
    </AnimatedModal>
  )
}

function mapDisplayShort(mapId: string): string {
  const parts = mapId.split('_')
  return parts[parts.length - 1] ?? mapId
}
