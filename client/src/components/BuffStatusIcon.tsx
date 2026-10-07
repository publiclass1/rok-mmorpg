import { SkillIcon } from './SkillIcon'

type Props = {
  iconSkillId: string
  skillLevel: number
  title: string
}

export function BuffStatusIcon({ iconSkillId, skillLevel, title }: Props) {
  return (
    <div className="buff-slot buff-slot--status-active" title={title}>
      <div className="buff-slot-icon">
        <SkillIcon skillId={iconSkillId} level={skillLevel} size="sm" />
      </div>
    </div>
  )
}
