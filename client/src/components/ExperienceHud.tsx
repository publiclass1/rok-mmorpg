import type { CharacterSheetPayload } from '../game/events'
import { ExpBarRow } from './ExpBarRow'

type Props = {
  sheet: CharacterSheetPayload
}

export function ExperienceHud({ sheet }: Props) {
  return (
    <div className="exp-hud" aria-label="Experience">
      <div className="exp-hud__half exp-hud__half--base">
        <ExpBarRow
          label="Base"
          level={sheet.baseLevel}
          exp={sheet.baseExp}
          toNext={sheet.baseExpToNext}
          fillClass="vital-fill--base-exp"
        />
      </div>
      <div className="exp-hud__half exp-hud__half--job">
        <ExpBarRow
          label="Job"
          level={sheet.jobLevel}
          exp={sheet.jobExp}
          toNext={sheet.jobExpToNext}
          fillClass="vital-fill--job-exp"
        />
      </div>
    </div>
  )
}
