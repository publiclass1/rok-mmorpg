import { buildItemTooltipDetail } from '../game/character/itemTooltipDetail'
import { ItemDetailTooltip } from './ItemDetailTooltip'
import { getRolledItemOrNull } from '../game/character/itemCatalog'

type Props = {
  itemId: string
}

export function RolledItemDetails({ itemId }: Props) {
  const rolled = getRolledItemOrNull(itemId)
  if (!rolled) return null

  const detail = buildItemTooltipDetail(itemId)
  return (
    <div className="rolled-item-details small">
      <ItemDetailTooltip detail={detail} />
    </div>
  )
}
