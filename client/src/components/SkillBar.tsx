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
import { SKILLS, skillUsableByJob } from '../game/character/skillsConfig'
import { skillTooltipTitle } from '../game/character/skillIconUrl'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { useModalDrag } from './motion/useModalDrag'

const SKILL_BAR_MARGIN = 10
const SKILL_BAR_ABOVE_EXP = 76

type Props = {
  sheet: CharacterSheetPayload
  onOpenSkills: () => void
}

function skillBarInitialPosition(panel: HTMLElement) {
  const w = panel.offsetWidth
  const h = panel.offsetHeight
  return {
    x: Math.max(SKILL_BAR_MARGIN, window.innerWidth - w - SKILL_BAR_MARGIN),
    y: Math.max(SKILL_BAR_MARGIN, window.innerHeight - h - SKILL_BAR_ABOVE_EXP),
  }
}

export function SkillBar({ sheet, onOpenSkills }: Props) {
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const suppressClickRef = useRef(false)
  const dragSourceSlotRef = useRef<number | null>(null)
  const dropHandledRef = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { pos, isDragging } = useModalDrag(panelRef, true, skillBarInitialPosition)

  function handleDrop(slot: number, e: React.DragEvent) {
    e.preventDefault()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload) return
    if (payload.source === 'autoRotation') return

    if (payload.source === 'list') {
      if (!canPlaceOnSkillBar(payload.skillId, sheet.jobId, sheet.skills)) return
      dispatchCharacterAction({ type: 'assignSkillBar', slot, skillId: payload.skillId })
      return
    }

    if (payload.source === 'inventory') {
      if (!canPlaceOnSkillBar(payload.itemId, sheet.jobId, sheet.skills)) return
      dispatchCharacterAction({ type: 'assignSkillBar', slot, skillId: payload.itemId })
      return
    }

    if (payload.source === 'bar' && payload.slot !== slot) {
      dispatchCharacterAction({ type: 'moveSkillBar', from: payload.slot, to: slot })
    }
  }

  function handleBarGutterDrop(e: React.DragEvent) {
    e.preventDefault()
    dropHandledRef.current = true
    setDropTarget(null)
    const payload = readSkillBarDrag(e.dataTransfer)
    if (!payload || payload.source !== 'bar') return
    dispatchCharacterAction({ type: 'assignSkillBar', slot: payload.slot, skillId: null })
  }

  function clearBarDragSourceIfNeeded() {
    const from = dragSourceSlotRef.current
    dragSourceSlotRef.current = null
    if (from == null || dropHandledRef.current) return
    dispatchCharacterAction({ type: 'assignSkillBar', slot: from, skillId: null })
  }

  function activateSlot(index: number, skillId: string | null, inactive: boolean) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (inactive) return
    if (skillId == null) {
      onOpenSkills()
      return
    }
    emitGameEvent('useSkillSlot', { slot: index })
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
        className="skill-bar"
        role="toolbar"
        aria-label="Skill bar"
        onDragOver={(e) => {
          if (!isSkillBarDragEvent(e.dataTransfer)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={handleBarGutterDrop}
      >
        {sheet.skillBar.map((skillId, index) => {
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
          const isDropTarget = dropTarget === index
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
              key={index}
              role="button"
              tabIndex={inactive ? -1 : 0}
              aria-disabled={inactive || undefined}
              className={`skill-slot${inactive ? ' skill-slot--inactive' : ''}${isDropTarget ? ' skill-slot--drop-target' : ''}${canDrag ? ' skill-slot--draggable' : ''}`}
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
                dragSourceSlotRef.current = index
                writeSkillBarDrag(e.dataTransfer, { source: 'bar', skillId, slot: index })
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
                setDropTarget(index)
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === index ? null : current))
              }}
              onDrop={(e) => {
                e.stopPropagation()
                handleDrop(index, e)
              }}
              onClick={() => activateSlot(index, skillId, inactive)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                activateSlot(index, skillId, inactive)
              }}
            >
              <span className="skill-key">{index + 1}</span>
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
    </div>
  )
}
