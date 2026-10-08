import { applyJobChange } from '../client/src/game/character/jobChange.ts'
import {
  createInitialCharacterState,
  reconcileProgressBudgetForSave,
} from '../client/src/game/character/characterState.ts'
import { syncDerivedVitals } from '../client/src/game/character/characterSheet.ts'
import { validateCharacterProgress } from '../supabase/functions/_shared/validateProgress.ts'

const mage = {
  ...createInitialCharacterState(),
  jobId: 'mage',
  progress: {
    ...createInitialCharacterState().progress,
    baseLevel: 40,
    jobLevel: 40,
    baseExp: 0,
    jobExp: 0,
  },
  skills: {
    ...createInitialCharacterState().skills,
    fire_bolt: 10,
    cold_bolt: 10,
    lightning_bolt: 10,
  },
  skillPointsUnspent: 9,
}

const wizard = syncDerivedVitals(reconcileProgressBudgetForSave(applyJobChange(mage, 'wizard')))
const skills = Object.entries(wizard.skills).map(([skill_id, level]) => ({ skill_id, level }))
const progress = {
  job_id: wizard.jobId,
  base_level: wizard.progress.baseLevel,
  base_exp: wizard.progress.baseExp,
  job_level: wizard.progress.jobLevel,
  job_exp: wizard.progress.jobExp,
  str: wizard.str,
  agi: wizard.agi,
  vit: wizard.vit,
  stat_int: wizard.int,
  dex: wizard.dex,
  luk: wizard.luk,
  stat_points_unspent: wizard.statPointsUnspent,
  skill_points_unspent: wizard.skillPointsUnspent,
  hp: wizard.hp,
  mp: wizard.mp,
  skill_bar: wizard.skillBars,
  session_inventory: wizard.sessionInventory,
  rolled_items: wizard.rolledItems,
  active_rental: wizard.activeRental,
}
const EQUIP_SLOTS = [
  'weapon',
  'headTop',
  'headMiddle',
  'headLower',
  'armor',
  'garment',
  'boots',
  'offhand',
  'accLeft',
  'accRight',
] as const
const equipRows = EQUIP_SLOTS.filter((slot) => wizard.equipment[slot] != null).map((slot) => {
  const equippedId = wizard.equipment[slot] as string
  const baseId = equippedId.startsWith('ri:') ? equippedId.split(':')[1] : equippedId
  return {
    slot,
    item_id: baseId,
    instance_id: equippedId.startsWith('ri:') ? equippedId : null,
  }
})

console.log('client skill unspent', wizard.skillPointsUnspent)
console.log('equip', equipRows)
console.log(validateCharacterProgress(progress, skills, equipRows))
