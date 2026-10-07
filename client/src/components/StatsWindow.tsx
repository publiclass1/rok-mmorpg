import { useState } from 'react'
import { BASE_PRIMARY_STAT, type PrimaryStat } from '../game/character/characterState'
import { sessionFromSheetPayload } from '../game/character/characterSheet'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import { getCharacterSession, setCharacterSession } from '../game/character/characterSessionBridge'
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
      setCharacterSession(sessionFromSheetPayload(sheet, getCharacterSession()))
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

  const atkLabel =
    cs.weaponAtk > 0 ? `${cs.atk} (${cs.statusAtk}+${cs.weaponAtk})` : String(cs.atk)

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
          <dl className="stats-window__detail-grid">
            <dt>HP</dt>
            <dd>{cs.hp} / {cs.hpMax}</dd>
            <dt>MP</dt>
            <dd>{cs.mp} / {cs.mpMax}</dd>
            <dt>Move</dt>
            <dd>{cs.moveSpeed}</dd>
            <dt>Atk spd</dt>
            <dd>{cs.attackIntervalMs}ms (~{cs.attacksPerSecond}/s)</dd>
            <dt>ATK</dt>
            <dd>{atkLabel}</dd>
            <dt>MATK</dt>
            <dd>{cs.matkMin}–{cs.matkMax}</dd>
            <dt>DEF</dt>
            <dd>{cs.def}</dd>
            <dt>MDEF</dt>
            <dd>{cs.mdef}</dd>
            <dt>Hit</dt>
            <dd>{cs.hit}</dd>
            <dt>Flee</dt>
            <dd>{cs.flee}</dd>
            <dt>Crit</dt>
            <dd>{cs.critChancePercent}%</dd>
          </dl>
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
