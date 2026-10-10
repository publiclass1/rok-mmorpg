import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

type ItemsFile = {
  items: Array<{
    id: string
    name: string
    stackMax?: number
    type?: string
    weight?: number
    equipSlot?: string | null
    metadata?: Record<string, unknown>
  }>
}

async function seedItems() {
  const raw = readFileSync(path.join(repoRoot, 'content/ro/items.json'), 'utf8')
  const parsed = JSON.parse(raw) as ItemsFile
  for (const item of parsed.items) {
    await prisma.item.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.name,
        stackMax: item.stackMax ?? 99,
        itemType: item.type ?? null,
        weight: item.weight ?? null,
        equipSlot: item.equipSlot ?? null,
        metadata: item.metadata ?? {},
      },
      update: {
        name: item.name,
        stackMax: item.stackMax ?? 99,
        itemType: item.type ?? null,
        weight: item.weight ?? null,
        equipSlot: item.equipSlot ?? null,
        metadata: item.metadata ?? {},
      },
    })
  }
}

async function seedNpcs() {
  const npcs = JSON.parse(
    readFileSync(path.join(repoRoot, 'server/prisma/data/npcs.json'), 'utf8'),
  ) as Array<{
    id: string
    map_id: string
    x: number
    y: number
    npc_type: string
    label: string
    config: unknown
  }>

  for (const npc of npcs) {
    await prisma.npcDefinition.upsert({
      where: { id: npc.id },
      create: {
        id: npc.id,
        mapId: npc.map_id,
        x: npc.x,
        y: npc.y,
        npcType: npc.npc_type,
        label: npc.label,
        config: npc.config ?? {},
      },
      update: {
        mapId: npc.map_id,
        x: npc.x,
        y: npc.y,
        npcType: npc.npc_type,
        label: npc.label,
        config: npc.config ?? {},
      },
    })
  }
}

async function seedSettings() {
  for (const [key, value] of [['exp_rate', 1], ['drop_rate', 1]]) {
    await prisma.gameSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }
}

async function main() {
  await seedItems()
  await seedNpcs()
  await seedSettings()
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
