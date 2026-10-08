import { useRef, useState } from 'react'
import { ItemIcon } from './ItemIcon'
import { SkillIcon } from './SkillIcon'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { getItemDisplayName } from '../game/character/itemCatalog'
import {
  canPlaceOnSkillBar,
  isSkillBarConsumable,
  sessionItemQuantity,
} from '../game/character/skillBarEntry'
import { isSkillBarDragEvent, readSkillBarDrag, writeSkillBarDrag } from '../game/character/skillBarDrag'
import { SKILL_BAR_ROW_COUNT, SKILL_BAR_ROW_KEYS } from '../game/character/skillBars'
import { SKILLS, skillUsableByJob } from '../game/character/skillsConfig'
import { skillTooltipTitle } from '../game/character/skillIconUrl'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { useModalDrag } from './motion/useModalDrag'

const SKILL_BAR_MARGIN = 10
const SKILL_BAR_ABOVE_EXP = 118

type Props = {
  sheet: CharacterSheetPayload
  onOpenSkills: () => void
}

type BarSlotRef = { bar: number; slot: number }

function skillBarInitialPosition(panel: HTMLElement) {
  const w = panel.offsetWidth
  const h = panel.offsetHeight
  return {
    x: Math.max(SKILL_BAR_MARGIN, window.innerWidth - w - SKILL_BAR_MARGIN),
    y: Math.max(SKILL_BAR_MARGIN, window.innerHeight - h - SKILL_BAR_ABOVE_EXP),
  }
}

