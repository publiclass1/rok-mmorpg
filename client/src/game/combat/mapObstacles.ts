import Phaser from 'phaser'
import { attachToWorldRoot } from '../world/worldViewRootAttach'
import type { MinimapWorldRect } from '../world/minimapTypes'

export type ObstacleDef = { x: number; y: number; width: number; height: number }

/** Top-left world rects for minimap / shared spawn source. */
export function obstacleRectsForMap(
  mapId: string,
  tilemap?: Phaser.Tilemaps.Tilemap,
): MinimapWorldRect[] {
  const layer = tilemap?.getObjectLayer('obstacles')
  if (layer?.objects?.length) {
    const rects: MinimapWorldRect[] = []
    for (const obj of layer.objects) {
      const w = obj.width ?? 0
      const h = obj.height ?? 0
      if (w <= 0 || h <= 0) continue
      rects.push({ x: obj.x ?? 0, y: obj.y ?? 0, width: w, height: h })
    }
    return rects
  }

  const defs = OBSTACLES_BY_MAP[mapId] ?? []
  return defs.map((d) => ({
    x: d.x - d.width / 2,
    y: d.y - d.height / 2,
    width: d.width,
    height: d.height,
  }))
}

export const OBSTACLES_BY_MAP: Record<string, ObstacleDef[]> = {
  field_01: [
    { x: 360, y: 300, width: 72, height: 56 },
    { x: 600, y: 360, width: 64, height: 64 },
    { x: 520, y: 200, width: 48, height: 80 },
    { x: 320, y: 440, width: 80, height: 48 },
    { x: 700, y: 280, width: 56, height: 56 },
  ],
}

export function spawnObstaclesFromTilemap(
  scene: Phaser.Scene,
  tilemap: Phaser.Tilemaps.Tilemap,
): Phaser.GameObjects.Rectangle[] {
  const layer = tilemap.getObjectLayer('obstacles')
  if (!layer?.objects?.length) return []

  const bodies: Phaser.GameObjects.Rectangle[] = []
  for (const obj of layer.objects) {
    const w = obj.width ?? 0
    const h = obj.height ?? 0
    if (w <= 0 || h <= 0) continue
    const cx = (obj.x ?? 0) + w / 2
    const cy = (obj.y ?? 0) + h / 2
    const rect = scene.add.rectangle(cx, cy, w, h, 0x78716c, 0.95)
    rect.setStrokeStyle(2, 0x44403c)
    scene.physics.add.existing(rect, true)
    attachToWorldRoot(scene, rect)
    bodies.push(rect)
  }
  return bodies
}

export function spawnObstacles(scene: Phaser.Scene, mapId: string): Phaser.GameObjects.Rectangle[] {
  const defs = OBSTACLES_BY_MAP[mapId] ?? []
  const bodies: Phaser.GameObjects.Rectangle[] = []
  for (const d of defs) {
    const rect = scene.add.rectangle(d.x, d.y, d.width, d.height, 0x78716c, 0.95)
    rect.setStrokeStyle(2, 0x44403c)
    scene.physics.add.existing(rect, true)
    attachToWorldRoot(scene, rect)
    bodies.push(rect)
  }
  return bodies
}

export function colliderWithObstacles(
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Rectangle[],
  target: Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.GameObjects.GameObject,
) {
  for (const obstacle of obstacles) {
    scene.physics.add.collider(target, obstacle)
  }
}
