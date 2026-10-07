import { getEquipmentDefinition } from '../character/equipmentConfig'
import { getEquipColor, getItemWeaponClass } from '../character/itemCatalog'
import type { EquipSlot } from '../character/characterState'
import type { Facing } from '../movement/clickToMove'

export type EquipmentRectLayer = Phaser.GameObjects.Rectangle

function applyRectLayer(layer: EquipmentRectLayer | undefined, itemId: string | null, alpha = 1) {
  if (!layer) return
  if (!itemId) {
    layer.setVisible(false)
    return
  }
  const color = getEquipmentDefinition(itemId)?.layerColor ?? getEquipColor(itemId)
  layer.setVisible(true)
  layer.setFillStyle(color, alpha)
}

export function applyWeaponEquipLayer(layer: EquipmentRectLayer | undefined, itemId: string | null) {
  if (!layer) return
  if (!itemId) {
    layer.setVisible(false)
    return
  }
  const color = getEquipmentDefinition(itemId)?.layerColor ?? getEquipColor(itemId)
  layer.setVisible(true)
  layer.setFillStyle(color, 1)
  const weaponClass = getItemWeaponClass(itemId)
  if (weaponClass === 'spear' || weaponClass === 'staff') {
    layer.setSize(16, 3)
    layer.setY(-24)
  } else if (weaponClass === 'bow') {
    layer.setSize(12, 10)
    layer.setY(-22)
  } else {
    layer.setSize(10, 4)
    layer.setY(-20)
  }
}

export function applyPlayerEquipmentRects(
  layers: {
    garment?: EquipmentRectLayer
    armor?: EquipmentRectLayer
    headTop?: EquipmentRectLayer
    headMiddle?: EquipmentRectLayer
    headLower?: EquipmentRectLayer
    offhand?: EquipmentRectLayer
    weapon?: EquipmentRectLayer
  },
  equipment: Record<EquipSlot, string | null>,
) {
  applyRectLayer(layers.garment, equipment.garment, 0.72)
  applyRectLayer(layers.armor, equipment.armor, 0.88)
  applyRectLayer(layers.headTop, equipment.headTop, 1)
  applyRectLayer(layers.headMiddle, equipment.headMiddle, 1)
  applyRectLayer(layers.headLower, equipment.headLower, 1)
  applyRectLayer(layers.offhand, equipment.offhand, 1)
  applyWeaponEquipLayer(layers.weapon, equipment.weapon)
}

/** Mirror weapon / shield to the character's front hand side. */
export function positionEquipmentForFacing(
  layers: {
    offhand?: EquipmentRectLayer
    weapon?: EquipmentRectLayer
  },
  facing: Facing,
) {
  const left = facing === 'left'
  const weaponX = left ? -10 : 10
  const offhandX = left ? 10 : -10
  if (layers.weapon?.visible) {
    layers.weapon.setX(weaponX)
  }
  if (layers.offhand?.visible) {
    layers.offhand.setX(offhandX)
  }
}
