import Phaser from 'phaser'
import type { NpcRow } from '../../types/database'
import type { Facing } from '../movement/clickToMove'
import { registerNpcIdleAnimations, animKey } from '../character/characterSpriteAnim'
import { npcTextureKey, resolveNpcSpriteDef } from '../character/characterSpriteRegistry'
import { styleWorldNameLabel } from '../world/worldNameLabel'
import {
  GUILD_BADGE_OFFSET_Y,
  GUILD_ICON_SIZE,
  layoutGuildBadgeX,
  npcGuildTextureKey,
  resolveNpcGuild,
} from './npcGuildBadge'

export type NpcWorldVisual = {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle
  label: Phaser.GameObjects.Text
  guildIcon: Phaser.GameObjects.Image
  guildLabel: Phaser.GameObjects.Text
  feetY: number
  fallback: boolean
}

function styleGuildLabel(text: Phaser.GameObjects.Text) {
  text.setFontSize(9).setColor('#a5b4fc').setStroke('#0f172a', 2)
}

function addGuildBadge(scene: Phaser.Scene, npc: NpcRow, feetY: number): Pick<NpcWorldVisual, 'guildIcon' | 'guildLabel'> {
  const guild = resolveNpcGuild(npc)
  const guildLabel = scene.add.text(0, feetY + GUILD_BADGE_OFFSET_Y, guild.name)
  styleGuildLabel(guildLabel)

  const { iconX, labelX, labelOriginX } = layoutGuildBadgeX(npc.x, guild.name, (t) =>
    guildLabel.context.measureText(t).width,
  )
  guildLabel.setOrigin(labelOriginX, 0.5)
  guildLabel.setPosition(labelX, feetY + GUILD_BADGE_OFFSET_Y)

  const guildIcon = scene.add.image(iconX, feetY + GUILD_BADGE_OFFSET_Y, npcGuildTextureKey(guild.iconId))
  guildIcon.setDisplaySize(GUILD_ICON_SIZE, GUILD_ICON_SIZE)
  guildIcon.setOrigin(0.5, 0.5)

  return { guildIcon, guildLabel }
}

export function syncNpcGuildBadgePosition(visual: NpcWorldVisual) {
  const x = visual.sprite.x
  const feetY = visual.feetY
  const guildName = visual.guildLabel.text
  const { iconX, labelX, labelOriginX } = layoutGuildBadgeX(x, guildName, (t) =>
    visual.guildLabel.context.measureText(t).width,
  )
  visual.guildIcon.setPosition(iconX, feetY + GUILD_BADGE_OFFSET_Y)
  visual.guildLabel.setOrigin(labelOriginX, 0.5)
  visual.guildLabel.setPosition(labelX, feetY + GUILD_BADGE_OFFSET_Y)
}

export function createNpcWorldVisual(scene: Phaser.Scene, npc: NpcRow): NpcWorldVisual {
  const feetY = npc.y + 18
  const def = resolveNpcSpriteDef(npc)
  const facing = ((npc.config as { facing?: Facing }).facing ?? 'down') as Facing
  const guildParts = addGuildBadge(scene, npc, feetY)

  if (!def) {
    const rect = scene.add.rectangle(npc.x, feetY - 18, 28, 36, 0xf59e0b)
    rect.setStrokeStyle(2, 0xffffff)
    const label = scene.add.text(npc.x, feetY - 46, npc.label).setOrigin(0.5)
    styleWorldNameLabel(label)
    return { sprite: rect, label, ...guildParts, feetY, fallback: true }
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

  const label = scene.add.text(npc.x, feetY - 46, npc.label).setOrigin(0.5)
  styleWorldNameLabel(label)

  return { sprite, label, ...guildParts, feetY, fallback: false }
}
