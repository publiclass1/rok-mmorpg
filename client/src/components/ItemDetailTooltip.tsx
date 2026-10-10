import type { ItemTooltipDetail, ItemTooltipRow } from '../game/character/itemTooltipDetail'

type Props = {
  detail: ItemTooltipDetail
  className?: string
}

function rowClass(variant: ItemTooltipRow['variant']): string {
  switch (variant) {
    case 'bonus':
      return 'item-detail-tooltip-value--bonus'
    case 'roll':
      return 'item-detail-tooltip-value--roll'
    case 'effect':
      return 'item-detail-tooltip-value--effect'
    case 'muted':
      return 'item-detail-tooltip-value--muted'
    default:
      return ''
  }
}

export function ItemDetailTooltip({ detail, className = 'item-detail-tooltip' }: Props) {
  return (
    <div className={className}>
      <p
        className="item-detail-tooltip-name"
        style={detail.nameColor ? { color: detail.nameColor } : undefined}
      >
        {detail.name}
      </p>
      {detail.subtitleLines.map((line) => (
        <p key={line} className="item-detail-tooltip-subtitle muted small">
          {line}
        </p>
      ))}
      {detail.sections.map((section) => (
        <div key={section.title ?? section.rows[0]?.label} className="item-detail-tooltip-section">
          {section.title ? (
            <p className="item-detail-tooltip-section-title small">{section.title}</p>
          ) : null}
          <table className="item-detail-tooltip-table small">
            <tbody>
              {section.rows.map((row) => (
                <tr key={`${section.title}-${row.label}-${row.value}`}>
                  <th scope="row" className="item-detail-tooltip-label">{row.label}</th>
                  <td className={`item-detail-tooltip-value ${rowClass(row.variant)}`.trim()}>
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
