import type { EquipSlot } from '../game/character/characterState'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'
import { CharacterEquipReadOnly } from './CharacterEquipReadOnly'
import { AnimatedModal } from './motion/AnimatedModal'

type Props = {
  sheet: CharacterSheetPayload
  onClose: () => void
}

export function EquipmentWindow({ sheet, onClose }: Props) {
  function unequip(slot: EquipSlot) {
    dispatchCharacterAction({ type: 'equip', slot, itemId: null })
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal equipment-modal">
      <div className="row spread modal-drag-handle">
        <h2 style={{ margin: 0 }}>Equipment</h2>
        <button type="button" className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <CharacterEquipReadOnly equipment={sheet.equipment} onUnequip={unequip} />
    </AnimatedModal>
  )
}
