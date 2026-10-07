import Phaser from 'phaser'
import type { NpcRow } from '../../types/database'
import type { Facing } from '../movement/clickToMove'
import { registerNpcIdleAnimations, animKey } from '../character/characterSpriteAnim'
import {
  getNpcSpriteDef,
  npcTextureKey,
  resolveNpcSpriteKey,
} from '../character/characterSpriteRegistry'

export type NpcWorldVisual = {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  feetY: number
  fallback: boolean
}

export function createNpcWorldVisual(scene: Phaser.Scene, npc: NpcRow): NpcWorldVisual {
  const feetY = npc.y + 18
  const spriteKey = resolveNpcSpriteKey(npc)
  const def = spriteKey ? getNpcSpriteDef(spriteKey) : null
  const facing = ((npc.config as { facing?: Facing }).facing ?? 'down') as Facing

  if (!def) {
    const rect = scene.add.rectangle(npc.x, feetY - 18, 28, 36, 0xf59e0b)
    rect.setStrokeStyle(2, 0xffffff)
    const label = scene.add
      .text(npc.x, feetY - 46, npc.label, { fontSize: '11px', color: '#fff' })
      .setOrigin(0.5)
    return { sprite: rect, label, feetY, fallback: true }
  }

  const textureKey = npcTextureKey(def)
  registerNpcIdleAnimations(scene, textureKey, def)
  const sprite = scene.add.sprite(npc.x, feetY, textureKey, '0')
  sprite.setOrigin(0.5, 1)
  sprite.play(animKey(textureKey, 'idle', facing))

  scene.tweens.add({
    targets: sprite,
    y: feetY - 1,
    duration: 2500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  })

  const label = scene.add
    .text(npc.x, feetY - 46, npc.label, { fontSize: '11px', color: '#fff' })
    .setOrigin(0.5)

  return { sprite, label, feetY, fallback: false }
}
