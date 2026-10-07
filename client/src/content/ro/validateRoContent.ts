import type { RoContentPack, WeaponClass } from './types'
import { PLAYER_AVATAR_KEYS } from '../../game/player/playerJobAvatar'

const WEAPON_CLASSES = new Set<WeaponClass>(['knife', 'sword', 'spear', 'staff', 'bow'])
const ALLOWED_AVATAR_KEYS = new Set<string>(PLAYER_AVATAR_KEYS)

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[content/ro] ${message}`)
}

export function validateRoContent(pack: RoContentPack): void {
  assert(pack.manifest.schemaVersion >= 1, 'manifest.schemaVersion must be >= 1')
  assert(pack.manifest.ruleset === 'pre-renewal', 'manifest.ruleset must be "pre-renewal"')

  const jobIds = new Set<string>()
  for (const job of pack.jobs) {
    assert(Boolean(job.id), 'job missing id')
    assert(!jobIds.has(job.id), `duplicate job id: ${job.id}`)
    jobIds.add(job.id)
  }
  for (const job of pack.jobs) {
    if (job.parentJobId) {
      assert(jobIds.has(job.parentJobId), `job ${job.id} references unknown parentJobId: ${job.parentJobId}`)
    }
    if (job.id !== 'monster') {
      const key = job.avatarKey ?? 'novice'
      assert(ALLOWED_AVATAR_KEYS.has(key), `job ${job.id} invalid avatarKey: ${key}`)
    }
  }

  const allSkillIds = new Set(pack.skills.map((s) => s.id))
  const skillIds = new Set<string>()
  for (const skill of pack.skills) {
    assert(!skillIds.has(skill.id), `duplicate skill id: ${skill.id}`)
    skillIds.add(skill.id)
    if (skill.jobId !== 'monster') {
      assert(jobIds.has(skill.jobId), `skill ${skill.id} references unknown job ${skill.jobId}`)
    }
    for (const pre of skill.prerequisites) {
      assert(allSkillIds.has(pre.skillId), `skill ${skill.id} prerequisite unknown: ${pre.skillId}`)
    }
    if (skill.selfBuff) {
      assert(Boolean(skill.selfBuff.statusId), `skill ${skill.id} selfBuff missing statusId`)
      assert(skill.selfBuff.durationMsBase > 0, `skill ${skill.id} selfBuff.durationMsBase must be > 0`)
      if (skill.selfBuff.durationMsPerLevel != null) {
        assert(skill.selfBuff.durationMsPerLevel >= 0, `skill ${skill.id} selfBuff.durationMsPerLevel must be >= 0`)
      }
    }
  }

  const itemIds = new Set<string>()
  for (const item of pack.items) {
    assert(!itemIds.has(item.id), `duplicate item id: ${item.id}`)
    itemIds.add(item.id)
    if (item.equipSlot) {
      assert(item.bonuses != null, `equippable item ${item.id} must have bonuses`)
      assert(item.layerColor != null, `equippable item ${item.id} must have layerColor`)
    }
    if (item.requiredBaseLevel != null) {
      assert(item.requiredBaseLevel >= 1, `item ${item.id} requiredBaseLevel must be >= 1`)
    }
    if (item.requiredJobIds != null) {
      for (const jobId of item.requiredJobIds) {
        assert(jobIds.has(jobId), `item ${item.id} requiredJobIds references unknown job ${jobId}`)
      }
    }
    if (item.type === 'weapon') {
      assert(item.weaponClass != null, `weapon item ${item.id} must define weaponClass`)
      assert(
        WEAPON_CLASSES.has(item.weaponClass),
        `weapon item ${item.id} has unknown weaponClass: ${item.weaponClass}`,
      )
    }
  }

  const mobIds = new Set<string>()
  for (const mob of pack.mobs) {
    assert(!mobIds.has(mob.id), `duplicate mob id: ${mob.id}`)
    mobIds.add(mob.id)
    for (const drop of mob.drops) {
      assert(itemIds.has(drop.itemId), `mob ${mob.id} drop references unknown item ${drop.itemId}`)
    }
    assert(mob.runtime.maxHp > 0, `mob ${mob.id} runtime.maxHp must be > 0`)
    if (mob.skills) {
      for (const entry of mob.skills) {
        const skill = pack.skills.find((s) => s.id === entry.skillId)
        assert(skill != null, `mob ${mob.id} skill references unknown skill ${entry.skillId}`)
        assert(entry.level >= 1, `mob ${mob.id} skill ${entry.skillId} level must be >= 1`)
        assert(skill.type === 'active', `mob ${mob.id} skill ${entry.skillId} must be active`)
        assert(skill.target === 'enemy', `mob ${mob.id} skill ${entry.skillId} must target enemy`)
        if (entry.chance != null) {
          assert(entry.chance >= 0 && entry.chance <= 1, `mob ${mob.id} skill ${entry.skillId} chance must be 0–1`)
        }
        if (entry.cooldownMs != null) {
          assert(entry.cooldownMs > 0, `mob ${mob.id} skill ${entry.skillId} cooldownMs must be > 0`)
        }
      }
    }
  }

  assert(pack.expTables.baseExpToNext.length === pack.expTables.baseLevelCap, 'baseExpToNext length must match baseLevelCap')
  assert(pack.expTables.statPointsOnBaseLevelUp.length === pack.expTables.baseLevelCap, 'statPointsOnBaseLevelUp length must match baseLevelCap')
  assert(pack.expTables.jobBaseHp.novice?.length === pack.expTables.baseLevelCap, 'jobBaseHp.novice length must match baseLevelCap')

  for (const item of pack.items) {
    if (item.type === 'consumable') {
      assert(item.consumable != null, `consumable item ${item.id} must define consumable effect`)
    }
  }

  const mapIds = new Set(pack.maps.map((m) => m.id))
  for (const [mapId, spots] of Object.entries(pack.mobSpots)) {
    for (const spot of spots) {
      assert(mobIds.has(spot.defId), `mob spot on ${mapId} references unknown mob ${spot.defId}`)
      assert(spot.count >= 1, `mob spot ${spot.id} on ${mapId} count must be >= 1`)
      assert(spot.spawnsPerMinute > 0, `mob spot ${spot.id} on ${mapId} spawnsPerMinute must be > 0`)
      assert(spot.width > 0 && spot.height > 0, `mob spot ${spot.id} on ${mapId} must have positive size`)
    }
    if (mapIds.size > 0 && !mapIds.has(mapId)) {
      assert(false, `mobSpots key ${mapId} has no matching map entry`)
    }
  }

  for (const band of pack.loot.levelBands) {
    assert(band.minLevel <= band.maxLevel, 'loot levelBand minLevel must be <= maxLevel')
    assert(band.chancePerMille >= 0 && band.chancePerMille <= 10000, 'loot chancePerMille out of range')
    assert(band.items.length > 0, 'loot levelBand must have items')
    for (const entry of band.items) {
      assert(itemIds.has(entry.itemId), `loot band references unknown item ${entry.itemId}`)
      assert(entry.weight > 0, `loot band item ${entry.itemId} weight must be > 0`)
    }
  }

  for (const floor of pack.dungeons.floors) {
    assert(mapIds.has(floor.mapId), `dungeon floor ${floor.id} references unknown map ${floor.mapId}`)
    assert(mobIds.has(floor.mvpDefId), `dungeon floor ${floor.id} mvpDefId unknown: ${floor.mvpDefId}`)
    const mvp = pack.mobs.find((m) => m.id === floor.mvpDefId)
    assert(mvp?.boss === true, `dungeon floor ${floor.id} mvp ${floor.mvpDefId} must have boss: true`)
    assert(floor.minLevel <= floor.maxLevel, `dungeon floor ${floor.id} invalid level band`)
  }
  for (const slot of pack.dungeons.gear.dropSlots) {
    const hasBase = pack.items.some((i) => i.equipSlot === slot)
    assert(hasBase, `dungeon gear drop slot ${slot} has no base items in items.json`)
  }

  const equipSlots = new Set([
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
  ])
  for (const [npcId, offers] of Object.entries(pack.jobMaster.offersByNpcId)) {
    assert(Boolean(npcId), 'jobMaster offer npc id required')
    for (const offer of offers) {
      assert(jobIds.has(offer.jobId), `jobMaster ${npcId} unknown target job ${offer.jobId}`)
      if (offer.fromJobId) {
        assert(jobIds.has(offer.fromJobId), `jobMaster ${npcId} unknown fromJobId ${offer.fromJobId}`)
      }
      assert(offer.requiredJobLevel >= 1, `jobMaster ${npcId} offer ${offer.jobId} invalid job level`)
    }
  }

  const rentalKinds = new Set(['cart', 'peco_peco', 'falcon'])
  for (const [kind, entry] of Object.entries(pack.rentals.catalog)) {
    assert(rentalKinds.has(kind), `rentals catalog unknown kind ${kind}`)
    assert(entry.zenyCost >= 0, `rentals ${kind} zenyCost invalid`)
    assert(entry.durationMs > 0, `rentals ${kind} durationMs invalid`)
    assert(entry.speedMultiplier > 0, `rentals ${kind} speedMultiplier invalid`)
    for (const jid of entry.requiredJobIds) {
      assert(jobIds.has(jid), `rentals ${kind} unknown job ${jid}`)
    }
    for (const req of entry.requiredSkills) {
      assert(skillIds.has(req.skillId), `rentals ${kind} unknown skill ${req.skillId}`)
    }
  }
  for (const [npcId, offers] of Object.entries(pack.rentals.offersByNpcId)) {
    assert(Boolean(npcId), 'rentals offer npc id required')
    for (const kind of offers) {
      assert(rentalKinds.has(kind), `rentals ${npcId} unknown offer ${kind}`)
      assert(
        kind in pack.rentals.catalog,
        `rentals ${npcId} missing catalog ${kind}`,
      )
    }
  }

  for (const [jobId, kit] of Object.entries(pack.jobStarterGear.kits)) {
    assert(jobIds.has(jobId), `jobStarterGear kit references unknown job ${jobId}`)
    for (const piece of kit.pieces) {
      assert(equipSlots.has(piece.slot), `jobStarterGear ${jobId} invalid slot ${piece.slot}`)
      assert(itemIds.has(piece.baseItemId), `jobStarterGear ${jobId} unknown item ${piece.baseItemId}`)
      const item = pack.items.find((i) => i.id === piece.baseItemId)
      assert(item?.equipSlot === piece.slot, `jobStarterGear ${jobId} item ${piece.baseItemId} slot mismatch`)
    }
  }

  for (const [mapId, portalList] of Object.entries(pack.portals)) {
    if (mapIds.size > 0 && !mapIds.has(mapId)) {
      assert(false, `portals key ${mapId} has no matching map entry`)
    }
    const seen = new Set<string>()
    for (const portal of portalList) {
      assert(Boolean(portal.id), `portal on ${mapId} missing id`)
      assert(!seen.has(portal.id), `duplicate portal id on ${mapId}: ${portal.id}`)
      seen.add(portal.id)
      assert(mapIds.has(portal.targetMapId), `portal ${portal.id} on ${mapId} targets unknown map ${portal.targetMapId}`)
      assert(portal.width > 0 && portal.height > 0, `portal ${portal.id} on ${mapId} must have positive size`)
    }
  }
}
