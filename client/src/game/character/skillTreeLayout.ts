import type { SkillDefinition } from './skillsConfig'

export type SkillTreeEdge = { from: string; to: string }
export type SkillTreePosition = { col: number; row: number }

export type SkillTreeLayout = {
  mode: 'tree' | 'grid'
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

export function computeSkillTreeLayout(skills: SkillDefinition[]): SkillTreeLayout {
  if (skills.length === 0) {
    return { mode: 'grid', positions: {}, edges: [], columns: 0, rows: 0 }
  }

  const sorted = [...skills].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )

  if (!hasIntraJobPrereqEdges(skills)) {
    const positions: Record<string, SkillTreePosition> = {}
    const cols = Math.min(2, sorted.length)
    sorted.forEach((s, i) => {
      positions[s.id] = { col: i % cols, row: Math.floor(i / cols) }
    })
    return {
      mode: 'grid',
      positions,
      edges: [],
      columns: cols,
      rows: Math.ceil(sorted.length / cols) || 1,
    }
  }

  const jobSkillIds = new Set(skills.map((s) => s.id))
  const byId = new Map(skills.map((s) => [s.id, s]))
  const depthMemo = new Map<string, number>()
  const rowBuckets = new Map<number, SkillDefinition[]>()
  let maxRow = 0
  let maxCol = 0

  for (const skill of skills) {
    const row = depthForSkill(skill.id, byId, jobSkillIds, depthMemo)
    maxRow = Math.max(maxRow, row)
    const list = rowBuckets.get(row) ?? []
    list.push(skill)
    rowBuckets.set(row, list)
  }

  for (const list of rowBuckets.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
  }

  const positions: Record<string, SkillTreePosition> = {}
  for (let row = 0; row <= maxRow; row++) {
    const list = rowBuckets.get(row) ?? []
    list.forEach((skill, col) => {
      positions[skill.id] = { col, row }
      maxCol = Math.max(maxCol, col)
    })
  }

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
export const SKILL_TREE_CELL_W = 88
export const SKILL_TREE_CELL_H = 108
export const SKILL_TREE_COL_GAP = 28
export const SKILL_TREE_ROW_GAP = 44
export const SKILL_TREE_PAD = 16

export function skillTreeNodeCenter(
  pos: SkillTreePosition,
): { x: number; y: number; top: number; bottom: number } {
  const x =
    SKILL_TREE_PAD + pos.col * (SKILL_TREE_CELL_W + SKILL_TREE_COL_GAP) + SKILL_TREE_CELL_W / 2
  const top = SKILL_TREE_PAD + pos.row * (SKILL_TREE_CELL_H + SKILL_TREE_ROW_GAP)
  const bottom = top + SKILL_TREE_CELL_H
  return { x, y: top + SKILL_TREE_CELL_H / 2, top, bottom }
}

export function skillTreeContentSize(layout: SkillTreeLayout): { width: number; height: number } {
  if (layout.mode === 'grid' || layout.rows === 0) {
    const n = Object.keys(layout.positions).length
    const cols = layout.columns || Math.min(2, n) || 1
    const rows = layout.rows || Math.ceil(n / cols) || 1
    return {
      width: SKILL_TREE_PAD * 2 + cols * SKILL_TREE_CELL_W + (cols - 1) * SKILL_TREE_COL_GAP,
      height: SKILL_TREE_PAD * 2 + rows * SKILL_TREE_CELL_H + (rows - 1) * SKILL_TREE_ROW_GAP,
    }
  }
  const cols = layout.columns || 1
  const rows = layout.rows || 1
  return {
    width: SKILL_TREE_PAD * 2 + cols * SKILL_TREE_CELL_W + (cols - 1) * SKILL_TREE_COL_GAP,
    height: SKILL_TREE_PAD * 2 + rows * SKILL_TREE_CELL_H + (rows - 1) * SKILL_TREE_ROW_GAP,
  }
}
