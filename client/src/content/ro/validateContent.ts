import { loadRoContent } from './loadContent'

const pack = loadRoContent()
console.log(
  `[content:validate] OK — pack=${pack.manifest.contentPackId} ruleset=${pack.manifest.ruleset} jobs=${pack.jobs.length} skills=${pack.skills.length} items=${pack.items.length} mobs=${pack.mobs.length} maps=${pack.maps.length} expTables=base${pack.expTables.baseExpToNext.length}`,
)
