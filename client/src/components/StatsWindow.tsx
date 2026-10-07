import { useState } from 'react'
import { BASE_PRIMARY_STAT, type PrimaryStat } from '../game/character/characterState'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { STAT_RESET_ZENY_COST } from '../game/character/statFormulas'
import { emitGameEvent, type CharacterSheetPayload } from '../game/events'
import { spendCharacterZeny } from '../lib/zeny'
import type { CharacterRow } from '../types/database'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'
import { ModalResetButton } from './motion/ModalResetButton'

type Props = {
  character: CharacterRow
  sheet: CharacterSheetPayload
  onClose: () => void
  onCharacterUpdated: (row: CharacterRow) => void
}

const STAT_LABELS: Record<PrimaryStat, string> = {
  str: 'STR',
  agi: 'AGI',
  vit: 'VIT',
  int: 'INT',
  dex: 'DEX',
  luk: 'LUK',
}

const EFF_BY_STAT: Record<PrimaryStat, keyof CharacterSheetPayload> = {
  str: 'effectiveStr',
  agi: 'effectiveAgi',
  vit: 'effectiveVit',
  int: 'effectiveInt',
  dex: 'effectiveDex',
  luk: 'effectiveLuk',
}

function sheetHasRaisedStats(sheet: CharacterSheetPayload): boolean {
  return (
    sheet.str > BASE_PRIMARY_STAT ||
    sheet.agi > BASE_PRIMARY_STAT ||
    sheet.vit > BASE_PRIMARY_STAT ||
    sheet.int > BASE_PRIMARY_STAT ||
    sheet.dex > BASE_PRIMARY_STAT ||
    sheet.luk > BASE_PRIMARY_STAT
  )
}

export function StatsWindow({ character, sheet, onClose, onCharacterUpdated }: Props) {
  const cs = sheet.combatStats
  const [busy, setBusy] = useState(false)
  const canReset = sheetHasRaisedStats(sheet)
  const resetTitle = `Reset stats (${STAT_RESET_ZENY_COST.toLocaleString()} zeny)`

  function raise(stat: PrimaryStat) {
    dispatchCharacterAction({ type: 'raiseStat', stat })
  }

  async function resetStats() {
    if (busy) return
    if (!canReset) {
      return
    }
    if (character.zeny < STAT_RESET_ZENY_COST) {
      emitGameEvent('status', `Need ${STAT_RESET_ZENY_COST.toLocaleString()} zeny to reset stats.`)
      return
    }
    setBusy(true)
    try {
      const resetOk = dispatchCharacterAction({ type: 'resetStats' })
      if (!resetOk) return

      const nextZeny = await spendCharacterZeny(character.id, -STAT_RESET_ZENY_COST)
      if (nextZeny == null) {
        emitGameEvent('status', 'Payment failed.')
        return
      }
      onCharacterUpdated({ ...character, zeny: nextZeny })
    } finally {
      setBusy(false)
    }
  }

  const atkTitle =
    cs.weaponAtk > 0 ? `${cs.statusAtk} status + ${cs.weaponAtk} weapon` : undefined

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal stats-window-modal">
      <ModalHeader
        title="Status"
        onClose={onClose}
        trailing={
          <ModalResetButton
            onClick={() => void resetStats()}
            disabled={busy || !canReset || character.zeny < STAT_RESET_ZENY_COST}
            label={resetTitle}
          />
        }
      />
      <ModalScrollBody>
      <p className="muted small stats-window__meta">
        Points: <strong>{sheet.statPointsUnspent}</strong>
        <span className="stats-window__meta-sep">·</span>
        Raise: 2 + floor((stat − 1) / 10)
        <span className="stats-window__meta-sep">·</span>
        Reset: {STAT_RESET_ZENY_COST.toLocaleString()}z
        {sheet.statPointsUnspent === 0 && (
          <span className="stats-window__meta-sep">· level up for more</span>
        )}
        <span className="stats-window__meta-sep">·</span>
        Reset clears base stats; eff and combat stats include gear
      </p>

      <div className="stats-window__body two-col">
        <section className="stats-window__details" aria-label="Character stats">
          <div className="stats-window__compact">
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">HP:</span>
                <span className="stats-window__compact-value">{cs.hp}/{cs.hpMax}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">SP:</span>
                <span className="stats-window__compact-value">{cs.mp}/{cs.mpMax}</span>
              </span>
            </div>
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair" title={atkTitle}>
                <span className="stats-window__compact-label">ATK:</span>
                <span className="stats-window__compact-value">{cs.atk}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">MATK:</span>
                <span className="stats-window__compact-value">{cs.matkMin}–{cs.matkMax}</span>
              </span>
            </div>
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">DEF:</span>
                <span className="stats-window__compact-value">{cs.def}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">MDEF:</span>
                <span className="stats-window__compact-value">{cs.mdef}</span>
              </span>
            </div>
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">Hit:</span>
                <span className="stats-window__compact-value">{cs.hit}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">Flee:</span>
                <span className="stats-window__compact-value">{cs.flee}</span>
              </span>
            </div>
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">Move:</span>
                <span className="stats-window__compact-value">{cs.moveSpeed}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">Crit:</span>
                <span className="stats-window__compact-value">{cs.critChancePercent}%</span>
              </span>
            </div>
            <div className="stats-window__compact-row">
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">ASPD:</span>
                <span className="stats-window__compact-value">{cs.aspdDisplay}</span>
              </span>
              <span className="stats-window__compact-pair">
                <span className="stats-window__compact-label">Cast red:</span>
                <span className="stats-window__compact-value">{cs.variableCastReducePercent}%</span>
              </span>
            </div>
          </div>
        </section>

        <section className="stats-window__allocate" aria-label="Stat allocation">
          <ul className="stat-list stats-window__stat-list">
            {(Object.keys(STAT_LABELS) as PrimaryStat[]).map((stat) => {
              const effKey = EFF_BY_STAT[stat]
              const eff = sheet[effKey] as number
              const cost = sheet.statRaiseCosts[stat]
              return (
                <li key={stat} className="stats-window__stat-row">
                  <span className="stats-window__stat-label">
                    {STAT_LABELS[stat]} {sheet[stat]}
                    <span className="muted"> (eff {eff})</span>
                  </span>
                  <button
                    type="button"
                    className="stats-window__raise-btn"
                    disabled={sheet.statPointsUnspent < cost}
                    onClick={() => raise(stat)}
                  >
                    +1 ({cost} pt)
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
