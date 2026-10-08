/**
 * Mob EXP is granted exactly as defined in the mob definition (`wikiBaseExp/wikiJobExp`).
 * EXP scaling must happen on the backend, not in the client.
 */
export function scaleMobExp(baseExp: number, jobExp: number): { baseExp: number; jobExp: number } {
  return { baseExp, jobExp }
}
