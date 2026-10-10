import { prisma } from './prisma.js'
import { toSnakeRow } from './rowMaps.js'

export async function runRpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  if (fn === 'pickup_field_map_drop') {
    return pickupFieldMapDrop(args)
  }
  if (fn === 'dungeon_report_kill') {
    return dungeonReportKill(args)
  }
  if (fn === 'dungeon_complete') {
    return dungeonComplete(args)
  }
  throw new Error(`Unknown RPC: ${fn}`)
}

async function pickupFieldMapDrop(args: Record<string, unknown>) {
  const dropId = String(args.p_drop_id)
  const characterId = String(args.p_character_id)
  const mapId = String(args.p_map_id)
  const x = Number(args.p_x)
  const y = Number(args.p_y)

  return prisma.$transaction(async (tx) => {
    await tx.fieldMapDrop.deleteMany({
      where: { collectedAt: null, expiresAt: { lte: new Date() } },
    })

    const drop = await tx.fieldMapDrop.findUnique({ where: { id: dropId } })
    if (!drop || drop.collectedAt) throw new Error('Drop already collected or missing')
    if (drop.expiresAt <= new Date()) {
      await tx.fieldMapDrop.delete({ where: { id: dropId } })
      throw new Error('Drop expired')
    }
    if (drop.mapId !== mapId) throw new Error('Invalid drop location')
    const dist = Math.hypot(drop.x - x, drop.y - y)
    if (dist > 32) throw new Error('Too far from drop')
    if (drop.availableAt > new Date() && drop.ownerCharacterId !== characterId) {
      throw new Error('Drop is reserved for its owner')
    }

    const progress = await tx.characterProgress.findUnique({ where: { characterId } })
    if (!progress) throw new Error('Progress not found')

    const inv = Array.isArray(progress.sessionInventory)
      ? [...(progress.sessionInventory as string[])]
      : []
    inv.push(drop.itemId)

    await tx.characterProgress.update({
      where: { characterId },
      data: { sessionInventory: inv as unknown as import('@prisma/client').Prisma.InputJsonValue },
    })
    await tx.fieldMapDrop.update({
      where: { id: dropId },
      data: { collectedAt: new Date(), collectedByCharacterId: characterId },
    })

    return { dropId: drop.id, itemId: drop.itemId, sessionInventory: inv }
  })
}

async function dungeonReportKill(args: Record<string, unknown>) {
  const instanceId = String(args.p_instance_id)
  const spawnIndex = Number(args.p_spawn_index)

  return prisma.$transaction(async (tx) => {
    const inst = await tx.dungeonInstance.findUnique({ where: { id: instanceId } })
    if (!inst) throw new Error('Instance not found')
    if (inst.status === 'cleared') return toSnakeRow(inst as Record<string, unknown>)

    const killed = Array.isArray(inst.killedSpawns) ? (inst.killedSpawns as number[]) : []
    if (killed.includes(spawnIndex)) return toSnakeRow(inst as Record<string, unknown>)

    const nextKilled = [...killed, spawnIndex]
    const status = nextKilled.length >= inst.totalSpawns ? 'mvp' : inst.status
    const mvpAlive = nextKilled.length >= inst.totalSpawns ? true : inst.mvpAlive

    const updated = await tx.dungeonInstance.update({
      where: { id: instanceId },
      data: { killedSpawns: nextKilled, status, mvpAlive },
    })
    return toSnakeRow(updated as Record<string, unknown>)
  })
}

async function dungeonComplete(args: Record<string, unknown>) {
  const instanceId = String(args.p_instance_id)
  const rewards = args.p_rewards as Record<string, unknown>
  const updates = args.p_updates as Array<Record<string, unknown>>

  return prisma.$transaction(async (tx) => {
    const inst = await tx.dungeonInstance.findUnique({ where: { id: instanceId } })
    if (!inst) throw new Error('Instance not found')

    if (inst.status !== 'cleared') {
      await tx.dungeonInstance.update({
        where: { id: instanceId },
        data: { status: 'cleared', mvpAlive: false },
      })
    }

    const claims: Array<Record<string, unknown>> = []
    const zeny = Number(rewards.zeny ?? 0)
    const baseExp = Number(rewards.baseExp ?? 0)
    const jobExp = Number(rewards.jobExp ?? 0)

    for (const item of updates) {
      const characterId = String(item.characterId)
      try {
        await tx.dungeonRewardClaim.create({
          data: { instanceId, characterId, zeny, baseExp, jobExp },
        })
      } catch {
        continue
      }

      await tx.character.update({
        where: { id: characterId },
        data: { zeny: { increment: zeny } },
      })
      await tx.characterProgress.update({
        where: { characterId },
        data: {
          baseLevel: Number(item.baseLevel),
          baseExp: Number(item.baseExp),
          jobLevel: Number(item.jobLevel),
          jobExp: Number(item.jobExp),
        },
      })
      claims.push({ characterId, zeny, baseExp, jobExp })
    }

    return claims
  })
}
