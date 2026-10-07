import type { CharacterAppearance } from '../game/character/characterAppearance'
import type { EquipSlot } from '../game/character/characterState'
import { dispatchCharacterAction } from '../game/character/characterActionDispatch'
import type { CharacterSheetPayload } from '../game/events'
import { CharacterEquipReadOnly } from './CharacterEquipReadOnly'
import { AnimatedModal } from './motion/AnimatedModal'
import { ModalHeader } from './motion/ModalHeader'

type Props = {
  sheet: CharacterSheetPayload
  appearance: CharacterAppearance
  onClose: () => void
}

export function EquipmentWindow({ sheet, appearance, onClose }: Props) {
  function unequip(slot: EquipSlot) {
    dispatchCharacterAction({ type: 'equip', slot, itemId: null })
  }

  return (
    <AnimatedModal onClose={onClose} panelClassName="panel modal equipment-modal">
      <ModalHeader title="Equipment" onClose={onClose} />
      <CharacterEquipReadOnly
        equipment={sheet.equipment}
        appearance={appearance}
        jobId={sheet.jobId}
        onUnequip={unequip}
      />
    </AnimatedModal>
  )
}
