import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { buildItemTooltipDetail } from '../game/character/itemTooltipDetail'
import { ItemDetailTooltip } from './ItemDetailTooltip'
import { AnchoredFloatingTooltip } from './tooltip/AnchoredFloatingTooltip'
import { useHoverAnchor } from './tooltip/useHoverAnchor'

type Props = {
  itemId: string
  quantity?: number
  children: ReactElement
}

export function ItemHoverTooltip({ itemId, quantity, children }: Props) {
  const { anchor, onMouseEnter, onMouseLeave } = useHoverAnchor()
  const detail = buildItemTooltipDetail(itemId, { quantity })

  if (!isValidElement(children)) {
    return children as ReactNode
  }

  const child = children as ReactElement<{
    onMouseEnter?: (e: React.MouseEvent<HTMLElement>) => void
    onMouseLeave?: (e: React.MouseEvent<HTMLElement>) => void
  }>

  return (
    <>
      {cloneElement(child, {
        onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseEnter?.(e)
          onMouseEnter(e)
        },
        onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
          child.props.onMouseLeave?.(e)
          onMouseLeave()
        },
      })}
      {anchor && (
        <AnchoredFloatingTooltip anchor={anchor}>
          <ItemDetailTooltip detail={detail} />
        </AnchoredFloatingTooltip>
      )}
    </>
  )
}
