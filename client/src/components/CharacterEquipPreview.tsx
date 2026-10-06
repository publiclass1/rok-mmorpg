import { resolveHeadItemId, type EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
function colorHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

type Props = {
  equipment: Record<EquipSlot, string | null>
}

export function CharacterEquipPreview({ equipment }: Props) {
  const weaponId = equipment.weapon
  const armorId = equipment.armor
  const offhandId = equipment.offhand
  const headItemId = resolveHeadItemId(equipment)

  const weaponColor = weaponId ? EQUIPMENT[weaponId]?.layerColor : undefined
  const armorColor = armorId ? EQUIPMENT[armorId]?.layerColor : undefined
  const offhandColor = offhandId ? EQUIPMENT[offhandId]?.layerColor : undefined
  const headColor = headItemId ? EQUIPMENT[headItemId]?.layerColor : undefined

  return (
    <div className="character-equip-preview" aria-hidden>
      <div className="character-equip-preview__body" />
      <div className="character-equip-preview__head" />
      {armorColor !== undefined && (
        <div
          className="character-equip-preview__armor"
          style={{ backgroundColor: colorHex(armorColor) }}
        />
      )}
      {headColor !== undefined && (
        <div
          className="character-equip-preview__headgear"
          style={{ backgroundColor: colorHex(headColor) }}
        />
      )}
      {offhandColor !== undefined && (
        <div
          className="character-equip-preview__offhand"
          style={{ backgroundColor: colorHex(offhandColor) }}
        />
      )}
      {weaponColor !== undefined && (
        <div
          className="character-equip-preview__weapon"
          style={{ backgroundColor: colorHex(weaponColor) }}
        />
      )}
    </div>
  )
}
