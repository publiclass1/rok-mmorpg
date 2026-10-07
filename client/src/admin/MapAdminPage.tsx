import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadRoContent } from '../content/ro/loadContent'
import type { MapPortalDef } from '../content/ro/types'
import {
  createEmptyMap,
  ensureObjectGroups,
  importNpcRowsIntoMap,
  parseTmj,
  npcDefsFromMap,
  portalDefsFromMap,
  resizeTmjMap,
  serializeTmj,
  type TmjMap,
} from '../lib/tmj'
import { supabase } from '../lib/supabase'
import type { NpcObjectNpcType, NpcObjectProps } from '../lib/tmj/types'
import { readNpcProps, readPortalProps, writeNpcProps, writePortalProps } from '../lib/tmj/properties'
import { getObjectGroup } from '../lib/tmj/parse'
import { fetchMapBundle, fetchMapList, saveMapBundle, type MapMeta } from './mapAdminApi'
import { MapEditorCanvas, type EditorTool } from './mapEditor/MapEditorCanvas'
import { MapEditorToolbar } from './mapEditor/MapEditorToolbar'
import { MapEditorViewport } from './mapEditor/MapEditorViewport'
import type { WarpWiringPayload } from './mapAdminApi'
import { readDecorAssetId } from '../lib/mapDecor/decorProps'
import { GID_GRASS_A, GID_GRASS_B, GID_PATH, GID_WALL } from '../lib/tmj'
import '../App.css'

