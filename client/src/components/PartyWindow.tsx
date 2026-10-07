import { useState } from 'react'
import { partyManage } from '../lib/api'
import { createParty as createPartyRpc, type PartySnapshot } from '../lib/partyState'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'
import { ModalScrollBody } from './motion/ModalScrollBody'

type Props = {
  characterId: string
  snapshot: PartySnapshot
  onClose: () => void
  onChanged: () => void
  onMessage: (msg: string) => void
}

export function PartyWindow({ characterId, snapshot, onClose, onChanged, onMessage }: Props) {
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
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="panel modal party-modal">
      <ModalHeader title="Party" onClose={onClose} className="party-modal__header" />
      <ModalScrollBody>
      {snapshot ? (
        <>
          <p className="party-modal__title">
            <strong>{snapshot.party.name}</strong>
          </p>
          <ul className="item-list party-modal__members">
            {snapshot.members.map((m) => {
              const isMemberLeader = m.characterId === snapshot.party.leader_character_id
              const isSelf = m.characterId === characterId
              return (
                <li key={m.characterId} className="small party-modal__member-row row spread gap">
                  <span>
                    {m.name}
                    {isMemberLeader ? ' (Leader)' : ''}
                    {isSelf ? ' (You)' : ''}
                  </span>
                  {isLeader && !isSelf && (
                    <span className="row gap party-modal__member-actions">
                      <button
                        type="button"
                        className="secondary hud-btn small"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              partyManage({
                                action: 'transfer_leader',
                                characterId,
                                targetCharacterId: m.characterId,
                              }),
                            `${m.name} is now party leader.`,
                          )
                        }
                      >
                        Make leader
                      </button>
                      <button
                        type="button"
                        className="secondary hud-btn small"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () =>
                              partyManage({
                                action: 'kick',
                                characterId,
                                targetCharacterId: m.characterId,
                              }),
                            `${m.name} was removed from the party.`,
                          )
                        }
                      >
                        Kick
                      </button>
                    </span>
                  )}
                </li>
              )
            })}
          </ul>

          {isLeader && (
            <>
              <div className="row gap party-modal__invite">
                <input
                  type="text"
                  placeholder="Character name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  maxLength={32}
                  disabled={busy}
                />
                <button type="button" disabled={busy} onClick={() => void inviteByName()}>
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
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await partyManage({ action: 'disband', characterId })
                    onClose()
                  })
                }
              >
                Disband party
              </button>
            </>
          )}

          {!isLeader && (
            <button
              type="button"
              className="secondary"
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
        </>
      ) : (
        <div className="party-modal__create">
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
      </ModalScrollBody>
    </AnimatedModal>
  )
}
