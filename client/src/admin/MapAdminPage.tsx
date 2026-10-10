import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { loadRoContent } from '../content/ro/loadContent'
import type { MapPortalDef } from '../content/ro/types'
import {
  createEmptyMap,
  ensureObjectGroups,
  importNpcRowsIntoMap,
  parseTmj,
  npcDefsFromMap,
  portalDefsFromMap,
  mobSpotDefsFromMap,
  importMobSpotsIntoMap,
  resizeTmjMap,
  type TmjMap,
} from '../lib/tmj'
import { apiFetch } from '../lib/http'
import type { MobSpotObjectProps, NpcObjectNpcType, NpcObjectProps } from '../lib/tmj/types'
import {
  listNpcSpriteKeys,
  NPC_SPRITE_LABELS,
} from '../game/character/characterSpriteRegistry'
import { npcArchetypeFromNpcType } from '../game/character/npcArchetypes'
import {
  NPC_GUILD_ICON_IDS,
  parseNpcConfigJson,
  patchNpcConfigJson,
  resolveNpcGuildFromParts,
} from '../game/npc/npcGuildBadge'
import {
  readMobSpotProps,
  readNpcProps,
  readPortalProps,
  writeMobSpotProps,
  writeNpcProps,
  writePortalProps,
} from '../lib/tmj/properties'
import { getObjectGroup } from '../lib/tmj/parse'
import { fetchMapBundle, fetchMapList, saveMapBundle, type MapMeta } from './mapAdminApi'
import { MapEditorCanvas, type EditorTool } from './mapEditor/MapEditorCanvas'
import { MapEditorToolbar } from './mapEditor/MapEditorToolbar'
import { MapEditorViewport } from './mapEditor/MapEditorViewport'
import { TOOL_LABELS } from './mapEditor/toolIcons'
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
  const [obstacleMode, setObstacleMode] = useState<'tile' | 'rect' | 'line' | 'erase'>('rect')
  const [showGrid, setShowGrid] = useState(true)
  const [groundGid, setGroundGid] = useState(GID_GRASS_A)
  const [collisionBlocked, setCollisionBlocked] = useState(true)
  const [showGround, setShowGround] = useState(true)
  const [showCollision, setShowCollision] = useState(true)
  const [showDecor, setShowDecor] = useState(true)
  const [showObstacles, setShowObstacles] = useState(true)
  const [showPortals, setShowPortals] = useState(true)
  const [showNpcs, setShowNpcs] = useState(true)
  const [showMobSpots, setShowMobSpots] = useState(true)
  const [selectedObjectId, setSelectedObjectId] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [addToPronteraWarp, setAddToPronteraWarp] = useState(true)
  const [hubSpawnX, setHubSpawnX] = useState(320)
  const [hubSpawnY, setHubSpawnY] = useState(320)
  const [addReturnWarp, setAddReturnWarp] = useState(true)
  const [returnPronteraX, setReturnPronteraX] = useState(640)
  const [returnPronteraY, setReturnPronteraY] = useState(360)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)
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
  const allMobDefs = useMemo(() => loadRoContent().mobs, [])

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

  const portalsForSave = useMemo((): MapPortalDef[] => portalDefsFromMap(tmj, meta.id), [tmj, meta.id])
  const mobSpotsForSave = useMemo(() => mobSpotDefsFromMap(tmj, meta.id.trim() || 'new_map'), [tmj, meta.id])
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

  const selectedMobSpotObject = useMemo(() => {
    if (selectedObjectId == null) return null
    const group = getObjectGroup(tmj, 'mob_spots')
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

      let npcRows: import('../types/database').NpcRow[] = []
      let npcError: Error | null = null
      try {
        const res = await apiFetch<{ npcs: import('../types/database').NpcRow[] }>(
          `/api/npcs?mapId=${encodeURIComponent(mapId)}`,
        )
        npcRows = res.npcs ?? []
      } catch (err) {
        npcError = err instanceof Error ? err : new Error(String(err))
      }

      if (npcError) {
        setTmj(importMobSpotsIntoMap(loadedTmj, bundle.mobSpots ?? []))
        setStatus(`Loaded ${mapId}; NPC import failed: ${npcError.message}`)
      } else {
        const withNpcs = importNpcRowsIntoMap(loadedTmj, mapId, npcRows ?? [])
        setTmj(importMobSpotsIntoMap(withNpcs, bundle.mobSpots ?? []))
        const npcCount = npcRows?.length ?? 0
        const spotCount = bundle.mobSpots?.length ?? 0
        setStatus(
          npcCount > 0 || spotCount > 0
            ? `Loaded ${mapId} (${npcCount} NPCs, ${spotCount} mob spots)`
            : `Loaded ${mapId}`,
        )
      }

      setSelectedObjectId(null)
      setEditingMapId(mapId)
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
      const mapToSave = tmj
      const portals = portalDefsFromMap(mapToSave, mapId)
      const warpWiring: WarpWiringPayload = {
        addToPronteraWarp,
        spawnX: hubSpawnX,
        spawnY: hubSpawnY,
        addReturnWarp,
        returnPronteraX: returnPronteraX,
        returnPronteraY: returnPronteraY,
      }
      const mobSpots = mobSpotDefsFromMap(mapToSave, mapId)
      const res = await saveMapBundle({ mapMeta, tmj: mapToSave, portals, mobSpots, warpWiring })
      setMeta(res.mapMeta)
      const fileList = res.filesWritten.join(', ')
      setStatus(
        `Saved ${mapId}. Files: ${fileList}. Re-run server seed or import NPCs, then hard-refresh the game.`,
      )
      setEditingMapId(mapId)
      await refreshList()
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setLoading(false)
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

  const updateSelectedMobSpot = (patch: Partial<MobSpotObjectProps>) => {
    if (!selectedMobSpotObject) return
    const current = readMobSpotProps(selectedMobSpotObject)
    const merged: MobSpotObjectProps = {
      spotId: patch.spotId ?? current.spotId,
      defId: patch.defId ?? current.defId,
      count: patch.count ?? current.count,
      spawnsPerMinute: patch.spawnsPerMinute ?? current.spawnsPerMinute,
      canLure: patch.canLure ?? current.canLure,
      lureRadius: patch.lureRadius ?? current.lureRadius,
    }
    const next: TmjMap = {
      ...tmj,
      layers: tmj.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== 'mob_spots') return layer
        return {
          ...layer,
          objects: layer.objects.map((o) => {
            if (o.id !== selectedMobSpotObject.id) return o
            const updated = { ...o }
            writeMobSpotProps(updated, merged)
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
    setSelectedObjectId(null)
    setEditingMapId(null)
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
          <a className="map-admin-link" href="/admin">Game admin</a>
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

          <CollapsibleSection title="Create new map">
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
            <p className="muted small">Resets the canvas. Set a unique id below, then save.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Resize current map">
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
            <p className="muted small">Extends or crops from the top-left. Shift tiles with the tiles tool first if needed.</p>
          </CollapsibleSection>

          <CollapsibleSection title="Load map" defaultOpen>
            <label>
              Existing map
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
          </CollapsibleSection>

          <CollapsibleSection title="Map metadata" defaultOpen>
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
          </CollapsibleSection>

          <CollapsibleSection title="Warp wiring">
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
          </CollapsibleSection>

          <CollapsibleSection title="Layers" defaultOpen>
            <label className="map-admin-check"><input type="checkbox" checked={showGround} onChange={(e) => setShowGround(e.target.checked)} /> Ground</label>
            <label className="map-admin-check"><input type="checkbox" checked={showCollision} onChange={(e) => setShowCollision(e.target.checked)} /> Collision</label>
            <label className="map-admin-check"><input type="checkbox" checked={showDecor} onChange={(e) => setShowDecor(e.target.checked)} /> Decor</label>
            <label className="map-admin-check"><input type="checkbox" checked={showObstacles} onChange={(e) => setShowObstacles(e.target.checked)} /> Obstacles</label>
            <label className="map-admin-check"><input type="checkbox" checked={showPortals} onChange={(e) => setShowPortals(e.target.checked)} /> Portals</label>
            <label className="map-admin-check"><input type="checkbox" checked={showNpcs} onChange={(e) => setShowNpcs(e.target.checked)} /> NPCs</label>
            <label className="map-admin-check"><input type="checkbox" checked={showMobSpots} onChange={(e) => setShowMobSpots(e.target.checked)} /> Mob spots</label>
            <label className="map-admin-check"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Editor grid</label>
          </CollapsibleSection>

          <p className="muted small">Walk portals: {portalsForSave.filter((p) => p.mode === 'walk' || p.mode === 'both').length}</p>
          <p className="muted small">NPC markers: {npcMarkersForSave.length}</p>
          <p className="muted small">Mob spots: {mobSpotsForSave.length}</p>
        </aside>

        <section className="map-admin-canvas-wrap panel">
          <MapEditorToolbar
            tool={tool}
            onToolChange={setTool}
            obstacleMode={obstacleMode}
            onObstacleModeChange={setObstacleMode}
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
              obstacleMode={obstacleMode}
              showGrid={showGrid}
              showGround={showGround}
              showCollision={showCollision}
              showDecor={showDecor}
              showObstacles={showObstacles}
              showPortals={showPortals}
              showNpcs={showNpcs}
              showMobSpots={showMobSpots}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onMapChange={setTmj}
            />
          </MapEditorViewport>
          <p className="muted small map-admin-pan-hint">Space + drag or middle-mouse drag to pan the map view.</p>
        </section>

        <aside className={`map-admin-props panel${rightPanelCollapsed ? ' map-admin-props--collapsed' : ''}`}>
          <div className="map-admin-props-header">
            {!rightPanelCollapsed && <span className="map-admin-props-title">Properties</span>}
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
            <div className="map-admin-props-body">
              {selectedPortalObject ? (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">Portal</h3>
                  <PortalFields object={selectedPortalObject} mapIds={allMapIds} onChange={updateSelectedPortal} />
                  <button type="button" className="danger" onClick={deleteSelectedObject}>Delete portal</button>
                </section>
              ) : selectedDecorObject ? (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">Decor</h3>
                  <p className="muted small">{readDecorAssetId(selectedDecorObject) ?? 'unknown'}</p>
                  <button type="button" className="danger" onClick={deleteSelectedObject}>Delete decor</button>
                </section>
              ) : selectedNpcObject ? (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">NPC</h3>
                  <NpcFields object={selectedNpcObject} onChange={updateSelectedNpc} />
                  <button type="button" className="danger" onClick={deleteSelectedObject}>Delete NPC</button>
                </section>
              ) : selectedMobSpotObject ? (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">Mob spot</h3>
                  <MobSpotFields object={selectedMobSpotObject} mobDefs={allMobDefs} onChange={updateSelectedMobSpot} />
                  <button type="button" className="danger" onClick={deleteSelectedObject}>Delete mob spot</button>
                </section>
              ) : selectedObjectId != null ? (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">Obstacle</h3>
                  <button type="button" className="danger" onClick={deleteSelectedObject}>Delete obstacle</button>
                </section>
              ) : (
                <section className="map-admin-props-section">
                  <h3 className="map-admin-props-heading">{TOOL_LABELS[tool]}</h3>
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
                  {tool === 'tiles' && (
                    <p className="muted small">
                      Drag on the map to select tiles. Drag inside the selection to move them. Press Escape to clear.
                    </p>
                  )}
                  {tool === 'obstacle' && (
                    <p className="muted small">{obstacleMode === 'rect' ? 'Drag to draw a rectangular obstacle.' : obstacleMode === 'line' ? 'Drag to draw a wall.' : obstacleMode === 'erase' ? 'Drag over obstacles to erase them.' : 'Click or drag to place blocked tiles.'}</p>
                  )}
                  {tool === 'portal' && (
                    <p className="muted small">Drag to draw a portal zone, then edit targets here after placing.</p>
                  )}
                  {tool === 'npc' && (
                    <p className="muted small">Click the map to place an NPC marker, then edit fields here.</p>
                  )}
                  {tool === 'mob_spot' && (
                    <p className="muted small">Drag to draw a mob spawn zone, then set mob type, count, and spawn rate.</p>
                  )}
                  {tool === 'select' && (
                    <p className="muted small">Click objects to select. Space + drag or middle-mouse to pan the view.</p>
                  )}
                </section>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="map-admin-fieldset-collapse" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="map-admin-fieldset-body stack compact">{children}</div>
    </details>
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
  const config = parseNpcConfigJson(props.configJson)
  const guildPreview = resolveNpcGuildFromParts(props.npcType, config)
  const guildNameDraft = typeof config.guildName === 'string' ? config.guildName : ''
  const guildIconDraft =
    typeof config.guildIcon === 'string' && NPC_GUILD_ICON_IDS.includes(config.guildIcon as typeof NPC_GUILD_ICON_IDS[number])
      ? config.guildIcon
      : ''

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
          <option value="rental">rental</option>
          <option value="dungeon">dungeon (Dungeon Guide)</option>
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
        sprite design
        <select
          value={props.spriteKey}
          onChange={(e) => onChange({ spriteKey: e.target.value })}
        >
          <option value="">Auto (from NPC type)</option>
          {listNpcSpriteKeys().map((key) => (
            <option key={key} value={key}>{NPC_SPRITE_LABELS[key]}</option>
          ))}
        </select>
      </label>
      <p className="muted small">
        {props.spriteKey
          ? `Override: ${NPC_SPRITE_LABELS[props.spriteKey as keyof typeof NPC_SPRITE_LABELS] ?? props.spriteKey}`
          : (() => {
              const auto = npcArchetypeFromNpcType(props.npcType)
              return auto ? `Auto uses ${NPC_SPRITE_LABELS[auto]}.` : 'Auto: no default sprite for this type.'
            })()}
      </p>
      <label>
        Guild name (optional)
        <input
          value={guildNameDraft}
          placeholder={guildPreview.name}
          onChange={(e) =>
            onChange({ configJson: patchNpcConfigJson(props.configJson, { guildName: e.target.value }) })
          }
        />
      </label>
      <label>
        Guild icon (optional)
        <select
          value={guildIconDraft}
          onChange={(e) =>
            onChange({
              configJson: patchNpcConfigJson(props.configJson, { guildIcon: e.target.value }),
            })
          }
        >
          <option value="">Default ({guildPreview.iconId})</option>
          {NPC_GUILD_ICON_IDS.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
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
      {props.npcType === 'dungeon' && (
        <p className="muted small">
          Dungeon: optional floors filter, e.g.{' '}
          {`{"floors":["dun_f1","dun_f2","dun_f3","dun_f4","dun_f5"]}`}
          . Omit floors to list all from content.
        </p>
      )}
      {configError && <p className="muted small" style={{ color: '#f87171' }}>{configError}</p>}
    </div>
  )
}

function MobSpotFields({
  object,
  mobDefs,
  onChange,
}: {
  object: { id: number }
  mobDefs: Array<{ id: string; name: string }>
  onChange: (patch: Partial<MobSpotObjectProps>) => void
}) {
  const props = readMobSpotProps(object as import('../lib/tmj').TmjMapObject)
  return (
    <div className="stack compact">
      <label>
        spot id
        <input value={props.spotId} onChange={(e) => onChange({ spotId: e.target.value })} />
      </label>
      <label>
        mob
        <select value={props.defId} onChange={(e) => onChange({ defId: e.target.value })}>
          {mobDefs.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
          ))}
        </select>
      </label>
      <label>
        count
        <input
          type="number"
          min={1}
          value={props.count}
          onChange={(e) => onChange({ count: Math.max(1, Number(e.target.value)) })}
        />
      </label>
      <label>
        spawns per minute (spot total)
        <input
          type="number"
          min={0.1}
          step={0.1}
          value={props.spawnsPerMinute}
          onChange={(e) => onChange({ spawnsPerMinute: Number(e.target.value) })}
        />
      </label>
      <label className="map-admin-check">
        <input
          type="checkbox"
          checked={props.canLure}
          onChange={(e) => onChange({ canLure: e.target.checked })}
        />
        Can lure
      </label>
      {props.canLure && (
        <label>
          lure radius (px, 0 = auto)
          <input
            type="number"
            min={0}
            value={props.lureRadius}
            onChange={(e) => onChange({ lureRadius: Number(e.target.value) })}
          />
        </label>
      )}
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