const defaultMeta = (): MapMeta => ({
  id: 'new_map',
  displayName: 'New Map',
  fieldType: 'custom',
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
  const [showNpcs, setShowNpcs] = useState(true)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [jsonText, setJsonText] = useState('')
  const [jsonDirty, setJsonDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [fullSql, setFullSql] = useState('')
  const [migrationFileName, setMigrationFileName] = useState('')
  const [migrationWritten, setMigrationWritten] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addToPronteraWarp, setAddToPronteraWarp] = useState(true)
  const [hubSpawnX, setHubSpawnX] = useState(320)
  const [hubSpawnY, setHubSpawnY] = useState(320)
  const [addReturnWarp, setAddReturnWarp] = useState(true)
  const [returnPronteraX, setReturnPronteraX] = useState(640)
  const [returnPronteraY, setReturnPronteraY] = useState(360)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
  const [sqlSectionOpen, setSqlSectionOpen] = useState(true)
  const panResetRef = useRef<(() => void) | null>(null)
  const [newMapWidth, setNewMapWidth] = useState(30)
  const [newMapHeight, setNewMapHeight] = useState(20)
  const [resizeWidth, setResizeWidth] = useState(30)
  const [resizeHeight, setResizeHeight] = useState(20)
  const [editingMapId, setEditingMapId] = useState<string | null>(null)

  useEffect(() => {
    setResizeWidth(tmj.width)
    setResizeHeight(tmj.height)
  }, [tmj.width, tmj.height])

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
  const npcMarkersForSave = useMemo(() => npcDefsFromMap(tmj, meta.id), [tmj, meta.id])

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

  const selectedNpcObject = useMemo(() => {
    if (selectedObjectId == null) return null
    const group = getObjectGroup(tmj, 'npcs')
    return group?.objects.find((o) => o.id === selectedObjectId) ?? null
  }, [tmj, selectedObjectId])

  const loadMap = async (mapId: string) => {
    setLoading(true)
    setStatus(null)
    try {
      const bundle = await fetchMapBundle(mapId)
      if (bundle.meta) setMeta(bundle.meta)
      else setMeta({ ...defaultMeta(), id: mapId, displayName: mapId })
      let loadedTmj: TmjMap
      if (bundle.tmj) {
        const parsed = parseTmj(bundle.tmj)
        ensureObjectGroups(parsed)
        loadedTmj = parsed
      } else {
        loadedTmj = createEmptyMap()
      }

      const { data: npcRows, error: npcError } = await supabase
        .from('npc_definitions')
        .select('*')
        .eq('map_id', mapId)

      if (npcError) {
        setTmj(loadedTmj)
        setStatus(`Loaded ${mapId}; NPC import failed: ${npcError.message}`)
      } else {
        setTmj(importNpcRowsIntoMap(loadedTmj, mapId, npcRows ?? []))
        const npcCount = npcRows?.length ?? 0
        setStatus(npcCount > 0 ? `Loaded ${mapId} (${npcCount} NPCs from DB)` : `Loaded ${mapId}`)
      }

      setJsonDirty(false)
      setSelectedObjectId(null)
      setEditingMapId(mapId)
      setFullSql('')
      setMigrationFileName('')
      setMigrationWritten(false)
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
      const warpWiring: WarpWiringPayload = {
        addToPronteraWarp,
        spawnX: hubSpawnX,
        spawnY: hubSpawnY,
        addReturnWarp,
        returnPronteraX: returnPronteraX,
        returnPronteraY: returnPronteraY,
      }
      const res = await saveMapBundle({ mapMeta, tmj: mapToSave, portals, warpWiring })
      setMeta(res.mapMeta)
      setFullSql(res.sqlBundle.fullSql)
      setMigrationFileName(res.sqlBundle.migrationFileName)
      setMigrationWritten(res.sqlBundle.migrationWritten)
      setSqlSectionOpen(true)
      const fileList = res.filesWritten.join(', ')
      setStatus(
        `Saved ${mapId}. Files: ${fileList}. Apply SQL via Supabase SQL Editor or supabase db push, then hard-refresh the game.`,
      )
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

  const updateSelectedNpc = (patch: Partial<NpcObjectProps>) => {
    if (!selectedNpcObject) return
    const current = readNpcProps(selectedNpcObject)
    const merged: NpcObjectProps = {
      npcId: patch.npcId ?? current.npcId,
      npcType: patch.npcType ?? current.npcType,
      label: patch.label ?? current.label,
      facing: patch.facing ?? current.facing,
      spriteKey: patch.spriteKey ?? current.spriteKey,
      configJson: patch.configJson ?? current.configJson,
    }
    const next: TmjMap = {
      ...tmj,
      layers: tmj.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== 'npcs') return layer
        return {
          ...layer,
          objects: layer.objects.map((o) => {
            if (o.id !== selectedNpcObject.id) return o
            const updated = { ...o }
            writeNpcProps(updated, merged)
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
      fieldType: 'custom',
      sourceUrl: null,
    })
    setTmj(createEmptyMap(w, h))
    setJsonDirty(false)
    setSelectedObjectId(null)
    setEditingMapId(null)
    setFullSql('')
    setStatus(`New blank map (${w}×${h}) — set id and save`)
  }

  const applyResizeMap = () => {
    const w = Math.max(5, Math.min(200, Math.round(resizeWidth)))
    const h = Math.max(5, Math.min(200, Math.round(resizeHeight)))
    setTmj(resizeTmjMap(tmj, w, h))
    setStatus(`Map resized to ${w}×${h}`)
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
          <p className="muted small">Writes map files + Supabase migration SQL locally (run SQL against your project).</p>
        </div>
        <div className="map-admin-header-actions">
          <button type="button" disabled={loading} onClick={() => void handleSave()}>
            Save map &amp; Supabase SQL
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

          <fieldset className="map-admin-fieldset">
            <legend>Resize current map</legend>
            <p className="muted small">Current: {tmj.width}×{tmj.height} tiles</p>
            <div className="map-admin-size-row">
              <label>
                W (tiles)
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={resizeWidth}
                  onChange={(e) => setResizeWidth(Number(e.target.value))}
                />
              </label>
              <label>
                H (tiles)
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={resizeHeight}
                  onChange={(e) => setResizeHeight(Number(e.target.value))}
                />
              </label>
            </div>
            <button type="button" disabled={loading} onClick={applyResizeMap}>
              Resize map
            </button>
            <p className="muted small">Extends or crops from the top-left. Shift tiles near edges with the tiles tool first if needed.</p>
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
                <option value="custom">custom (player maps)</option>
                <option value="field">field</option>
                <option value="town">town</option>
                <option value="dungeon">dungeon</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="map-admin-fieldset">
            <legend>Warp wiring</legend>
            <label className="map-admin-check">
              <input type="checkbox" checked={addToPronteraWarp} onChange={(e) => setAddToPronteraWarp(e.target.checked)} />
              Add to Prontera Warp Agent
            </label>
            {addToPronteraWarp && (
              <div className="map-admin-size-row">
                <label>
                  Arrival X
                  <input type="number" value={hubSpawnX} onChange={(e) => setHubSpawnX(Number(e.target.value))} />
                </label>
                <label>
                  Arrival Y
                  <input type="number" value={hubSpawnY} onChange={(e) => setHubSpawnY(Number(e.target.value))} />
                </label>
              </div>
            )}
            <label className="map-admin-check">
              <input type="checkbox" checked={addReturnWarp} onChange={(e) => setAddReturnWarp(e.target.checked)} />
              Return warp on this map → Prontera
            </label>
            {addReturnWarp && (
              <div className="map-admin-size-row">
                <label>
                  Prontera X
                  <input type="number" value={returnPronteraX} onChange={(e) => setReturnPronteraX(Number(e.target.value))} />
                </label>
                <label>
                  Prontera Y
                  <input type="number" value={returnPronteraY} onChange={(e) => setReturnPronteraY(Number(e.target.value))} />
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className="map-admin-fieldset">
            <legend>Tool options</legend>
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
            <label className="map-admin-check"><input type="checkbox" checked={showNpcs} onChange={(e) => setShowNpcs(e.target.checked)} /> NPCs</label>
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

          {selectedNpcObject && (
            <fieldset className="map-admin-fieldset">
              <legend>NPC</legend>
              <NpcFields object={selectedNpcObject} onChange={updateSelectedNpc} />
              <button type="button" className="danger" onClick={deleteSelectedObject}>Delete NPC</button>
            </fieldset>
          )}

          {selectedObjectId != null && !selectedPortalObject && !selectedDecorObject && !selectedNpcObject && (
            <button type="button" className="danger" onClick={deleteSelectedObject}>Delete obstacle</button>
          )}

          <p className="muted small">Walk portals: {portalsForSave.filter((p) => p.mode === 'walk' || p.mode === 'both').length}</p>
          <p className="muted small">NPC markers: {npcMarkersForSave.length}</p>
        </aside>

        <section className="map-admin-canvas-wrap panel">
          <MapEditorToolbar
            tool={tool}
            onToolChange={setTool}
            disabled={loading}
            onResetView={() => panResetRef.current?.()}
          />
          <MapEditorViewport panResetRef={panResetRef}>
            <MapEditorCanvas
              map={tmj}
              mapId={meta.id.trim() || 'new_map'}
              tool={tool}
              groundGid={groundGid}
              collisionBlocked={collisionBlocked}
              showGround={showGround}
              showCollision={showCollision}
              showDecor={showDecor}
              showObstacles={showObstacles}
              showPortals={showPortals}
              showNpcs={showNpcs}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onMapChange={setTmj}
            />
          </MapEditorViewport>
          <p className="muted small map-admin-pan-hint">Space + drag or middle-mouse drag to pan the map view.</p>
        </section>

        <aside className={`map-admin-json panel${rightPanelCollapsed ? ' map-admin-json--collapsed' : ''}`}>
          <div className="map-admin-json-header">
            {!rightPanelCollapsed && <span className="map-admin-json-title">Output</span>}
            <button
              type="button"
              className="secondary map-admin-panel-toggle"
              onClick={() => setRightPanelCollapsed((c) => !c)}
              title={rightPanelCollapsed ? 'Expand panel' : 'Collapse panel'}
            >
              {rightPanelCollapsed ? '◀' : '▶'}
            </button>
          </div>
          {!rightPanelCollapsed && (
            <>
              <details className="map-admin-collapse" open={jsonDirty}>
                <summary>TMJ JSON</summary>
                <textarea
                  className="map-admin-json-editor"
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value)
                    setJsonDirty(true)
                  }}
                />
                <button type="button" onClick={applyJson}>Apply JSON</button>
              </details>

              {fullSql && (
                <details className="map-admin-collapse" open={sqlSectionOpen} onToggle={(e) => setSqlSectionOpen(e.currentTarget.open)}>
                  <summary>SQL bundle</summary>
                  {migrationFileName && (
                    <p className="muted small">
                      {migrationWritten ? 'Written: ' : ''}
                      supabase/migrations/{migrationFileName}
                      <br />
                      supabase/seed/custom_maps/{meta.id.trim()}.sql
                    </p>
                  )}
                  <textarea className="map-admin-json-editor map-admin-sql" readOnly value={fullSql} />
                  <button type="button" onClick={() => void navigator.clipboard.writeText(fullSql)}>
                    Copy all SQL
                  </button>
                </details>
              )}
            </>
          )}
        </aside>
      </div>
    </main>
  )
}

function NpcFields({
  object,
  onChange,
}: {
  object: { id: number }
  onChange: (patch: Partial<NpcObjectProps>) => void
}) {
  const props = readNpcProps(object as import('../lib/tmj').TmjMapObject)
  const [configError, setConfigError] = useState<string | null>(null)

  const onConfigBlur = (raw: string) => {
    try {
      JSON.parse(raw)
      setConfigError(null)
      onChange({ configJson: raw })
    } catch {
      setConfigError('Invalid JSON')
    }
  }

  return (
    <div className="stack compact">
      <label>
        npc id
        <input value={props.npcId} onChange={(e) => onChange({ npcId: e.target.value })} />
      </label>
      <label>
        label
        <input value={props.label} onChange={(e) => onChange({ label: e.target.value })} />
      </label>
      <label>
        npc type
        <select
          value={props.npcType}
          onChange={(e) => onChange({ npcType: e.target.value as NpcObjectNpcType })}
        >
          <option value="storage">storage (Kafra)</option>
          <option value="teleport">teleport</option>
          <option value="save">save</option>
          <option value="job_master">job_master</option>
          <option value="shop">shop</option>
          <option value="healer">healer</option>
        </select>
      </label>
      <label>
        facing
        <select
          value={props.facing}
          onChange={(e) =>
            onChange({ facing: e.target.value as NpcObjectProps['facing'] })
          }
        >
          <option value="down">down</option>
          <option value="left">left</option>
          <option value="right">right</option>
          <option value="up">up</option>
        </select>
      </label>
      <label>
        sprite key (optional)
        <input
          value={props.spriteKey}
          placeholder="auto from type"
          onChange={(e) => onChange({ spriteKey: e.target.value })}
        />
      </label>
      <label>
        config JSON
        <textarea
          className="map-admin-json-editor"
          rows={5}
          value={props.configJson}
          onChange={(e) => onChange({ configJson: e.target.value })}
          onBlur={(e) => onConfigBlur(e.target.value)}
        />
      </label>
      {props.npcType === 'teleport' && (
        <p className="muted small">
          Teleport: use destinations array, e.g.{' '}
          {`{"destinations":[{"map_id":"prontera","label":"Prontera","x":640,"y":360}]}`}
        </p>
      )}
      {configError && <p className="muted small" style={{ color: '#f87171' }}>{configError}</p>}
    </div>
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
