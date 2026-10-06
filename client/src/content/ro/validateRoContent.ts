import type { RoContentPack } from './types'

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
  }

  const allSkillIds = new Set(pack.skills.map((s) => s.id))
  const skillIds = new Set<string>()
  for (const skill of pack.skills) {
    assert(!skillIds.has(skill.id), `duplicate skill id: ${skill.id}`)
    skillIds.add(skill.id)
    assert(jobIds.has(skill.jobId), `skill ${skill.id} references unknown job ${skill.jobId}`)
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
  }

  const mobIds = new Set<string>()
  for (const mob of pack.mobs) {
    assert(!mobIds.has(mob.id), `duplicate mob id: ${mob.id}`)
    mobIds.add(mob.id)
    for (const drop of mob.drops) {
      assert(itemIds.has(drop.itemId), `mob ${mob.id} drop references unknown item ${drop.itemId}`)
    }
    assert(mob.runtime.maxHp > 0, `mob ${mob.id} runtime.maxHp must be > 0`)
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
  for (const [mapId, spawns] of Object.entries(pack.mobSpawns)) {
    for (const spawn of spawns) {
      assert(mobIds.has(spawn.defId), `spawn on ${mapId} references unknown mob ${spawn.defId}`)
    }
    if (mapIds.size > 0 && !mapIds.has(mapId)) {
      assert(false, `mobSpawns key ${mapId} has no matching map entry`)
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
