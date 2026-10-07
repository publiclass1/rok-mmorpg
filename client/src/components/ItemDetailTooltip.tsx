import type { ItemTooltipDetail } from '../game/character/itemTooltipDetail'

type Props = {
  detail: ItemTooltipDetail
  className?: string
}

export function ItemDetailTooltip({ detail, className = 'item-detail-tooltip' }: Props) {
  return (
    <div className={className}>
      <p className="item-detail-tooltip-name" style={detail.nameColor ? { color: detail.nameColor } : undefined}>
        {detail.name}
      </p>
      {detail.subtitleLines.map((line) => (
        <p key={line} className="item-detail-tooltip-line muted small">
          {line}
        </p>
      ))}
      {detail.statLines.length > 0 && (
        <p className="item-detail-tooltip-stats small">{detail.statLines.join(' · ')}</p>
      )}
      {detail.effectLines.map((line) => (
        <p key={line} className="item-detail-tooltip-effect muted small">
          {line}
        </p>
      ))}
      {detail.metaLines.length > 0 && (
        <p className="item-detail-tooltip-meta muted small">{detail.metaLines.join(' · ')}</p>
      )}
    </div>
  )
}
