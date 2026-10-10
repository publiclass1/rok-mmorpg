import { prisma } from '../lib/prisma.js'
import { toSnakeRow, toSnakeRows } from '../lib/rowMaps.js'

export async function listCharacterSelectEntries(userId: string) {
  const characters = await prisma.character.findMany({ where: { userId }, orderBy: { slot: 'asc' } })
  if (characters.length === 0) return { entries: [] }

  const ids = characters.map((c) => c.id)
  const [progressRows, equipRows] = await Promise.all([
    prisma.characterProgress.findMany({
      where: { characterId: { in: ids } },
      select: {
        characterId: true,
        jobId: true,
        baseLevel: true,
        baseExp: true,
        jobLevel: true,
        jobExp: true,
      },
    }),
    prisma.characterEquipment.findMany({
      where: { characterId: { in: ids } },
      select: { characterId: true, slot: true, itemId: true },
    }),
  ])

  const progressByChar = new Map(progressRows.map((p) => [p.characterId, p]))
  const equipByChar = new Map<string, typeof equipRows>()
  for (const row of equipRows) {
    const bucket = equipByChar.get(row.characterId) ?? []
    bucket.push(row)
    equipByChar.set(row.characterId, bucket)
  }

  const entries = characters.map((character) => ({
    character: toSnakeRow(character as Record<string, unknown>),
    progress: progressByChar.get(character.id) ?? null,
    equipment: toSnakeRows((equipByChar.get(character.id) ?? []) as Record<string, unknown>[]),
  }))

  return { entries }
}
