import type { CharacterPose } from '../character/characterPose'
import type { EquipSlot } from '../character/characterState'
import { WORLD_VISIBLE_EQUIP_LAYERS, type PlayerVisualLayer } from './playerDisplayLayers'
import { ensureItemEquipIconTexture } from './itemEquipIconTexture'
import { equipmentPoseOffset } from './playerEquipmentPoseOffset'

export type EquipmentImageLayer = Phaser.GameObjects.Image

export type EquipmentDisplayHost = {
  body: Phaser.GameObjects.Sprite
  layers: Partial<Record<PlayerVisualLayer, Phaser.GameObjects.Image>>
  pose: CharacterPose
  equipment: Record<EquipSlot, string | null>
}

type SlotLayout = {
  x: number
  y: number
  w: number
  h: number
  originX: number
  originY: number
  rotation?: number
}

const HEAD_SLOT_LAYOUT: Record<'headTop' | 'headMiddle' | 'headLower', SlotLayout> = {
  headTop: { x: 0, y: -36, w: 14, h: 9, originX: 0.5, originY: 0.85 },
  headMiddle: { x: 0, y: -32, w: 12, h: 7, originX: 0.5, originY: 0.55 },
  headLower: { x: 0, y: -28, w: 11, h: 6, originX: 0.5, originY: 0.45 },
}

const SLOT_TO_EQUIP: Record<'headTop' | 'headMiddle' | 'headLower', EquipSlot> = {
  headTop: 'headTop',
  headMiddle: 'headMiddle',
  headLower: 'headLower',
}

function applyLayoutToImage(
  image: EquipmentImageLayer,
  slot: 'headTop' | 'headMiddle' | 'headLower',
  layout: SlotLayout,
  pose: CharacterPose,
) {
  const poseOff = equipmentPoseOffset(slot, pose)
  image.setPosition(layout.x + poseOff.dx, layout.y + poseOff.dy)
  image.setOrigin(layout.originX, layout.originY)
  image.setDisplaySize(layout.w, layout.h)
  image.setRotation((layout.rotation ?? 0) + (poseOff.rot ?? 0))
  image.setFlipX(false)
}

function bindSlotImage(
  display: EquipmentDisplayHost,
  slot: 'headTop' | 'headMiddle' | 'headLower',
  itemId: string | null,
) {
  const image = display.layers[slot]
  if (!image) return

  const layout = HEAD_SLOT_LAYOUT[slot]

  if (!itemId) {
    image.setVisible(false)
    return
  }

  const scene = display.body.scene
  const applyTexture = (textureKey: string) => {
    image.setTexture(textureKey)
    applyLayoutToImage(image, slot, layout, display.pose)
    image.setVisible(true)
  }

  ensureItemEquipIconTexture(scene, itemId, applyTexture)
}

/** Re-apply transforms when pose, mount, or facing changes. */
export function syncEquipmentTransforms(display: EquipmentDisplayHost) {
  for (const slot of WORLD_VISIBLE_EQUIP_LAYERS) {
    const image = display.layers[slot]
    if (!image?.visible) continue
    const equipSlot = SLOT_TO_EQUIP[slot as keyof typeof SLOT_TO_EQUIP]
    if (!equipSlot) continue
    applyLayoutToImage(
      image,
      slot as 'headTop' | 'headMiddle' | 'headLower',
      HEAD_SLOT_LAYOUT[slot as keyof typeof HEAD_SLOT_LAYOUT],
      display.pose,
    )
  }
}

export function applyPlayerEquipmentLayers(
  display: EquipmentDisplayHost,
  equipment: Record<EquipSlot, string | null>,
) {
  display.equipment = { ...equipment }
  for (const slot of WORLD_VISIBLE_EQUIP_LAYERS) {
    const equipSlot = SLOT_TO_EQUIP[slot as keyof typeof SLOT_TO_EQUIP]
    if (!equipSlot) continue
    bindSlotImage(display, slot as 'headTop' | 'headMiddle' | 'headLower', equipment[equipSlot])
  }
}
