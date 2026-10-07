import type { MapPortalDef } from '../content/ro/types'
import type { TmjMap } from '../lib/tmj'

export type WarpWiringPayload = {
  addToPronteraWarp: boolean
  spawnX: number
  spawnY: number
  addReturnWarp: boolean
  returnPronteraX: number
  returnPronteraY: number
}

export type SqlBundleResponse = {
  migrationFileName: string
  fullSql: string
  migrationWritten: boolean
  sections: Record<string, string>
}

export type MapMeta = {
  id: string
  displayName: string
  fieldType: string
  sourceUrl: string | null
}

export async function fetchMapList(): Promise<MapMeta[]> {
  const res = await fetch('/__admin/maps')
  if (!res.ok) throw new Error(await res.text())
  const data = (await res.json()) as { maps: MapMeta[] }
  return data.maps
}

export async function fetchMapBundle(mapId: string): Promise<{
  meta: MapMeta | null
  tmj: TmjMap | null
  portals: MapPortalDef[]
}> {
  const res = await fetch(`/__admin/maps/${encodeURIComponent(mapId)}`)
  if (!res.ok) throw new Error(await res.text())
  return (await res.json()) as {
    meta: MapMeta | null
    tmj: TmjMap | null
    portals: MapPortalDef[]
  }
}

export async function saveMapBundle(payload: {
  mapMeta: MapMeta
  tmj: TmjMap
  portals: MapPortalDef[]
  warpWiring?: WarpWiringPayload
}): Promise<{
  ok: boolean
  npcSql: string
  sqlBundle: SqlBundleResponse
  mapMeta: MapMeta
  filesWritten: string[]
}> {
  const res = await fetch('/__admin/maps/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(err?.error ?? res.statusText)
  }
  return (await res.json()) as {
    ok: boolean
    npcSql: string
    sqlBundle: SqlBundleResponse
    mapMeta: MapMeta
    filesWritten: string[]
  }
}
