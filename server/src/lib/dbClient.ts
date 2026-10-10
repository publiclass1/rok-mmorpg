import { prisma } from './prisma.js'
import { fromSnakeRow, toSnakeRow, toSnakeRows } from './rowMaps.js'
import { runRpc } from './rpc.js'

type TableName =
  | 'characters'
  | 'character_progress'
  | 'character_skills'
  | 'character_equipment'
  | 'items'
  | 'character_inventory'
  | 'account_storage'
  | 'npc_definitions'
  | 'trade_sessions'
  | 'trade_offers'
  | 'parties'
  | 'party_members'
  | 'party_requests'
  | 'guilds'
  | 'guild_members'
  | 'vendor_stalls'
  | 'vendor_listings'
  | 'duel_sessions'
  | 'dungeon_instances'
  | 'dungeon_reward_claims'
  | 'character_presence'
  | 'character_audit_log'
  | 'field_spawn_kill_locks'
  | 'field_map_drops'
  | 'game_settings'

const DELEGATE: Record<TableName, keyof typeof prisma> = {
  characters: 'character',
  character_progress: 'characterProgress',
  character_skills: 'characterSkill',
  character_equipment: 'characterEquipment',
  items: 'item',
  character_inventory: 'characterInventory',
  account_storage: 'accountStorage',
  npc_definitions: 'npcDefinition',
  trade_sessions: 'tradeSession',
  trade_offers: 'tradeOffer',
  parties: 'party',
  party_members: 'partyMember',
  party_requests: 'partyRequest',
  guilds: 'guild',
  guild_members: 'guildMember',
  vendor_stalls: 'vendorStall',
  vendor_listings: 'vendorListing',
  duel_sessions: 'duelSession',
  dungeon_instances: 'dungeonInstance',
  dungeon_reward_claims: 'dungeonRewardClaim',
  character_presence: 'characterPresence',
  character_audit_log: 'characterAuditLog',
  field_spawn_kill_locks: 'fieldSpawnKillLock',
  field_map_drops: 'fieldMapDrop',
  game_settings: 'gameSetting',
}

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'in'; col: string; vals: unknown[] }
  | { kind: 'is'; col: string; val: null }
  | { kind: 'lte'; col: string; val: unknown }
  | { kind: 'gte'; col: string; val: unknown }
  | { kind: 'gt'; col: string; val: unknown }
  | { kind: 'neq'; col: string; val: unknown }
  | { kind: 'ilike'; col: string; pattern: string }
  | { kind: 'or'; clause: string }

type DbResult<T> =
  | { data: T; error: null; count?: number }
  | { data: null; error: { message: string }; count?: number }

function delegate(table: TableName) {
  const key = DELEGATE[table]
  return (prisma as unknown as Record<string, unknown>)[key as string] as {
    findMany: (args: unknown) => Promise<Record<string, unknown>[]>
    findFirst: (args: unknown) => Promise<Record<string, unknown> | null>
    count: (args: unknown) => Promise<number>
    create: (args: unknown) => Promise<Record<string, unknown>>
    update: (args: unknown) => Promise<Record<string, unknown>>
    updateMany: (args: unknown) => Promise<{ count: number }>
    delete: (args: unknown) => Promise<Record<string, unknown>>
    deleteMany: (args: unknown) => Promise<{ count: number }>
    upsert: (args: unknown) => Promise<Record<string, unknown>>
  }
}

function colToField(col: string): string {
  return col.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function unescapeIlikePattern(pattern: string): string {
  return pattern.replace(/\\(.)/g, '$1')
}

function ilikeToStringFilter(pattern: string): Record<string, unknown> {
  const raw = unescapeIlikePattern(pattern)
  if (raw.startsWith('%') && raw.endsWith('%') && raw.length >= 2) {
    return { contains: raw.slice(1, -1) }
  }
  if (raw.startsWith('%')) {
    return { endsWith: raw.slice(1) }
  }
  if (raw.endsWith('%')) {
    return { startsWith: raw.slice(0, -1) }
  }
  return { equals: raw }
}

function parseOrClause(clause: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const part of clause.split(',').map((s) => s.trim()).filter(Boolean)) {
    const first = part.indexOf('.')
    const second = part.indexOf('.', first + 1)
    if (first === -1 || second === -1) continue
    const col = part.slice(0, first)
    const op = part.slice(first + 1, second)
    const val = part.slice(second + 1)
    const field = colToField(col)
    if (op === 'eq') out.push({ [field]: val })
    else if (op === 'neq') out.push({ [field]: { not: val } })
    else if (op === 'in') out.push({ [field]: { in: val.split('.') } })
  }
  return out
}

