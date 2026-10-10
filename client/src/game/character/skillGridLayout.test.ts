import assert from 'node:assert/strict'
import { skillsForJob } from './skillsConfig'
import { computeSkillGridLayout, SKILL_GRID_COLS, SKILL_GRID_MIN_ROWS } from './skillGridLayout'

const archer = skillsForJob('archer')
const grid = computeSkillGridLayout(archer)

assert.equal(grid.columns, SKILL_GRID_COLS)
assert.ok(grid.rows >= SKILL_GRID_MIN_ROWS)
assert.equal(grid.cells.length, grid.rows)
assert.equal(grid.cells[0]?.length, SKILL_GRID_COLS)

let placed = 0
for (const row of grid.cells) {
  for (const cell of row) {
    if (cell) placed++
  }
}
assert.equal(placed, archer.length, 'every archer skill appears once in the grid')

const empty = computeSkillGridLayout([])
assert.equal(empty.rows, SKILL_GRID_MIN_ROWS)
assert.ok(empty.cells.every((row) => row.every((c) => c === null)))

console.log('skillGridLayout.test.ts: ok')
