import { partyManage } from '../lib/api'
import type { PartySnapshot } from '../lib/partyState'

type Props = {
  characterId: string
  snapshot: PartySnapshot | null
  onChanged: () => void
  onMessage: (msg: string) => void
}

export function PartyPanel({ characterId, snapshot, onChanged, onMessage }: Props) {
  if (!snapshot) return null

  const isLeader = snapshot.party.leader_character_id === characterId

  async function toggleExpShare() {
    try {
      await partyManage({
        action: 'set_exp_share',
        characterId,
        expShare: !snapshot.party.exp_share,
      })
      onChanged()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not update EXP share')
    }
  }

  async function leave() {
    try {
      await partyManage({ action: 'leave', characterId })
      onChanged()
    } catch (err) {
      onMessage(err instanceof Error ? err.message : 'Could not leave party')
    }
  }

  return (
    <div className="party-panel">
      <h3>Party</h3>
      <ul className="item-list">
        {snapshot.members.map((m) => (
          <li key={m.characterId} className="small">
            {m.name}
            {m.characterId === snapshot.party.leader_character_id ? ' (L)' : ''}
          </li>
        ))}
      </ul>
      {isLeader && (
        <label className="small row gap">
          <input
            type="checkbox"
            checked={snapshot.party.exp_share}
            onChange={() => void toggleExpShare()}
          />
          EXP share
        </label>
      )}
      <button type="button" className="secondary hud-btn small" onClick={() => void leave()}>
        Leave party
      </button>
    </div>
  )
}
