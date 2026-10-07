import type { SkillDefinition } from './skillsConfig'

export type SkillTreeEdge = { from: string; to: string }
export type SkillTreePosition = { col: number; row: number }

export type SkillTreeLayout = {
  mode: 'tree'
  positions: Record<string, SkillTreePosition>
  edges: SkillTreeEdge[]
  columns: number
  rows: number
}

export function hasIntraJobPrereqEdges(skills: SkillDefinition[]): boolean {
  const ids = new Set(skills.map((s) => s.id))
  for (const skill of skills) {
    for (const pre of skill.prerequisites) {
      if (ids.has(pre.skillId)) return true
    }
  }
  return false
}

function depthForSkill(
  skillId: string,
  byId: Map<string, SkillDefinition>,
  jobSkillIds: Set<string>,
  memo: Map<string, number>,
): number {
  const cached = memo.get(skillId)
  if (cached != null) return cached
  const skill = byId.get(skillId)
  if (!skill) {
    memo.set(skillId, 0)
    return 0
  }
  let maxPre = -1
  for (const pre of skill.prerequisites) {
    if (jobSkillIds.has(pre.skillId)) {
      maxPre = Math.max(maxPre, depthForSkill(pre.skillId, byId, jobSkillIds, memo))
    }
  }
  const d = maxPre + 1
  memo.set(skillId, d)
  return d
}

type SubtreeLayout = {
  colById: Record<string, number>
  span: number
}

/** Assign horizontal columns so children sit under their parent (forest layout). */
function layoutSubtree(rootId: string, childrenOf: Map<string, string[]>): SubtreeLayout {
  const kids = childrenOf.get(rootId) ?? []
  if (kids.length === 0) {
    return { colById: { [rootId]: 0 }, span: 1 }
  }

  let offset = 0
  const colById: Record<string, number> = {}
  const childCols: number[] = []

  for (const kid of kids) {
    const sub = layoutSubtree(kid, childrenOf)
    for (const [nid, c] of Object.entries(sub.colById)) {
      colById[nid] = c + offset
    }
    childCols.push(offset + (sub.colById[kid] ?? 0))
    offset += sub.span + 1
  }

  const parentCol = (childCols[0]! + childCols[childCols.length - 1]!) / 2
  colById[rootId] = parentCol
  const span = Math.max(offset - 1, 1)
  return { colById, span }
}

export function computeSkillTreeLayout(skills: SkillDefinition[]): SkillTreeLayout {
  if (skills.length === 0) {
    return { mode: 'tree', positions: {}, edges: [], columns: 0, rows: 0 }
  }

  const jobSkillIds = new Set(skills.map((s) => s.id))
  const byId = new Map(skills.map((s) => [s.id, s]))
  const depthMemo = new Map<string, number>()

  const childrenOf = new Map<string, string[]>()
  for (const id of jobSkillIds) childrenOf.set(id, [])
  for (const skill of skills) {
    for (const pre of skill.prerequisites) {
      if (jobSkillIds.has(pre.skillId)) {
        childrenOf.get(pre.skillId)!.push(skill.id)
      }
    }
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => {
      const na = byId.get(a)?.name ?? a
      const nb = byId.get(b)?.name ?? b
      return na.localeCompare(nb) || a.localeCompare(b)
    })
  }

  const roots = skills
    .filter((s) => !s.prerequisites.some((p) => jobSkillIds.has(p.skillId)))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))

  const positions: Record<string, SkillTreePosition> = {}
  let forestOffset = 0
  for (const root of roots) {
    const sub = layoutSubtree(root.id, childrenOf)
    for (const [id, col] of Object.entries(sub.colById)) {
      positions[id] = {
        col: col + forestOffset,
        row: depthForSkill(id, byId, jobSkillIds, depthMemo),
      }
    }
    forestOffset += sub.span + 1
  }

  let minCol = 0
  let maxCol = 0
  let maxRow = 0
  for (const pos of Object.values(positions)) {
    minCol = Math.min(minCol, pos.col)
    maxCol = Math.max(maxCol, pos.col)
    maxRow = Math.max(maxRow, pos.row)
  }
  for (const pos of Object.values(positions)) {
    pos.col -= minCol
  }
  maxCol -= minCol

  const edges: SkillTreeEdge[] = []
  for (const skill of skills) {
    for (const pre of skill.prerequisites) {
      if (jobSkillIds.has(pre.skillId)) {
        edges.push({ from: pre.skillId, to: skill.id })
      }
    }
  }

  return {
    mode: 'tree',
    positions,
    edges,
    columns: maxCol + 1,
    rows: maxRow + 1,
  }
}

/** Pixel layout constants for the skills tree viewport. */
export const SKILL_TREE_CELL_W = 80
export const SKILL_TREE_CELL_H = 100
export const SKILL_TREE_COL_GAP = 20
export const SKILL_TREE_ROW_GAP = 52
export const SKILL_TREE_PAD = 20

export function skillTreeNodeCenter(
  pos: SkillTreePosition,
): { x: number; y: number; top: number; bottom: number } {
  const x =
    SKILL_TREE_PAD + pos.col * (SKILL_TREE_CELL_W + SKILL_TREE_COL_GAP) + SKILL_TREE_CELL_W / 2
  const top = SKILL_TREE_PAD + pos.row * (SKILL_TREE_CELL_H + SKILL_TREE_ROW_GAP)
  const bottom = top + SKILL_TREE_CELL_H
  return { x, y: top + SKILL_TREE_CELL_H / 2, top, bottom }
}

export function skillTreeEdgePath(
  from: { x: number; top: number; bottom: number },
  to: { x: number; top: number; bottom: number },
): string {
  const y1 = from.bottom - 6
  const y2 = to.top + 6
  const midY = (y1 + y2) / 2
  return `M ${from.x} ${y1} V ${midY} H ${to.x} V ${y2}`
}

export function skillTreeContentSize(layout: SkillTreeLayout): { width: number; height: number } {
  const cols = layout.columns || 1
  const rows = layout.rows || 1
  return {
    width: SKILL_TREE_PAD * 2 + cols * SKILL_TREE_CELL_W + (cols - 1) * SKILL_TREE_COL_GAP,
    height: SKILL_TREE_PAD * 2 + rows * SKILL_TREE_CELL_H + (rows - 1) * SKILL_TREE_ROW_GAP,
  }
}
