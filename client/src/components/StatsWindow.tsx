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
  const [idCopied, setIdCopied] = useState(false)

  async function copyCharacterId() {
    try {
      await navigator.clipboard.writeText(character.id)
      setIdCopied(true)
      window.setTimeout(() => setIdCopied(false), 2000)
    } catch {
      emitGameEvent('status', 'Could not copy character ID.')
    }
  }
  const canReset = sheetHasRaisedStats(sheet)
  const resetTitle = 'Reset stats'

  function raise(stat: PrimaryStat) {
    dispatchCharacterAction({ type: 'raiseStat', stat })
  }

  function raiseMax(stat: PrimaryStat) {
    while (dispatchCharacterAction({ type: 'raiseStat', stat })) {
      /* re-reads session each iteration */
    }
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
      <ModalScrollBody className="stats-window__scroll">
      <div className="stats-window__body two-col">
        <section className="stats-window__allocate" aria-label="Stat allocation">
          <table className="stats-window__alloc-table">
            <thead>
              <tr>
                <th scope="col">Stat</th>
                <th scope="col">Value</th>
                <th scope="col">Cost</th>
                <th scope="col" className="stats-window__alloc-actions-head">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(STAT_LABELS) as PrimaryStat[]).map((stat) => {
                const effKey = EFF_BY_STAT[stat]
                const base = sheet[stat]
                const bonus = (sheet[effKey] as number) - base
                const cost = sheet.statRaiseCosts[stat]
                const label = STAT_LABELS[stat]
                const canRaise = sheet.statPointsUnspent >= cost
                const raiseTitle = `Raise ${label} (+1, ${cost} pt)`
                const maxTitle = `Spend all remaining points on ${label}`
                return (
                  <tr key={stat}>
                    <td className="stats-window__alloc-stat">{label}</td>
                    <td className="stats-window__alloc-value">
                      <span className="stats-window__stat-base">{base}</span>
                      {bonus > 0 && (
                        <span className="stats-window__stat-bonus">+{bonus}</span>
                      )}
                    </td>
                    <td className="stats-window__alloc-cost muted small">{cost} pt</td>
                    <td className="stats-window__alloc-actions">
                      <button
                        type="button"
                        className="modal-icon-btn stats-window__raise-btn"
                        disabled={!canRaise}
                        title={raiseTitle}
                        aria-label={raiseTitle}
                        onClick={() => raise(stat)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="modal-icon-btn stats-window__max-btn"
                        disabled={!canRaise}
                        title={maxTitle}
                        aria-label={maxTitle}
                        onClick={() => raiseMax(stat)}
                      >
                        MAX
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

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
            <div className="stats-window__details-meta">
              <div className="stats-window__char-id">
                <span className="stats-window__char-id-label">Char ID:</span>
                <button
                  type="button"
                  className="stats-window__copy-id-btn"
                  title={character.id}
                  aria-label={idCopied ? 'Character ID copied' : `Copy character ID ${character.id}`}
                  onClick={() => void copyCharacterId()}
                >
                  {idCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="stats-window__points">
                Points: <strong>{sheet.statPointsUnspent}</strong>
              </p>
            </div>
        </section>
      </div>
      </ModalScrollBody>
    </AnimatedModal>
  )
}
