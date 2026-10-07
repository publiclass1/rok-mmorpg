import type { MinimapWorldRect } from '../world/minimapTypes'

const SQRT2 = Math.SQRT2

export function buildWalkabilityGrid(
  tilesWide: number,
  tilesHigh: number,
  isTileBlocked: (tx: number, ty: number) => boolean,
  obstacleRects: MinimapWorldRect[],
  tileW: number,
  tileH: number,
): Uint8Array {
  const grid = new Uint8Array(tilesWide * tilesHigh)
  for (let ty = 0; ty < tilesHigh; ty++) {
    for (let tx = 0; tx < tilesWide; tx++) {
      if (isTileBlocked(tx, ty)) grid[cellIndex(tx, ty, tilesWide)] = 1
    }
  }
  for (const rect of obstacleRects) {
    const tx0 = Math.max(0, Math.floor(rect.x / tileW))
    const ty0 = Math.max(0, Math.floor(rect.y / tileH))
    const tx1 = Math.min(tilesWide - 1, Math.floor((rect.x + rect.width) / tileW))
    const ty1 = Math.min(tilesHigh - 1, Math.floor((rect.y + rect.height) / tileH))
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        grid[cellIndex(tx, ty, tilesWide)] = 1
      }
    }
  }
  return grid
}

function cellIndex(tx: number, ty: number, width: number): number {
  return ty * width + tx
}

function isWalkable(grid: Uint8Array, width: number, height: number, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false
  return grid[cellIndex(tx, ty, width)] === 0
}

function worldToTile(wx: number, wy: number, tileW: number, tileH: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(wx / tileW),
    ty: Math.floor(wy / tileH),
  }
}

function tileCenter(tx: number, ty: number, tileW: number, tileH: number): { x: number; y: number } {
  return { x: tx * tileW + tileW / 2, y: ty * tileH + tileH / 2 }
}

function findNearestWalkableCell(
  grid: Uint8Array,
  width: number,
  height: number,
  tx: number,
  ty: number,
): { tx: number; ty: number } | null {
  if (isWalkable(grid, width, height, tx, ty)) return { tx, ty }

  const maxRadius = Math.max(width, height)
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const nx = tx + dx
        const ny = ty + dy
        if (isWalkable(grid, width, height, nx, ny)) return { tx: nx, ty: ny }
      }
    }
  }
  return null
}

type AStarNode = {
  tx: number
  ty: number
  g: number
  f: number
}

function canStep(
  grid: Uint8Array,
  width: number,
  height: number,
  fromTx: number,
  fromTy: number,
  toTx: number,
  toTy: number,
): boolean {
  if (!isWalkable(grid, width, height, toTx, toTy)) return false
  if (fromTx === toTx || fromTy === toTy) return true
  return (
    isWalkable(grid, width, height, fromTx, toTy) && isWalkable(grid, width, height, toTx, fromTy)
  )
}

function findCellPath(
  grid: Uint8Array,
  width: number,
  height: number,
  startTx: number,
  startTy: number,
  goalTx: number,
  goalTy: number,
): Array<{ tx: number; ty: number }> | null {
  const start = findNearestWalkableCell(grid, width, height, startTx, startTy)
  const goal = findNearestWalkableCell(grid, width, height, goalTx, goalTy)
  if (!start || !goal) return null
  if (start.tx === goal.tx && start.ty === goal.ty) return [goal]

  const open: AStarNode[] = [{ tx: start.tx, ty: start.ty, g: 0, f: 0 }]
  const gScore = new Map<string, number>()
  const cameFrom = new Map<string, string>()
  const key = (tx: number, ty: number) => `${tx},${ty}`
  gScore.set(key(start.tx, start.ty), 0)

  const neighbors = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f)
    const current = open.shift()!
    const ck = key(current.tx, current.ty)
    if (current.tx === goal.tx && current.ty === goal.ty) {
      const path: Array<{ tx: number; ty: number }> = []
      let cur: string | undefined = ck
      while (cur) {
        const [sx, sy] = cur.split(',').map(Number)
        path.push({ tx: sx, ty: sy })
        cur = cameFrom.get(cur)
      }
      path.reverse()
      return path
    }

    for (const [dx, dy] of neighbors) {
      const nx = current.tx + dx
      const ny = current.ty + dy
      if (!canStep(grid, width, height, current.tx, current.ty, nx, ny)) continue

      const stepCost = dx !== 0 && dy !== 0 ? SQRT2 : 1
      const tentative = current.g + stepCost
      const nk = key(nx, ny)
      const prev = gScore.get(nk)
      if (prev !== undefined && tentative >= prev) continue

      cameFrom.set(nk, ck)
      gScore.set(nk, tentative)
      const h =
        Math.abs(nx - goal.tx) +
        Math.abs(ny - goal.ty) +
        (SQRT2 - 2) * Math.min(Math.abs(nx - goal.tx), Math.abs(ny - goal.ty))
      open.push({ tx: nx, ty: ny, g: tentative, f: tentative + h })
    }
  }

  return null
}

/** Grid path in world coordinates (tile centers), ending at the requested destination. */
export function findWorldPath(
  grid: Uint8Array,
  tilesWide: number,
  tilesHigh: number,
  tileW: number,
  tileH: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): { x: number; y: number }[] | null {
  const start = worldToTile(fromX, fromY, tileW, tileH)
  const goal = worldToTile(toX, toY, tileW, tileH)
  const cells = findCellPath(grid, tilesWide, tilesHigh, start.tx, start.ty, goal.tx, goal.ty)
  if (!cells || cells.length === 0) return null

  const waypoints = cells.map((c) => tileCenter(c.tx, c.ty, tileW, tileH))
  const last = waypoints[waypoints.length - 1]
  const distToClick = Math.hypot(last.x - toX, last.y - toY)
  if (distToClick > 4) {
    waypoints.push({ x: toX, y: toY })
  } else {
    last.x = toX
    last.y = toY
  }
  return waypoints
}

export type PathPoint = { x: number; y: number }

export type TrimPathFromPlayerOptions = {
  nearThreshold?: number
}

/** Drop waypoints the player has already passed or is standing on (avoids backtracking on repath). */
export function trimPathFromPlayer(
  path: PathPoint[],
  px: number,
  py: number,
  options?: TrimPathFromPlayerOptions,
): PathPoint[] {
  if (path.length === 0) return []

  const nearThreshold = options?.nearThreshold ?? 10
  const goal = path[path.length - 1]
  let start = 0

  while (start < path.length - 1) {
    const wp = path[start]
    if (Math.hypot(wp.x - px, wp.y - py) >= nearThreshold) break
    start += 1
  }

  const toGoalX = goal.x - px
  const toGoalY = goal.y - py
  const goalLen = Math.hypot(toGoalX, toGoalY)
  if (goalLen > 0.01) {
    while (start < path.length - 1) {
      const wp = path[start]
      const dot = (wp.x - px) * toGoalX + (wp.y - py) * toGoalY
      if (dot > 0) break
      start += 1
    }
  }

  return path.slice(start)
}
