import type { PrimaryStat } from '../game/character/characterState'
import { derivedMaxHp, derivedMaxMp } from '../game/character/statFormulas'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

const STAT_LABELS: Record<PrimaryStat, string> = {
  str: 'STR',
  agi: 'AGI',
  vit: 'VIT',
  int: 'INT',
  dex: 'DEX',
  luk: 'LUK',
}

export function StatsWindow({ sheet, onClose }: Props) {
  const previewHp = derivedMaxHp(sheet.baseLevel, sheet.effectiveVit)
  const previewMp = derivedMaxMp(sheet.baseLevel, sheet.effectiveInt)

  function raise(stat: PrimaryStat) {
    dispatchCharacterAction({ type: 'raiseStat', stat })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()}>
        <div className="row spread">
          <h2 style={{ margin: 0 }}>Status</h2>
          <button type="button" className="secondary" onClick={onClose}>Close</button>
        </div>
        <p className="muted small">
          Unspent stat points: <strong>{sheet.statPointsUnspent}</strong>
          {sheet.statPointsUnspent === 0 && ' — gain Base EXP and level up to earn more.'}
        </p>
        <p className="muted small">Raise cost: 2 + floor((stat − 1) / 10)</p>
        <ul className="stat-list">
          {(Object.keys(STAT_LABELS) as PrimaryStat[]).map((stat) => {
            const effMap = {
              str: sheet.effectiveStr,
              agi: sheet.effectiveAgi,
              vit: sheet.effectiveVit,
              int: sheet.effectiveInt,
              dex: sheet.effectiveDex,
              luk: sheet.effectiveLuk,
            }
            return (
              <li key={stat} className="row spread">
                <span>
                  {STAT_LABELS[stat]} {sheet[stat]} <span className="muted">(eff {effMap[stat]})</span>
                </span>
                <button
                  type="button"
                  disabled={sheet.statPointsUnspent < sheet.statRaiseCosts[stat]}
                  onClick={() => raise(stat)}
                >
                  +1 ({sheet.statRaiseCosts[stat]} pt)
                </button>
              </li>
            )
          })}
        </ul>
        <p className="muted small">ATK ~{sheet.attackDamage} · HP {sheet.hp}/{previewHp} · MP {sheet.mp}/{previewMp}</p>
      </div>
    </div>
  )
}