function buildWhere(filters: Filter[]): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  for (const f of filters) {
    if (f.kind === 'or') {
      const or = parseOrClause(f.clause)
      if (or.length) where.OR = or
      continue
    }
    const field = colToField(f.col)
    if (f.kind === 'eq') where[field] = f.val
    if (f.kind === 'in') where[field] = { in: f.vals }
    if (f.kind === 'is' && f.val === null) where[field] = null
    if (f.kind === 'lte') where[field] = { lte: f.val instanceof Date ? f.val : new Date(String(f.val)) }
    if (f.kind === 'gte') where[field] = { gte: f.val instanceof Date ? f.val : new Date(String(f.val)) }
    if (f.kind === 'gt') where[field] = { gt: f.val instanceof Date ? f.val : new Date(String(f.val)) }
    if (f.kind === 'neq') where[field] = { not: f.val }
    if (f.kind === 'ilike') where[field] = ilikeToStringFilter(f.pattern)
  }
  return where
}

function parseSelectColumns(selectStr: string): Record<string, boolean> | undefined {
  const trimmed = selectStr.trim()
  if (trimmed === '*') return undefined
  const cols = trimmed.split(',').map((c) => c.trim()).filter(Boolean)
  const select: Record<string, boolean> = {}
  for (const c of cols) {
    select[colToField(c)] = true
  }
  return select
}

function pickColumns(row: Record<string, unknown>, selectStr: string): Record<string, unknown> {
  if (selectStr.trim() === '*') return row
  const out: Record<string, unknown> = {}
  for (const c of selectStr.split(',').map((s) => s.trim())) {
    out[c] = row[c]
  }
  return out
}

class QueryBuilder {
  private filters: Filter[] = []
  private selectCols = '*'
  private countOnly = false
  private mode: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private insertRows: Record<string, unknown>[] = []
  private updateRow: Record<string, unknown> = {}
  private upsertRow: Record<string, unknown> | Record<string, unknown>[] = {}
  private upsertConflict = ''
  private orderBy: { col: string; asc: boolean } | null = null
  private limitN: number | null = null

  constructor(private readonly table: TableName) {}

  select(columns = '*', opts?: { count?: string; head?: boolean }) {
    this.selectCols = columns
    if (opts?.count === 'exact' && opts.head) this.countOnly = true
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push({ kind: 'eq', col, val })
    return this
  }

  in(col: string, vals: unknown[]) {
    this.filters.push({ kind: 'in', col, vals })
    return this
  }

  is(col: string, val: null) {
    this.filters.push({ kind: 'is', col, val })
    return this
  }

  lte(col: string, val: unknown) {
    this.filters.push({ kind: 'lte', col, val })
    return this
  }

  gt(col: string, val: unknown) {
    this.filters.push({ kind: 'gt', col, val })
    return this
  }

