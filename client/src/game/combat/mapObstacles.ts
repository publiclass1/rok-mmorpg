import Phaser from 'phaser'

export type ObstacleDef = { x: number; y: number; width: number; height: number }

export const OBSTACLES_BY_MAP: Record<string, ObstacleDef[]> = {
  prt_fild01: [
    { x: 380, y: 300, width: 64, height: 48 },
    { x: 580, y: 380, width: 72, height: 56 },
    { x: 460, y: 180, width: 56, height: 72 },
    { x: 680, y: 260, width: 48, height: 48 },
  ],
  field_01: [
    { x: 360, y: 300, width: 72, height: 56 },
    { x: 600, y: 360, width: 64, height: 64 },
    { x: 520, y: 200, width: 48, height: 80 },
    { x: 320, y: 440, width: 80, height: 48 },
    { x: 700, y: 280, width: 56, height: 56 },
  ],
}

export function spawnObstacles(scene: Phaser.Scene, mapId: string): Phaser.GameObjects.Rectangle[] {
  const defs = OBSTACLES_BY_MAP[mapId] ?? []
  const bodies: Phaser.GameObjects.Rectangle[] = []
  for (const d of defs) {
    const rect = scene.add.rectangle(d.x, d.y, d.width, d.height, 0x78716c, 0.95)
    rect.setStrokeStyle(2, 0x44403c)
    scene.physics.add.existing(rect, true)
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
