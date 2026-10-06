import type { TmjMap } from './types'

export function serializeTmj(map: TmjMap, pretty = true): string {
  return JSON.stringify(map, null, pretty ? 2 : 0)
}
