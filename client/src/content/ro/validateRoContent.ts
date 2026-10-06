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

  const mapIds = new Set(pack.maps.map((m) => m.id))
  for (const [mapId, spawns] of Object.entries(pack.mobSpawns)) {
    for (const spawn of spawns) {
      assert(mobIds.has(spawn.defId), `spawn on ${mapId} references unknown mob ${spawn.defId}`)
    }
    if (mapIds.size > 0 && !mapIds.has(mapId)) {
      assert(false, `mobSpawns key ${mapId} has no matching map entry`)
    }
  }
}
