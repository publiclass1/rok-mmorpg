import Phaser from 'phaser'
import { resolveHeadItemId, type EquipSlot } from '../character/characterState'
import { EQUIPMENT } from '../character/equipmentConfig'
import type { Facing } from '../movement/clickToMove'

const FRAME_W = 24
const FRAME_H = 28

function drawBodyFrame(g: Phaser.GameObjects.Graphics, frame: number, tintBody = 0x1d4ed8) {
  const ox = frame * FRAME_W
  g.fillStyle(tintBody, 1)
  g.fillRoundedRect(ox + 4, 10, 16, 14, 3)
  g.fillStyle(0xfcd34d, 1)
  const headY = frame === 1 ? 7 : 8
  g.fillCircle(ox + 12, headY, 7)
}

export function ensurePlayerAnimationTextures(scene: Phaser.Scene) {
  if (scene.textures.exists('player_body')) return

  const g = scene.add.graphics()
  drawBodyFrame(g, 0)
  drawBodyFrame(g, 1)
  g.generateTexture('player_body', FRAME_W * 2, FRAME_H)
  g.destroy()

  const tex = scene.textures.get('player_body')
  if (!tex.has('0')) {
    tex.add('0', 0, 0, 0, FRAME_W, FRAME_H)
    tex.add('1', 0, FRAME_W, 0, FRAME_W, FRAME_H)
  }

  if (!scene.anims.exists('walk_down')) {
    const dirs = ['down', 'up', 'left', 'right'] as const
    for (const dir of dirs) {
      scene.anims.create({
        key: `walk_${dir}`,
        frames: [{ key: 'player_body', frame: '0' }, { key: 'player_body', frame: '1' }],
        frameRate: 6,
        repeat: -1,
      })
      scene.anims.create({
        key: `idle_${dir}`,
        frames: [{ key: 'player_body', frame: '0' }],
        frameRate: 1,
      })
      scene.anims.create({
        key: `attack_${dir}`,
        frames: [{ key: 'player_body', frame: '1' }],
        frameRate: 1,
      })
      scene.anims.create({
        key: `jump_${dir}`,
        frames: [{ key: 'player_body', frame: '1' }],
        frameRate: 1,
      })
    }
  }
}

export type PlayerVisualLayer = 'weapon' | 'armor' | 'head' | 'offhand'

export type PlayerDisplay = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>>
}

export function createPlayerDisplay(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerDisplay {
  ensurePlayerAnimationTextures(scene)
  const body = scene.add.sprite(0, 0, 'player_body', '0')
  body.setOrigin(0.5, 0.85)
  body.anims.play('idle_down')

  const layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Rectangle>> = {}
  const weapon = scene.add.rectangle(8, 4, 10, 4, 0xc0c0c0).setVisible(false)
  const armor = scene.add.rectangle(0, 8, 18, 12, 0xf5f5dc, 0.7).setVisible(false)
  const head = scene.add.rectangle(0, -10, 16, 6, 0x8b4513).setVisible(false)
  const offhand = scene.add.rectangle(-8, 6, 8, 10, 0x6b7280).setVisible(false)
  layers.weapon = weapon
  layers.armor = armor
  layers.head = head
  layers.offhand = offhand

  const container = scene.add.container(x, y, [body, armor, head, offhand, weapon])
  scene.physics.add.existing(container)
  const bodyPhys = container.body as Phaser.Physics.Arcade.Body
  bodyPhys.setSize(18, 14)
  bodyPhys.setOffset(-9, -12)

  return { container, body, layers }
}

export function syncPlayerDisplayPosition(display: PlayerDisplay, x: number, y: number) {
  display.container.setPosition(x, y)
}

export function updatePlayerEquipmentLayers(
  display: PlayerDisplay,
  equipment: Record<EquipSlot, string | null>,
) {
  const show = (layerKey: PlayerVisualLayer, visible: boolean, color?: number, alpha = 1) => {
    const layer = display.layers[layerKey]
    if (!layer) return
    layer.setVisible(visible)
    if (color !== undefined) layer.setFillStyle(color, alpha)
  }
  show('weapon', false)
  show('armor', false)
  show('head', false)
  show('offhand', false)

  for (const itemId of Object.values(equipment)) {
    if (!itemId) continue
    const def = EQUIPMENT[itemId]
    if (!def) continue
    if (def.slot === 'headTop' || def.slot === 'headMiddle' || def.slot === 'headLower') continue
    if (def.slot === 'offhand') {
      show('offhand', true, def.layerColor)
      continue
    }
    if (def.slot === 'weapon') show('weapon', true, def.layerColor)
    else if (def.slot === 'armor') show('armor', true, def.layerColor, 0.7)
  }

  const headItemId = resolveHeadItemId(equipment)
  if (headItemId) {
    const def = EQUIPMENT[headItemId]
    if (def) show('head', true, def.layerColor)
  }
}

export function playPlayerAnim(display: PlayerDisplay, key: string, facing: Facing) {
  const animKey = `${key}_${facing}`
  if (display.body.anims.currentAnim?.key !== animKey) {
    display.body.anims.play(animKey, true)
  }
}

export function getPlayerPhysicsSprite(display: PlayerDisplay): Phaser.Types.Physics.Arcade.GameObjectWithBody {
  return display.container as Phaser.Types.Physics.Arcade.GameObjectWithBody
}
