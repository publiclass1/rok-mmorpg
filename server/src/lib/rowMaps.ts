/** Convert Prisma camelCase records to snake_case rows expected by ported edge handlers. */

function snakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

export function toSnakeRow<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) {
      out[snakeKey(k)] = v.toISOString()
    } else if (Array.isArray(v) || (v !== null && typeof v === 'object' && !(v instanceof Date))) {
      out[snakeKey(k)] = v
    } else {
      out[snakeKey(k)] = v
    }
  }
  return out
}

export function toSnakeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r) => toSnakeRow(r))
}

export function fromSnakeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v
  }
  return out
}
