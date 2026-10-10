/**
 * Generates rarity_rd_* items and prints stock JSON for rarity dealers.
 * Run: node scripts/generate-rarity-dealer-content.mjs
 * Appends new items to content/ro/items.json (skips existing ids).
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = path.join(root, 'content/ro/rarityDealerCatalog.json')
const itemsPath = path.join(root, 'content/ro/items.json')

const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'))
const itemsDoc = JSON.parse(await fs.readFile(itemsPath, 'utf8'))
const existing = new Set(itemsDoc.items.map((i) => i.id))

const ZERO_BONUSES = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 }

function itemId(slot, level) {
  return `rarity_rd_${slot}_${level}`
}

const newItems = []
const stockByDealer = { armor: [], head: [], accessory: [] }

for (const [kind, slots] of Object.entries(catalog.dealerKinds)) {
  for (const slot of slots) {
    const meta = catalog.slots[slot]
    for (const tier of catalog.tiers) {
      const id = itemId(slot, tier.level)
      if (!existing.has(id)) {
        const item = {
          id,
          name: `${meta.name} (Lv.${tier.level})`,
          type: 'armor',
          weight: slot === 'offhand' ? 40 : 10,
          stackMax: 1,
          equipSlot: slot,
          layerColor: catalog.rarityColors[tier.rarity],
          bonuses: ZERO_BONUSES,
          requiredBaseLevel: tier.level,
          rarity: tier.rarity,
          dungeonRollable: false,
          iconFile: meta.iconFile,
          sourceUrl: null,
        }
        if (meta.offhandKind) item.offhandKind = meta.offhandKind
        newItems.push(item)
        existing.add(id)
      }
      const entry = { itemId: id, price: tier.price }
      stockByDealer[kind].push(entry)
    }
  }
}

if (newItems.length > 0) {
  itemsDoc.items.push(...newItems)
  await fs.writeFile(itemsPath, `${JSON.stringify(itemsDoc, null, 2)}\n`)
  console.log(`Added ${newItems.length} rarity dealer items to items.json`)
} else {
  console.log('No new items to add')
}

console.log('\nStock counts:', Object.fromEntries(Object.entries(stockByDealer).map(([k, v]) => [k, v.length])))

const npcsPath = path.join(root, 'server/prisma/data/npcs.json')
const npcs = JSON.parse(await fs.readFile(npcsPath, 'utf8'))

function upsertNpc(id, patch) {
  const i = npcs.findIndex((n) => n.id === id)
  if (i >= 0) Object.assign(npcs[i], patch)
  else npcs.push(patch)
}

upsertNpc('prontera_rarity_armor_dealer', {
  id: 'prontera_rarity_armor_dealer',
  map_id: 'prontera',
  x: 1344,
  y: 1856,
  npc_type: 'shop',
  label: 'Rarity Armor Dealer',
  config: {
    facing: 'down',
    shopLayout: 'raritySlotTabs',
    rarityDealerKind: 'armor',
    stock: stockByDealer.armor,
  },
})

upsertNpc('prontera_rarity_head_dealer', {
  id: 'prontera_rarity_head_dealer',
  map_id: 'prontera',
  x: 1600,
  y: 1856,
  npc_type: 'shop',
  label: 'Rarity Head Dealer',
  config: {
    facing: 'down',
    shopLayout: 'raritySlotTabs',
    rarityDealerKind: 'head',
    stock: stockByDealer.head,
  },
})

upsertNpc('prontera_rarity_accessory_dealer', {
  id: 'prontera_rarity_accessory_dealer',
  map_id: 'prontera',
  x: 1856,
  y: 1856,
  npc_type: 'shop',
  label: 'Rarity Accessory Dealer',
  config: {
    facing: 'down',
    shopLayout: 'raritySlotTabs',
    rarityDealerKind: 'accessory',
    stock: stockByDealer.accessory,
  },
})

await fs.writeFile(npcsPath, `${JSON.stringify(npcs, null, 2)}\n`)
console.log('Updated server/prisma/data/npcs.json')
