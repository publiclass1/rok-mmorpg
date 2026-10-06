import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadRoContent } from '../content/ro/loadContent'
import type { MapPortalDef } from '../content/ro/types'
import {
  createEmptyMap,
  ensureObjectGroups,
  parseTmj,
  portalDefsFromMap,
  serializeTmj,
  type TmjMap,
} from '../lib/tmj'
import { readPortalProps, writePortalProps } from '../lib/tmj/properties'
import { getObjectGroup } from '../lib/tmj/parse'
import { fetchMapBundle, fetchMapList, saveMapBundle, type MapMeta } from './mapAdminApi'
import { DecorAssetPalette } from './mapEditor/DecorAssetPalette'
import { MapEditorCanvas, type EditorTool } from './mapEditor/MapEditorCanvas'
import { readDecorAssetId } from '../lib/mapDecor/decorProps'
import { GID_GRASS_A, GID_GRASS_B, GID_PATH, GID_WALL } from '../lib/tmj'
import '../App.css'

const defaultMeta = (): MapMeta => ({
  id: 'new_map',
  displayName: 'New Map',
  fieldType: 'field',
  sourceUrl: null,
})

export function MapAdminPage() {
  const [mapList, setMapList] = useState<MapMeta[]>([])
  const [meta, setMeta] = useState<MapMeta>(defaultMeta())
  const [tmj, setTmj] = useState<TmjMap>(() => createEmptyMap())
  const [tool, setTool] = useState<EditorTool>('ground')
  const [groundGid, setGroundGid] = useState(GID_GRASS_A)
  const [collisionBlocked, setCollisionBlocked] = useState(true)
  const [showGround, setShowGround] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [showDecor, setShowDecor] = useState(true)
  const [showObstacles, setShowObstacles] = useState(true)
  const [showPortals, setShowPortals] = useState(true)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [jsonDirty, setJsonDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [npcSql, setNpcSql] = useState('')
  const [loading, setLoading] = useState(false)
  const [newMapWidth, setNewMapWidth] = useState(30)
  const [newMapHeight, setNewMapHeight] = useState(20)
  const [editingMapId, setEditingMapId] = useState<string | null>(null)

  const allMapIds = useMemo(() => loadRoContent().maps.map((m) => m.id), [])

  const refreshList = useCallback(async () => {
    try {
      const maps = await fetchMapList()
      setMapList(maps)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to list maps')
    }
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  useEffect(() => {
    if (!jsonDirty) {
      setJsonText(serializeTmj(tmj))
    }
  }, [tmj, jsonDirty])

  const portalsForSave = useMemo((): MapPortalDef[] => portalDefsFromMap(tmj, meta.id), [tmj, meta.id])

  const selectedPortalObject = useMemo(() => {
    if (selectedObjectId == null) return null
    const group = getObjectGroup(tmj, 'portals')
    return group?.objects.find((o) => o.id === selectedObjectId) ?? null
  }, [tmj, selectedObjectId])

  const selectedDecorObject = useMemo(() => {
    if (selectedObjectId == null) return null
    const group = getObjectGroup(tmj, 'decor')
    return group?.objects.find((o) => o.id === selectedObjectId) ?? null
  }, [tmj, selectedObjectId])

  const loadMap = async (mapId: string) => {
    setLoading(true)
    setStatus(null)
    try {
      const bundle = await fetchMapBundle(mapId)
      if (bundle.meta) setMeta(bundle.meta)
      else setMeta({ ...defaultMeta(), id: mapId, displayName: mapId })
      if (bundle.tmj) {
        const parsed = parseTmj(bundle.tmj)
        ensureObjectGroups(parsed)
        setTmj(parsed)
      } else {
        setTmj(createEmptyMap())
      }
      setJsonDirty(false)
      setSelectedObjectId(null)
      setEditingMapId(mapId)
      setNpcSql('')
      setStatus(`Loaded ${mapId}`)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const mapId = meta.id.trim()
    if (!mapId) {
      setStatus('Set a map id before saving')
      return
    }
    if (!/^[a-z0-9_]+$/.test(mapId)) {
      setStatus('Map id: use lowercase letters, numbers, and underscores only')
      return
    }

    setLoading(true)
    setStatus(null)
    try {
      const mapMeta = { ...meta, id: mapId }
      let mapToSave = tmj
      if (jsonDirty) {
        mapToSave = parseTmj(JSON.parse(jsonText))
        ensureObjectGroups(mapToSave)
        setTmj(mapToSave)
        setJsonDirty(false)
      }
      const portals = portalDefsFromMap(mapToSave, mapId)
      const res = await saveMapBundle({ mapMeta, tmj: mapToSave, portals })
      setMeta(mapMeta)
      setNpcSql(res.npcSql)
      setStatus(`Saved ${mapId}`)
      setEditingMapId(mapId)
      await refreshList()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const applyJson = () => {
    try {
      const parsed = parseTmj(JSON.parse(jsonText))
      ensureObjectGroups(parsed)
      setTmj(parsed)
      setJsonDirty(false)
      setStatus('JSON applied to editor')
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const updateSelectedPortal = (patch: Partial<MapPortalDef>) => {
    if (!selectedPortalObject) return
    const current = readPortalProps(selectedPortalObject)
    const merged = {
      portalId: patch.id ?? current.portalId,
      targetMapId: patch.targetMapId ?? current.targetMapId,
      targetX: patch.targetX ?? current.targetX,
      targetY: patch.targetY ?? current.targetY,
      label: patch.label ?? current.label,
      mode: patch.mode ?? current.mode,
    }
    const next: TmjMap = {
      ...tmj,
      layers: tmj.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== 'portals') return layer
        return {
          ...layer,
          objects: layer.objects.map((o) => {
            if (o.id !== selectedPortalObject.id) return o
            const updated = { ...o }
            writePortalProps(updated, merged)
            return updated
          }),
        }
      }),
    }
    setTmj(next)
  }

  const createNewMap = () => {
    const w = Math.max(5, Math.min(200, Math.round(newMapWidth)))
    const h = Math.max(5, Math.min(200, Math.round(newMapHeight)))
    const suffix = Date.now().toString(36).slice(-4)
    setMeta({
      id: `new_map_${suffix}`,
      displayName: 'New Map',
      fieldType: 'field',
      sourceUrl: null,
    })
    setTmj(createEmptyMap(w, h))
    setJsonDirty(false)
    setSelectedObjectId(null)
    setEditingMapId(null)
    setNpcSql('')
    setStatus(`New blank map (${w}×${h}) — set id and save`)
  }

  const deleteSelectedObject = () => {
    if (selectedObjectId == null) return
    const next: TmjMap = {
      ...tmj,
      layers: tmj.layers.map((layer) => {
        if (layer.type !== 'objectgroup') return layer
        return {
          ...layer,
          objects: layer.objects.filter((o) => o.id !== selectedObjectId),
        }
      }),
    }
    setTmj(next)
    setSelectedObjectId(null)
  }

  return (
    <main className="map-admin-root">
      <header className="map-admin-header panel">
        <div>
          <h1>Map admin</h1>
          <p className="muted small">Dev-only editor — saves to client/public/maps and content/ro/maps.json</p>
        </div>
        <div className="map-admin-header-actions">
          <button type="button" disabled={loading} onClick={() => void handleSave()}>
            Save to disk
          </button>
          <a className="map-admin-link" href="/">Back to game</a>
        </div>
      </header>

      {status && <p className="map-admin-status">{status}</p>}

      <div className="map-admin-layout">
        <aside className="map-admin-sidebar panel">
          <p className="muted small map-admin-editing">
            Editing:{' '}
            {editingMapId ? (
              <>{editingMapId}</>
            ) : (
              <>
                <em>new (unsaved)</em>
                {meta.id ? ` — id “${meta.id}”` : ''}
              </>
            )}
          </p>

          <fieldset className="map-admin-fieldset">
            <legend>Create new map</legend>
            <div className="map-admin-size-row">
              <label>
                W (tiles)
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={newMapWidth}
                  onChange={(e) => setNewMapWidth(Number(e.target.value))}
                />
              </label>
              <label>
                H (tiles)
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={newMapHeight}
                  onChange={(e) => setNewMapHeight(Number(e.target.value))}
                />
              </label>
            </div>
            <button type="button" className="map-admin-new-btn" disabled={loading} onClick={createNewMap}>
              New blank map
            </button>
            <p className="muted small">Resets the canvas. Set a unique id below, then Save to disk.</p>
          </fieldset>

          <label>
            Load existing map
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) void loadMap(e.target.value)
              }}
            >
              <option value="">Select…</option>
              {mapList.map((m) => (
                <option key={m.id} value={m.id}>{m.displayName} ({m.id})</option>
              ))}
            </select>
          </label>

          <fieldset className="map-admin-fieldset">
            <legend>Map metadata</legend>
            <label>
              id
              <input value={meta.id} onChange={(e) => setMeta({ ...meta, id: e.target.value })} />
            </label>
            <label>
              display name
              <input value={meta.displayName} onChange={(e) => setMeta({ ...meta, displayName: e.target.value })} />
            </label>
            <label>
              field type
              <select value={meta.fieldType} onChange={(e) => setMeta({ ...meta, fieldType: e.target.value })}>
                <option value="field">field</option>
                <option value="town">town</option>
                <option value="dungeon">dungeon</option>
              </select>
            </label>
          </fieldset>

          <DecorAssetPalette />

          <fieldset className="map-admin-fieldset">
            <legend>Tool</legend>
            <div className="map-admin-tool-row">
              {(['ground', 'collision', 'obstacle', 'portal', 'select'] as EditorTool[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tool === t ? 'active' : ''}
                  onClick={() => setTool(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {tool === 'ground' && (
              <label>
                Ground tile
                <select value={groundGid} onChange={(e) => setGroundGid(Number(e.target.value))}>
                  <option value={GID_WALL}>Wall (1)</option>
                  <option value={GID_GRASS_A}>Grass A (2)</option>
                  <option value={GID_GRASS_B}>Grass B (3)</option>
                  <option value={GID_PATH}>Path (4)</option>
                </select>
              </label>
            )}
            {tool === 'collision' && (
              <label className="map-admin-check">
                <input
                  type="checkbox"
                  checked={collisionBlocked}
                  onChange={(e) => setCollisionBlocked(e.target.checked)}
                />
                Paint blocked
              </label>
            )}
          </fieldset>

          <fieldset className="map-admin-fieldset">
            <legend>Layers</legend>
            <label className="map-admin-check"><input type="checkbox" checked={showGround} onChange={(e) => setShowGround(e.target.checked)} /> Ground</label>
            <label className="map-admin-check"><input type="checkbox" checked={showCollision} onChange={(e) => setShowCollision(e.target.checked)} /> Collision</label>
            <label className="map-admin-check"><input type="checkbox" checked={showDecor} onChange={(e) => setShowDecor(e.target.checked)} /> Decor</label>
            <label className="map-admin-check"><input type="checkbox" checked={showObstacles} onChange={(e) => setShowObstacles(e.target.checked)} /> Obstacles</label>
            <label className="map-admin-check"><input type="checkbox" checked={showPortals} onChange={(e) => setShowPortals(e.target.checked)} /> Portals</label>
          </fieldset>

          {selectedPortalObject && (
            <fieldset className="map-admin-fieldset">
              <legend>Portal</legend>
              <PortalFields object={selectedPortalObject} mapIds={allMapIds} onChange={updateSelectedPortal} />
              <button type="button" className="danger" onClick={deleteSelectedObject}>Delete object</button>
            </fieldset>
          )}

          {selectedDecorObject && (
            <fieldset className="map-admin-fieldset">
              <legend>Decor</legend>
              <p className="muted small">{readDecorAssetId(selectedDecorObject) ?? 'unknown'}</p>
              <button type="button" className="danger" onClick={deleteSelectedObject}>Delete decor</button>
            </fieldset>
          )}

          {selectedObjectId != null && !selectedPortalObject && !selectedDecorObject && (
            <button type="button" className="danger" onClick={deleteSelectedObject}>Delete obstacle</button>
          )}

          <p className="muted small">Walk portals: {portalsForSave.filter((p) => p.mode === 'walk' || p.mode === 'both').length}</p>
        </aside>

        <section className="map-admin-canvas-wrap panel">
          <MapEditorCanvas
            map={tmj}
            tool={tool}
            groundGid={groundGid}
            collisionBlocked={collisionBlocked}
            showGround={showGround}
            showCollision={showCollision}
            showDecor={showDecor}
            showObstacles={showObstacles}
            showPortals={showPortals}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onMapChange={setTmj}
          />
        </section>

        <aside className="map-admin-json panel">
          <h2>TMJ JSON</h2>
          <textarea
            className="map-admin-json-editor"
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setJsonDirty(true)
            }}
          />
          <button type="button" onClick={applyJson}>Apply JSON</button>

          {npcSql && (
            <>
              <h2>NPC SQL</h2>
              <textarea className="map-admin-json-editor map-admin-sql" readOnly value={npcSql} />
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(npcSql)}
              >
                Copy SQL
              </button>
            </>
          )}
        </aside>
      </div>
    </main>
  )
}

function PortalFields({
  object,
  mapIds,
  onChange,
}: {
  object: { id: number }
  mapIds: string[]
  onChange: (patch: Partial<MapPortalDef>) => void
}) {
  const props = readPortalProps(object as import('../lib/tmj').TmjMapObject)
  return (
    <div className="stack compact">
      <label>
        portal id
        <input value={props.portalId} onChange={(e) => onChange({ id: e.target.value })} />
      </label>
      <label>
        label
        <input value={props.label} onChange={(e) => onChange({ label: e.target.value })} />
      </label>
      <label>
        mode
        <select value={props.mode} onChange={(e) => onChange({ mode: e.target.value as MapPortalDef['mode'] })}>
          <option value="both">both</option>
          <option value="walk">walk</option>
          <option value="npc">npc</option>
        </select>
      </label>
      <label>
        target map
        <select value={props.targetMapId} onChange={(e) => onChange({ targetMapId: e.target.value })}>
          <option value="">—</option>
          {mapIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      </label>
      <label>
        target X
        <input type="number" value={props.targetX} onChange={(e) => onChange({ targetX: Number(e.target.value) })} />
      </label>
      <label>
        target Y
        <input type="number" value={props.targetY} onChange={(e) => onChange({ targetY: Number(e.target.value) })} />
      </label>
    </div>
  )
}
