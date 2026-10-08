import { useCallback, useEffect, useRef, useState } from 'react'
import { ItemIcon } from './ItemIcon'
import { SkillIcon } from './SkillIcon'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { getItemDisplayName } from '../game/character/itemCatalog'
import {
  canPlaceOnSkillBar,
  isSkillBarConsumable,
  sessionItemQuantity,
} from '../game/character/skillBarEntry'
import {
  readSkillBarRowsVisible,
  SKILL_BAR_ROW_LABELS,
  writeSkillBarRowsVisible,
} from '../game/character/skillBarRowVisibility'
import { isSkillBarDragEvent, readSkillBarDrag, writeSkillBarDrag } from '../game/character/skillBarDrag'
import { SKILL_BAR_ROW_COUNT, SKILL_BAR_ROW_KEYS } from '../game/character/skillBars'
import { SKILLS, skillUsableByJob } from '../game/character/skillsConfig'
import { skillTooltipTitle } from '../game/character/skillIconUrl'
import type { CharacterSheetPayload } from '../game/events'
import { emitGameEvent } from '../game/events'
import { ModalCloseButton } from './motion/ModalCloseButton'
import { useModalDrag } from './motion/useModalDrag'

const SKILL_BAR_MARGIN = 10
const SKILL_BAR_ABOVE_EXP = 118
const ROW_PANEL_STACK_OFFSET = 52

type Props = {
  sheet: CharacterSheetPayload
  onOpenSkills: () => void
  rowsVisible: boolean[]
  onRowsVisibleChange: (visible: boolean[]) => void
}

type BarSlotRef = { bar: number; slot: number }

function skillBarRowInitialPosition(panel: HTMLElement, barIndex: number) {
  const w = panel.offsetWidth
  const h = panel.offsetHeight
  return {
    x: Math.max(SKILL_BAR_MARGIN, window.innerWidth - w - SKILL_BAR_MARGIN),
    y: Math.max(
      SKILL_BAR_MARGIN,
      window.innerHeight - h - SKILL_BAR_ABOVE_EXP - barIndex * ROW_PANEL_STACK_OFFSET,
    ),
  }
}

type SkillBarRowPanelProps = {
  bar: number
  sheet: CharacterSheetPayload
  onOpenSkills: () => void
  onClose: () => void
  dropTarget: BarSlotRef | null
  setDropTarget: (ref: BarSlotRef | null) => void
  dragSourceRef: React.MutableRefObject<BarSlotRef | null>
  dropHandledRef: React.MutableRefObject<boolean>
  suppressClickRef: React.MutableRefObject<boolean>
}

function SkillBarRowPanel({
  bar,
  sheet,
  onOpenSkills,
  onClose,
  dropTarget,
  setDropTarget,
  dragSourceRef,
  dropHandledRef,
  suppressClickRef,
}: SkillBarRowPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { pos, isDragging } = useModalDrag(panelRef, true, (el) =>
    skillBarRowInitialPosition(el, bar),
  )

  function handleDrop(slot: number, e: React.DragEvent) {
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

    if (payload.source === 'bar') {
      if (payload.bar === bar && payload.slot === slot) return
      if (!canPlaceOnSkillBar(payload.skillId, sheet.jobId, sheet.skills)) return
      if (payload.bar !== bar) {
        dispatchCharacterAction({ type: 'assignSkillBar', bar, slot, skillId: payload.skillId })
        return
      }
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
    if (!payload || payload.source !== 'bar' || payload.bar !== bar) return
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

  function activateSlot(slot: number, skillId: string | null, inactive: boolean) {
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

  function isDropTarget(slot: number) {
    return dropTarget?.bar === bar && dropTarget?.slot === slot
  }

  return (
    <div
      ref={panelRef}
      className={`skill-bar-panel skill-bar-panel--row${isDragging ? ' modal-panel--dragging' : ''}`}
      style={
        pos
          ? { position: 'fixed', left: pos.x, top: pos.y, margin: 0, visibility: 'visible' }
          : { position: 'fixed', left: 0, top: 0, margin: 0, visibility: 'hidden' }
      }
    >
      <div className="skill-bar-panel-header">
        <div
          className="skill-bar-drag-handle modal-drag-handle"
          title="Drag to move skill bar"
          aria-hidden
        >
          ⋮⋮
        </div>
        <span className="skill-bar-panel-title">{SKILL_BAR_ROW_LABELS[bar]}</span>
        <ModalCloseButton onClose={onClose} label={`Close skill bar ${SKILL_BAR_ROW_LABELS[bar]}`} />
      </div>
      <div
        className="skill-bar"
        role="toolbar"
        aria-label={`Skill bar ${SKILL_BAR_ROW_LABELS[bar]}`}
        onDragOver={(e) => {
          if (!isSkillBarDragEvent(e.dataTransfer)) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={handleBarGutterDrop}
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
              className={`skill-slot${inactive ? ' skill-slot--inactive' : ''}${isDropTarget(slot) ? ' skill-slot--drop-target' : ''}${canDrag ? ' skill-slot--draggable' : ''}`}
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
                e.dataTransfer.dropEffect = 'copy'
                setDropTarget({ bar, slot })
              }}
              onDragLeave={() => {
                setDropTarget((current) =>
                  current?.bar === bar && current?.slot === slot ? null : current,
                )
              }}
              onDrop={(e) => {
                e.stopPropagation()
                handleDrop(slot, e)
              }}
              onClick={() => activateSlot(slot, skillId, inactive)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return
                e.preventDefault()
                activateSlot(slot, skillId, inactive)
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
    </div>
  )
}

export function SkillBar({ sheet, onOpenSkills, rowsVisible, onRowsVisibleChange }: Props) {
  const [dropTarget, setDropTarget] = useState<BarSlotRef | null>(null)
  const suppressClickRef = useRef(false)
  const dragSourceRef = useRef<BarSlotRef | null>(null)
  const dropHandledRef = useRef(false)

  const closeRow = useCallback(
    (bar: number) => {
      const next = [...rowsVisible]
      next[bar] = false
      onRowsVisibleChange(next)
      writeSkillBarRowsVisible(next)
    },
    [rowsVisible, onRowsVisibleChange],
  )

  return (
    <>
      {Array.from({ length: SKILL_BAR_ROW_COUNT }, (_, bar) =>
        rowsVisible[bar] ? (
          <SkillBarRowPanel
            key={bar}
            bar={bar}
            sheet={sheet}
            onOpenSkills={onOpenSkills}
            onClose={() => closeRow(bar)}
            dropTarget={dropTarget}
            setDropTarget={setDropTarget}
            dragSourceRef={dragSourceRef}
            dropHandledRef={dropHandledRef}
            suppressClickRef={suppressClickRef}
          />
        ) : null,
      )}
    </>
  )
}

export function useSkillBarRowsVisible(): [boolean[], (visible: boolean[]) => void] {
  const [rowsVisible, setRowsVisible] = useState(readSkillBarRowsVisible)
  useEffect(() => {
    writeSkillBarRowsVisible(rowsVisible)
  }, [rowsVisible])
  return [rowsVisible, setRowsVisible]
}
