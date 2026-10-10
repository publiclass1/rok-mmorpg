import { useState } from 'react'
import { partyManage } from '../lib/api'
import {
  approximateMemberVitals,
  createParty as createPartyRpc,
  MAX_PARTY_SIZE,
  type PartyMemberInfo,
  type PartyMemberVitals,
  type PartySnapshot,
} from '../lib/partyState'
import type { CharacterSheetPayload } from '../game/events'
import { CharacterAppearancePreview } from './CharacterAppearancePreview'
import { PartyMemberRow } from './PartyMemberRow'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'

type Props = {
  characterId: string
  snapshot: PartySnapshot
  selfSheet: CharacterSheetPayload
  presenceByMemberId: Record<string, PartyMemberVitals>
  onClose: () => void
  onChanged: () => void
  onMessage: (msg: string) => void
}

function vitalsForMember(
  memberId: string,
  characterId: string,
  member: PartyMemberInfo,
  selfSheet: CharacterSheetPayload,
  presenceByMemberId: Record<string, PartyMemberVitals>,
): PartyMemberVitals {
  if (memberId === characterId) {
    return { hp: selfSheet.hp, hpMax: selfSheet.hpMax, mp: selfSheet.mp, mpMax: selfSheet.mpMax }
  }
  const live = presenceByMemberId[memberId]
  if (live) return live
  return approximateMemberVitals(member)
}

export function PartyWindow({
  characterId,
  snapshot,
  selfSheet,
  presenceByMemberId,
  onClose,
  onChanged,
  onMessage,
}: Props) {
  const [partyName, setPartyName] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [busy, setBusy] = useState(false)

  const isLeader = snapshot?.party.leader_character_id === characterId

  async function run(action: () => Promise<unknown>, successMsg?: string) {
    setBusy(true)
    try {
      await action()
      if (successMsg) onMessage(successMsg)
      onChanged()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Party action failed')
    } finally {
      setBusy(false)
    }
  }

  async function createParty() {
    const name = partyName.trim()
    if (!name) {
      onMessage('Enter a party name.')
      return
    }
    await run(async () => {
      await createPartyRpc(characterId, name)
      setPartyName('')
    }, 'Party created.')
  }

  async function inviteByName() {
    const targetName = inviteName.trim()
    if (!targetName) {
      onMessage('Enter a character name to invite.')
      return
    }
    await run(async () => {
      await partyManage({ action: 'invite', characterId, targetName })
      setInviteName('')
    }, 'Party invite sent.')
  }

  return (
    <AnimatedModal
      onClose={onClose}
      role="dialog"
      aria-modal="true"
      panelClassName="panel modal party-modal"
    >
      <ModalHeader title="Party" onClose={onClose} className="party-modal__header" />
      {snapshot ? (
        <div className="party-modal__body">
          <div className="party-modal__meta">
            <strong className="party-modal__title">{snapshot.party.name}</strong>
            <span className="muted small">
              {snapshot.members.length}/{MAX_PARTY_SIZE}
            </span>
          </div>

          {isLeader && snapshot.pendingApplications.length > 0 && (
            <section className="party-modal__pending" aria-label="Pending applications">
              <h3 className="party-modal__section-label small">Pending</h3>
              <ul className="party-modal__pending-list">
                {snapshot.pendingApplications.map((app) => (
                  <li key={app.request.id} className="party-modal__pending-row">
                    <CharacterAppearancePreview appearance={app.appearance} jobId={app.jobId} size="sm" />
                    <div className="party-modal__pending-info">
                      <span className="party-modal__member-name">{app.name}</span>
                      <span className="muted small">Lv {app.baseLevel}</span>
                    </div>
                    <div className="party-modal__pending-actions">
                      <button
                        type="button"
                        className="hud-btn small"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              partyManage({
                                action: 'accept',
                                characterId,
                                requestId: app.request.id,
                              }),
                            `${app.name} joined the party.`,
                          )
                        }
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        className="secondary hud-btn small"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              partyManage({
                                action: 'decline',
                                characterId,
                                requestId: app.request.id,
                              }),
                          )
                        }
                      >
                        No
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ul className="party-modal__roster" aria-label="Party members">
            {snapshot.members.map((m) => (
              <PartyMemberRow
                key={m.characterId}
                member={m}
                vitals={vitalsForMember(m.characterId, characterId, m, selfSheet, presenceByMemberId)}
                isSelf={m.characterId === characterId}
                viewerIsLeader={isLeader}
                busy={busy}
                onAction={(fn, msg) => void run(fn, msg)}
                characterId={characterId}
              />
            ))}
          </ul>

          <footer className="party-modal__footer">
            {isLeader && (
              <>
                <div className="row gap party-modal__invite">
                  <input
                    type="text"
                    placeholder="Invite by name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    maxLength={32}
                    disabled={busy}
                  />
                  <button type="button" className="hud-btn small" disabled={busy} onClick={() => void inviteByName()}>
                    Invite
                  </button>
                </div>
                <label className="small row gap party-modal__exp-share">
                  <input
                    type="checkbox"
                    checked={snapshot.party.exp_share}
                    disabled={busy}
                    onChange={() =>
                      void run(() =>
                        partyManage({
                          action: 'set_exp_share',
                          characterId,
                          expShare: !snapshot.party.exp_share,
                        }),
                      )
                    }
                  />
                  EXP share
                </label>
                <button
                  type="button"
                  className="secondary hud-btn small party-modal__footer-btn"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await partyManage({ action: 'disband', characterId })
                      onClose()
                    })
                  }
                >
                  Disband
                </button>
              </>
            )}
            {!isLeader && (
              <button
                type="button"
                className="secondary hud-btn small party-modal__footer-btn"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await partyManage({ action: 'leave', characterId })
                    onClose()
                  })
                }
              >
                Leave party
              </button>
            )}
          </footer>
        </div>
      ) : (
        <div className="party-modal__body party-modal__create">
          <p className="muted small">Create a party and invite others by character name.</p>
          <label className="small party-modal__field">
            Party name
            <input
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              maxLength={24}
              disabled={busy}
            />
          </label>
          <div className="row gap party-modal__actions">
            <button type="button" disabled={busy} onClick={() => void createParty()}>
              Create party
            </button>
            <button type="button" className="secondary" disabled={busy} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </AnimatedModal>
  )
}
