import { partyManage } from '../lib/api'
import type { PartyMemberInfo, PartyMemberVitals } from '../lib/partyState'
import { CharacterAppearancePreview } from './CharacterAppearancePreview'

type Props = {
  member: PartyMemberInfo
  vitals: PartyMemberVitals
  isSelf: boolean
  viewerIsLeader: boolean
  busy: boolean
  onAction: (fn: () => Promise<unknown>, successMsg?: string) => void
  characterId: string
}

export function PartyMemberRow({
  member,
  vitals,
  isSelf,
  viewerIsLeader,
  busy,
  onAction,
  characterId,
}: Props) {
  const hpRatio = vitals.hpMax > 0 ? vitals.hp / vitals.hpMax : 0
  const mpRatio = vitals.mpMax > 0 ? vitals.mp / vitals.mpMax : 0

  return (
    <li className="party-modal__member">
      <CharacterAppearancePreview appearance={member.appearance} jobId={member.jobId} size="sm" />
      <div className="party-modal__member-main">
        <div className="party-modal__member-title">
          <span className="party-modal__member-name" title={member.name}>
            {member.name}
            {member.isLeader ? <span className="party-modal__leader-mark" aria-label="Leader">★</span> : null}
            {isSelf ? <span className="muted"> (you)</span> : null}
          </span>
          <span className="party-modal__member-lvl muted small">Lv {member.baseLevel}</span>
        </div>
        <div className="party-modal__member-vitals">
          <div className="party-modal__vital-row">
            <span className="party-modal__vital-label">HP</span>
            <div className="vital-track party-modal__vital-track">
              <div className="vital-fill vital-fill--hp" style={{ width: `${hpRatio * 100}%` }} />
            </div>
            <span className="party-modal__vital-num">{vitals.hp}</span>
          </div>
          <div className="party-modal__vital-row">
            <span className="party-modal__vital-label">SP</span>
            <div className="vital-track party-modal__vital-track">
              <div className="vital-fill vital-fill--mp" style={{ width: `${mpRatio * 100}%` }} />
            </div>
            <span className="party-modal__vital-num">{vitals.mp}</span>
          </div>
        </div>
      </div>
      {viewerIsLeader && !isSelf && (
        <div className="party-modal__member-menu">
          <button
            type="button"
            className="secondary hud-btn small party-modal__icon-btn"
            title="Make leader"
            disabled={busy}
            onClick={() =>
              onAction(
                () =>
                  partyManage({
                    action: 'transfer_leader',
                    characterId,
                    targetCharacterId: member.characterId,
                  }),
                `${member.name} is now party leader.`,
              )
            }
          >
            ★
          </button>
          <button
            type="button"
            className="secondary hud-btn small party-modal__icon-btn"
            title="Kick"
            disabled={busy}
            onClick={() =>
              onAction(
                () =>
                  partyManage({
                    action: 'kick',
                    characterId,
                    targetCharacterId: member.characterId,
                  }),
                `${member.name} was removed.`,
              )
            }
          >
            ✕
          </button>
        </div>
      )}
    </li>
  )
}