export function SkillBar({ sheet, onOpenSkills }: Props) {
  const [dropTarget, setDropTarget] = useState<BarSlotRef | null>(null)
  const suppressClickRef = useRef(false)
  const dragSourceRef = useRef<BarSlotRef | null>(null)
  const dropHandledRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { pos, isDragging } = useModalDrag(panelRef, true, skillBarInitialPosition)

  function handleDrop(bar: number, slot: number, e: React.DragEvent) {
    e.preventDefault()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload) return
    if (payload.source === 'autoRotation') return

    if (payload.source === 'list') {
      if (!canPlaceOnSkillBar(payload.skillId, sheet.jobId, sheet.skills)) return
      dispatchCharacterAction({ type: 'assignSkillBar', bar, slot, skillId: payload.skillId })
      return
    }

    if (payload.source === 'inventory') {
      if (!canPlaceOnSkillBar(payload.itemId, sheet.jobId, sheet.skills)) return
      dispatchCharacterAction({ type: 'assignSkillBar', bar, slot, skillId: payload.itemId })
      return
    }

    if (payload.source === 'bar' && (payload.bar !== bar || payload.slot !== slot)) {
      dispatchCharacterAction({
        type: 'moveSkillBar',
        fromBar: payload.bar,
        fromSlot: payload.slot,
        toBar: bar,
        toSlot: slot,
      })
    }
  }

  function handleBarGutterDrop(e: React.DragEvent) {
    e.preventDefault()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload || payload.source !== 'bar') return
    dispatchCharacterAction({
      type: 'assignSkillBar',
      bar: payload.bar,
      slot: payload.slot,
      skillId: null,
    })
  }

  function clearBarDragSourceIfNeeded() {
    const from = dragSourceRef.current
    dragSourceRef.current = null
    if (from == null || dropHandledRef.current) return
    dispatchCharacterAction({
      type: 'assignSkillBar',
      bar: from.bar,
      slot: from.slot,
      skillId: null,
    })
  }

  function activateSlot(bar: number, slot: number, skillId: string | null, inactive: boolean) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (inactive) return
    if (skillId == null) {
      onOpenSkills()
      return
    }
    emitGameEvent('useSkillSlot', { bar, slot })
  }

  function isDropTarget(bar: number, slot: number) {
    return dropTarget?.bar === bar && dropTarget?.slot === slot
  }

  return (
    <div
      ref={panelRef}
      className={`skill-bar-panel${isDragging ? ' modal-panel--dragging' : ''}`}
      style={
        pos
          ? { position: 'fixed', left: pos.x, top: pos.y, margin: 0, visibility: 'visible' }
          : { position: 'fixed', left: 0, top: 0, margin: 0, visibility: 'hidden' }
      }
    >
      <div
        className="skill-bar-drag-handle modal-drag-handle"
        title="Drag to move skill bar"
        aria-hidden
      >
        ⋮⋮
      </div>
      <div
        className="skill-bars-stack"
        onDragOver={(e) => {
          if (!isSkillBarDragEvent(e.dataTransfer)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={handleBarGutterDrop}
      >
        {Array.from({ length: SKILL_BAR_ROW_COUNT }, (_, bar) => (
          <div
            key={bar}
            className="skill-bar"
            role="toolbar"
            aria-label={`Skill bar row ${bar + 1}`}
          >
            {sheet.skillBars[bar].map((skillId, slot) => {
              const consumable = skillId != null && isSkillBarConsumable(skillId)
              const skill = skillId && !consumable ? SKILLS[skillId] : null
              const level = skillId && !consumable ? sheet.skills[skillId] ?? 0 : 0
              const allowed =
                !skillId ||
                consumable ||
                (skillId === 'basic_attack' && level >= 1) ||
                (skill != null && skillUsableByJob(skillId, sheet.jobId) && level >= 1)
              const inactive = skillId != null && !allowed
              const canDrag = skillId != null && !inactive
              const keyLabel = SKILL_BAR_ROW_KEYS[bar][slot]
              const itemQty = consumable && skillId ? sessionItemQuantity(sheet, skillId) : 0
              const slotTitle = consumable && skillId
                ? `${getItemDisplayName(skillId)} (${itemQty}) · drag to move`
                : skill
                  ? inactive
                    ? `${skill.name} — not available`
                    : `${skillTooltipTitle(skillId!, level)} · drag to move`
                  : 'Click to open Skills · or drop a skill or consumable here'

              return (
                <div
                  key={slot}
                  role="button"
                  tabIndex={inactive ? -1 : 0}
                  aria-disabled={inactive || undefined}
                  className={`skill-slot${inactive ? ' skill-slot--inactive' : ''}${isDropTarget(bar, slot) ? ' skill-slot--drop-target' : ''}${canDrag ? ' skill-slot--draggable' : ''}`}
                  title={slotTitle}
                  draggable={canDrag}
                  onDragStart={(e) => {
                    if (!canDrag || !skillId) {
                      e.preventDefault()
                      return
                    }
                    e.stopPropagation()
                    suppressClickRef.current = false
                    dropHandledRef.current = false
                    dragSourceRef.current = { bar, slot }
                    writeSkillBarDrag(e.dataTransfer, { source: 'bar', skillId, bar, slot })
                  }}
                  onDrag={(e) => {
                    if (e.clientX !== 0 || e.clientY !== 0) suppressClickRef.current = true
                  }}
                  onDragEnd={() => {
                    setDropTarget(null)
                    clearBarDragSourceIfNeeded()
                  }}
                  onDragOver={(e) => {
                    if (!isSkillBarDragEvent(e.dataTransfer)) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDropTarget({ bar, slot })
                  }}
                  onDragLeave={() => {
                    setDropTarget((current) =>
                      current?.bar === bar && current?.slot === slot ? null : current,
                    )
                  }}
                  onDrop={(e) => {
                    e.stopPropagation()
                    handleDrop(bar, slot, e)
                  }}
                  onClick={() => activateSlot(bar, slot, skillId, inactive)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return
                    e.preventDefault()
                    activateSlot(bar, slot, skillId, inactive)
                  }}
                >
                  <span className="skill-key">{keyLabel}</span>
                  {skillId && !inactive && consumable ? (
                    <>
                      <ItemIcon itemId={skillId} size={28} alt="" />
                      {itemQty > 1 && <span className="skill-slot-item-qty">{itemQty}</span>}
                    </>
                  ) : skillId && !inactive ? (
                    <SkillIcon skillId={skillId} level={level} size="xs" draggable={false} />
                  ) : (
                    <span className="skill-slot-empty" aria-hidden>
                      ·
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
