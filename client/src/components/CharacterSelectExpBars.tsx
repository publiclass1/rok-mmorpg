import type { PlayerProgressState } from '../game/combat/exp'
import { ExpBarRow } from './ExpBarRow'

type Props = {
  progress: PlayerProgressState
}

export function CharacterSelectExpBars({ progress }: Props) {
  return (
    <div className="exp-hud char-select-exp" aria-label="Experience">
      <div className="exp-hud__half exp-hud__half--base">
        <ExpBarRow
          label="Base"
          level={progress.baseLevel}
          exp={progress.baseExp}
          toNext={progress.baseExpToNext}
          fillClass="vital-fill--base-exp"
          animated={false}
        />
      </div>
      <div className="exp-hud__half exp-hud__half--job">
        <ExpBarRow
          label="Job"
          level={progress.jobLevel}
          exp={progress.jobExp}
          toNext={progress.jobExpToNext}
          fillClass="vital-fill--job-exp"
          animated={false}
        />
      </div>
    </div>
  )
}
