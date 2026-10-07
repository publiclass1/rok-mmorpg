import { resolveHeadItemId, type EquipSlot } from '../game/character/characterState'
import { EQUIPMENT } from '../game/character/equipmentConfig'
import { hasItemIcon } from '../game/character/itemCatalog'
import { ItemIcon } from './ItemIcon'

function colorHex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`
}

type PreviewLayerProps = {
  className: string
  itemId: string | null | undefined
  color: number | undefined
  iconSize: number
}

function PreviewLayer({ className, itemId, color, iconSize }: PreviewLayerProps) {
  if (!itemId) return null
  if (hasItemIcon(itemId)) {
    return (
      <div className={`${className} ${className}--icon`}>
        <ItemIcon itemId={itemId} size={iconSize} alt="" />
      </div>
    )
  }
  if (color === undefined) return null
  return <div className={className} style={{ backgroundColor: colorHex(color) }} />
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
      <PreviewLayer
        className="character-equip-preview__armor"
        itemId={armorId}
        color={armorColor}
        iconSize={32}
      />
      <PreviewLayer
        className="character-equip-preview__headgear"
        itemId={headItemId}
        color={headColor}
        iconSize={24}
      />
      <PreviewLayer
        className="character-equip-preview__offhand"
        itemId={offhandId}
        color={offhandColor}
        iconSize={24}
      />
      <PreviewLayer
        className="character-equip-preview__weapon"
        itemId={weaponId}
        color={weaponColor}
        iconSize={28}
      />
    </div>
  )
}
