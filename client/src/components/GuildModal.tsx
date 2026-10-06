import { useState } from 'react'
import { guildManage } from '../lib/api'
import type { GuildSnapshot } from '../lib/guildState'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  characterId: string
  snapshot: GuildSnapshot
  onClose: () => void
  onChanged: () => void
  onCharacterUpdated: () => void
  onMessage: (msg: string) => void
}

export function GuildModal({
  characterId,
  snapshot,
  onClose,
  onChanged,
  onCharacterUpdated,
  onMessage,
}: Props) {
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [busy, setBusy] = useState(false)

  async function createGuild() {
    setBusy(true)
    try {
      await guildManage({ action: 'create', characterId, name, tag })
      onCharacterUpdated()
      onChanged()
      onClose()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Guild creation failed')
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    setBusy(true)
    try {
      await guildManage({ action: 'leave', characterId })
      onChanged()
      onClose()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not leave guild')
    } finally {
      setBusy(false)
    }
  }

  async function disband() {
    setBusy(true)
    try {
      await guildManage({ action: 'disband', characterId })
      onChanged()
      onClose()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not disband guild')
    } finally {
      setBusy(false)
    }
  }

  const isLeader = snapshot?.guild.leader_character_id === characterId

  return (
    <AnimatedModal onClose={onClose} role="dialog" aria-modal="true" panelClassName="panel modal guild-modal">
      <div className="row spread modal-drag-handle guild-modal__header">
        <h2 style={{ margin: 0 }}>Guild</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {snapshot ? (
        <>
          <p>
            <strong>[{snapshot.guild.tag}]</strong> {snapshot.guild.name}
          </p>
          <ul className="item-list">
            {snapshot.members.map((m) => (
              <li key={m.characterId} className="small">
                {m.name} {m.role === 'leader' ? '(Leader)' : ''}
              </li>
            ))}
          </ul>
          {isLeader ? (
            <button type="button" className="secondary" disabled={busy} onClick={() => void disband()}>
              Disband guild
            </button>
          ) : (
            <button type="button" className="secondary" disabled={busy} onClick={() => void leave()}>
              Leave guild
            </button>
          )}
        </>
      ) : (
        <div className="guild-modal__create">
          <p className="muted small">Create a guild (5000 zeny).</p>
          <label className="small guild-modal__field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
          </label>
          <label className="small guild-modal__field">
            Tag (2–4)
            <input value={tag} onChange={(e) => setTag(e.target.value)} maxLength={4} />
          </label>
          <div className="row gap guild-modal__actions">
            <button type="button" disabled={busy} onClick={() => void createGuild()}>
              Create
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