  gte(col: string, val: unknown) {
    this.filters.push({ kind: 'gte', col, val })
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true }
    return this
  }

  limit(n: number) {
    this.limitN = n
    return this
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ kind: 'ilike', col, pattern })
    return this
  }

  or(clause: string) {
    this.filters.push({ kind: 'or', clause })
    return this
  }

  neq(col: string, val: unknown) {
    this.filters.push({ kind: 'neq', col, val })
    return this
  }

  insert(row: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = 'insert'
    this.insertRows = Array.isArray(row) ? row : [row]
    return this
  }

  update(row: Record<string, unknown>) {
    this.mode = 'update'
    this.updateRow = row
    return this
  }

  delete() {
    this.mode = 'delete'
    return this
  }

  upsert(row: Record<string, unknown> | Record<string, unknown>[], opts: { onConflict: string }) {
    this.mode = 'upsert'
    this.upsertRow = row
    this.upsertConflict = opts.onConflict
    return this
  }

  async maybeSingle(): Promise<DbResult<Record<string, unknown> | null>> {
    const res = await this.run()
    if (res.error) return res as DbResult<null>
    const rows = Array.isArray(res.data) ? res.data : res.data ? [res.data as Record<string, unknown>] : []
    return { data: rows[0] ?? null, error: null }
  }

  async single(): Promise<DbResult<Record<string, unknown>>> {
    const res = await this.maybeSingle()
    if (res.error) return res as DbResult<Record<string, unknown>>
    if (!res.data) return { data: null, error: { message: 'Row not found' } }
    return { data: res.data, error: null }
  }

  then<TResult1 = DbResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected)
  }

  private async run(): Promise<DbResult<unknown>> {
    try {
      const d = delegate(this.table)
      const where = buildWhere(this.filters)

      if (this.mode === 'delete') {
        await d.deleteMany({ where: Object.keys(where).length ? where : {} })
        return { data: null, error: null }
      }

      if (this.mode === 'upsert') {
        if (Array.isArray(this.upsertRow)) {
          const rows = this.upsertRow as Record<string, unknown>[]
          for (const raw of rows) {
            const data = fromSnakeRow(raw)
            if (this.table === 'game_settings') {
              await d.upsert({ where: { key: data.key }, create: data, update: data })
            }
          }
          return { data: null, error: null }
        }
        const data = fromSnakeRow(this.upsertRow)
        let row: Record<string, unknown>
        if (this.table === 'character_progress') {
          row = await d.upsert({ where: { characterId: data.characterId }, create: data, update: data })
        } else if (this.table === 'game_settings') {
          row = await d.upsert({ where: { key: data.key }, create: data, update: data })
        } else if (this.table === 'vendor_stalls') {
          row = await d.upsert({ where: { characterId: data.characterId }, create: data, update: data })
        } else if (this.table === 'field_spawn_kill_locks') {
          row = await d.upsert({
            where: { mapId_spawnIndex: { mapId: data.mapId, spawnIndex: data.spawnIndex } },
            create: data,
            update: data,
          })
        } else {
          return { data: null, error: { message: `Unsupported upsert on ${this.table} (${this.upsertConflict})` } }
        }
        return { data: toSnakeRow(row), error: null }
      }

      if (this.mode === 'insert') {
        const created: Record<string, unknown>[] = []
        for (const raw of this.insertRows) {
          const row = await d.create({ data: fromSnakeRow(raw) })
          created.push(toSnakeRow(row))
        }
        const shaped = created.map((r) => pickColumns(r, this.selectCols))
        return { data: shaped.length === 1 ? shaped[0] : shaped, error: null }
      }

      if (this.mode === 'update') {
        const data = fromSnakeRow(this.updateRow)
        if (Object.keys(where).length === 0) {
          return { data: null, error: { message: 'Update requires filter' } }
        }
        try {
          const row = await d.update({ where, data })
          const snake = pickColumns(toSnakeRow(row), this.selectCols)
          return { data: snake, error: null }
        } catch {
          await d.updateMany({ where, data })
          const rows = await d.findMany({ where })
          const snake = toSnakeRows(rows).map((r) => pickColumns(r, this.selectCols))
          return { data: snake[0] ?? null, error: null }
        }
      }

      if (this.countOnly) {
        const count = await d.count({ where })
        return { data: null, error: null, count }
      }

      const select = parseSelectColumns(this.selectCols)
      const orderBy = this.orderBy
        ? { [colToField(this.orderBy.col)]: this.orderBy.asc ? 'asc' : 'desc' }
        : undefined
      const rows = await d.findMany({
        where,
        ...(select ? { select } : {}),
        ...(orderBy ? { orderBy } : {}),
        ...(this.limitN != null ? { take: this.limitN } : {}),
      })
      const snake = toSnakeRows(rows).map((r) => pickColumns(r, this.selectCols))
      return { data: snake, error: null }
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : String(err) } }
    }
  }
}

export type ServiceClient = {
  from: (table: TableName) => QueryBuilder
  rpc: (fn: string, args: Record<string, unknown>) => Promise<DbResult<unknown>>
}

export function createServiceClient(): ServiceClient {
  return {
    from(table: TableName) {
      return new QueryBuilder(table)
    },
    async rpc(fn, args) {
      try {
        const data = await runRpc(fn, args)
        return { data, error: null }
      } catch (err) {
        return { data: null, error: { message: err instanceof Error ? err.message : String(err) } }
      }
    },
  }
}
