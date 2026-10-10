import { prisma } from '../lib/prisma.js'
import { toSnakeRow, toSnakeRows } from '../lib/rowMaps.js'

const STARTER_SKILL_BAR = ['basic_attack', null, null, null, null, null, null, null, null]
const STARTER_SESSION_INV = [
  'knife',
  'cotton_shirt',
  'cap',
  'goggles',
  'flu_mask',
  'wooden_shield',
  'hooded_mantle',
  'sandals',
  'clip',
  'glove',
]

export async function listCharactersForUser(userId: string) {
  const rows = await prisma.character.findMany({
    where: { userId },
    orderBy: { slot: 'asc' },
  })
  return toSnakeRows(rows as Record<string, unknown>[])
}

export async function createCharacter(
  userId: string,
  input: {
    name: string
    slot: number
    gender?: string
    bodyColor?: number
    hairColor?: number
    eyeColor?: number
    clothesColor?: number
  },
) {
  const count = await prisma.character.count({ where: { userId } })
  if (count >= 3) throw new Error('Maximum of 3 characters per account')

  const existingSlot = await prisma.character.findFirst({ where: { userId, slot: input.slot } })
  if (existingSlot) throw new Error('This slot is already in use')

  const character = await prisma.$transaction(async (tx) => {
    const created = await tx.character.create({
      data: {
        userId,
        name: input.name,
        slot: input.slot,
        gender: input.gender ?? 'male',
        bodyColor: input.bodyColor ?? 2,
        hairColor: input.hairColor ?? 1,
        eyeColor: input.eyeColor ?? 0,
        clothesColor: input.clothesColor ?? 0,
      },
    })

    await tx.characterProgress.create({
      data: {
        characterId: created.id,
        jobId: 'novice',
        skillBar: STARTER_SKILL_BAR,
        sessionInventory: STARTER_SESSION_INV,
      },
    })

    await tx.characterSkill.create({
      data: { characterId: created.id, skillId: 'basic_attack', level: 1 },
    })

    await tx.characterInventory.create({
      data: { characterId: created.id, itemId: 'red_potion', quantity: 5 },
    })

    return created
  })

  return toSnakeRow(character as Record<string, unknown>)
}

export async function deleteCharacter(userId: string, characterId: string) {
  const row = await prisma.character.findFirst({ where: { id: characterId, userId } })
  if (!row) throw new Error('Character not found')
  await prisma.character.delete({ where: { id: characterId } })
}

export async function loadCharacterSession(characterId: string, userId: string) {
  const character = await prisma.character.findFirst({ where: { id: characterId, userId } })
  if (!character) throw new Error('Character not found')

  const [progress, skills, equipment] = await Promise.all([
    prisma.characterProgress.findUnique({ where: { characterId } }),
    prisma.characterSkill.findMany({ where: { characterId } }),
    prisma.characterEquipment.findMany({ where: { characterId } }),
  ])

  return {
    character: toSnakeRow(character as Record<string, unknown>),
    progress: progress ? toSnakeRow(progress as Record<string, unknown>) : null,
    skills: toSnakeRows(skills as Record<string, unknown>[]),
    equipment: toSnakeRows(equipment as Record<string, unknown>[]),
  }
}

export async function patchCharacterWorld(
  userId: string,
  characterId: string,
  world: { mapId: string; x: number; y: number },
) {
  const row = await prisma.character.findFirst({ where: { id: characterId, userId } })
  if (!row) throw new Error('Character not found')
  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { mapId: world.mapId, x: world.x, y: world.y },
  })
  return toSnakeRow(updated as Record<string, unknown>)
}
