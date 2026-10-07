import type { SkillDetailView } from '../game/character/skillRequirements'

type Props = {
  skillName: string
  detail: SkillDetailView
  style: React.CSSProperties
}

export function SkillDetailTooltip({ skillName, detail, style }: Props) {
  return (
    <div className="skill-detail-tooltip" style={style} role="tooltip">
      <p className="skill-detail-tooltip-name">{skillName}</p>
      <p className="skill-detail-tooltip-level muted small">{detail.levelLine}</p>
      <p className="skill-detail-tooltip-desc small">{detail.description}</p>
      {detail.statsLines.length > 0 && (
        <p className="skill-detail-tooltip-stats muted small">{detail.statsLines.join(' · ')}</p>
      )}
      {detail.requirements.length > 0 && (
        <ul className="skill-detail-tooltip-reqs">
          {detail.requirements.map((row) => (
            <li
              key={row.label}
              className={
                row.met === true
                  ? 'skill-req-met'
                  : row.met === false
                    ? 'skill-req-unmet'
                    : 'skill-req-neutral'
              }
            >
              {row.label}
            </li>
          ))}
        </ul>
      )}
      {detail.blockers.length > 0 && (
        <p className="skill-detail-tooltip-blockers small">{detail.blockers.join(' ')}</p>
      )}
    </div>
  )
}
