import { SkillIcon } from './SkillIcon'

type Props = {
  iconSkillId: string
  skillLevel: number
}

export function BuffStatusIcon({ iconSkillId, skillLevel }: Props) {
  return (
    <div className="buff-slot buff-slot--status-active">
      <div className="buff-slot-icon">
        <SkillIcon skillId={iconSkillId} level={skillLevel} size="sm" />
      </div>
    </div>
  )
}
