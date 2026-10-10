import { prisma } from '../lib/prisma.js'
import { emitToRoom, emitToUser } from './socket.js'

export async function notifyCharacterOwner(
  characterId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const character = await prisma.character.findUnique({ where: { id: characterId }, select: { userId: true } })
  if (character) emitToUser(character.userId, event, payload)
}

export function notifyTradeSession(tradeSessionId: string, payload: unknown): void {
  emitToRoom(`trade:${tradeSessionId}`, 'trade_session', payload)
}
