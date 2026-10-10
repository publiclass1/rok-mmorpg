import type { SkillDefinition } from './skillsConfig'
import { computeSkillTreeLayout } from './skillTreeLayout'

export const SKILL_GRID_COLS = 7
export const SKILL_GRID_MIN_ROWS = 6

export type SkillGridLayout = {
  columns: number
  rows: number
  /** Row-major grid; each cell is a skill or empty. */
  cells: (SkillDefinition | null)[][] 
}

function emptyGrid(rows: number, cols: number): (SkillDefinition | null)[][] {
  return Array.from({ length: rows }, () => Array<SkillDefinition | null>(cols).fill(null))
}

function cellKey(row: number, col: number): string {
  return `${row},${col}`
}

/**
 * Maps the prerequisite tree into a fixed-width RO-style grid (empty slots where no skill).
 */
export function computeSkillGridLayout(
  skills: SkillDefinition[],
  gridCols = SKILL_GRID_COLS,
  minRows = SKILL_GRID_MIN_ROWS,
): SkillGridLayout {
  if (skills.length === 0) {
    return { columns: gridCols, rows: minRows, cells: emptyGrid(minRows, gridCols) }
  }

  const tree = computeSkillTreeLayout(skills)
  let maxCol = 0
  let maxRow = 0
  for (const pos of Object.values(tree.positions)) {
    maxCol = Math.max(maxCol, pos.col)
    maxRow = Math.max(maxRow, pos.row)
  }

  const mapCol = (col: number): number => {
    if (maxCol <= 0) return Math.floor(gridCols / 2)
    return Math.round((col / maxCol) * (gridCols - 1))
  }

  const placements: { skill: SkillDefinition; col: number; row: number }[] = []
  for (const skill of skills) {
    const pos = tree.positions[skill.id]
    if (!pos) continue
    placements.push({ skill, col: mapCol(pos.col), row: pos.row })
  }

  placements.sort(
    (a, b) => a.row - b.row || a.col - b.col || a.skill.name.localeCompare(b.skill.name),
  )

  let rows = Math.max(minRows, maxRow + 1)
  const cells = emptyGrid(rows, gridCols)
  const occupied = new Set<string>()

  for (const p of placements) {
    let r = p.row
    let c = p.col
    while (r < cells.length && occupied.has(cellKey(r, c))) {
      c++
      if (c >= gridCols) {
        c = 0
        r++
      }
    }
    if (r >= cells.length) {
      while (r >= cells.length) {
        cells.push(Array<SkillDefinition | null>(gridCols).fill(null))
      }
      rows = cells.length
    }
    cells[r][c] = p.skill
    occupied.add(cellKey(r, c))
  }

  return { columns: gridCols, rows: cells.length, cells }
}
