import { useCallback, useEffect, useRef, useState } from 'react'
import {
  GID_WALL,
  TILE_SIZE,
  addDecorToMap,
  ensureObjectGroups,
  getObjectGroup,
  getTileLayer,
  moveTileRegion,
  type TileRegion,
  type TmjMap,
  type TmjMapObject,
} from '../../lib/tmj'
import { DECOR_DRAG_MIME, type DecorAssetId } from '../../lib/mapDecor/catalog'
import { decorFootprintRects } from '../../lib/mapDecor/decorFootprints'
import { readDecorAssetId } from '../../lib/mapDecor/decorProps'
import { getDecorImage, useDecorImages } from '../../lib/mapDecor/useDecorImages'
import {
  readMobSpotProps,
  readNpcProps,
  readPortalProps,
  writeMobSpotProps,
  writeNpcProps,
  writePortalProps,
} from '../../lib/tmj/properties'
import { collisionFillColor, gidFillColor } from './tileColors'
import { useMapEditorPan } from './MapEditorPanContext'
import {
  GUILD_BADGE_GAP,
  GUILD_BADGE_OFFSET_Y,
  GUILD_ICON_SIZE,
  guildIconCanvasStyle,
  parseNpcConfigJson,
  resolveNpcGuildFromParts,
} from '../../game/npc/npcGuildBadge'

export type EditorTool = 'ground' | 'collision' | 'tiles' | 'obstacle' | 'portal' | 'npc' | 'mob_spot' | 'select'

type ObjectGroupName = 'obstacles' | 'portals' | 'decor' | 'npcs' | 'mob_spots'

const NPC_MARKER_W = 48
const NPC_MARKER_H = 64

type Props = {
  map: TmjMap
  mapId: string
  tool: EditorTool
  groundGid: number
  collisionBlocked: boolean
  obstacleMode: 'tile' | 'rect' | 'line' | 'erase'
  showGrid: boolean
  showGround: boolean
  showCollision: boolean
  showDecor: boolean
  showObstacles: boolean
  showPortals: boolean
  showNpcs: boolean
  showMobSpots: boolean
  selectedObjectId: number | null
  onSelectObject: (id: number | null) => void
  onMapChange: (map: TmjMap) => void
}

type DragState =
  | { kind: 'paint'; layer: 'ground' | 'collision' }
  | { kind: 'rect'; group: 'obstacles' | 'portals' | 'mob_spots'; startX: number; startY: number }
  | { kind: 'move'; group: ObjectGroupName; objectId: number; offsetX: number; offsetY: number }
  | { kind: 'tileMarquee'; startTx: number; startTy: number }
  | { kind: 'moveTiles'; pointerStartTx: number; pointerStartTy: number }

function snapTile(px: number): number {
  return Math.floor(px / TILE_SIZE)
}

function tileRegionFromPoints(tx0: number, ty0: number, tx1: number, ty1: number): TileRegion {
  const tx = Math.min(tx0, tx1)
  const ty = Math.min(ty0, ty1)
  return {
    tx,
    ty,
    tw: Math.abs(tx1 - tx0) + 1,
    th: Math.abs(ty1 - ty0) + 1,
  }
}

function pointerInTileRegion(tx: number, ty: number, region: TileRegion): boolean {
  return tx >= region.tx && ty >= region.ty && tx < region.tx + region.tw && ty < region.ty + region.th
}

function hitObject(objects: TmjMapObject[], x: number, y: number): TmjMapObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]
    if (x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height) return o
  }
  return null
}

function objectGroupForHit(map: TmjMap, objectId: number): ObjectGroupName {
  const npcs = getObjectGroup(map, 'npcs')?.objects ?? []
  if (npcs.some((p) => p.id === objectId)) return 'npcs'
  const portals = getObjectGroup(map, 'portals')?.objects ?? []
  if (portals.some((p) => p.id === objectId)) return 'portals'
  const mobSpots = getObjectGroup(map, 'mob_spots')?.objects ?? []
  if (mobSpots.some((p) => p.id === objectId)) return 'mob_spots'
  const decor = getObjectGroup(map, 'decor')?.objects ?? []
  if (decor.some((d) => d.id === objectId)) return 'decor'
  return 'obstacles'
}

export function MapEditorCanvas({
  map,
  mapId,
  tool,
  groundGid,
  collisionBlocked,
  obstacleMode,
  showGrid,
  showGround,
  showCollision,
  showDecor,
  showObstacles,
  showPortals,
  showNpcs,
  showMobSpots,
  selectedObjectId,
  onSelectObject,
  onMapChange,
}: Props) {
  const { spaceDown, panning } = useMapEditorPan()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [tileSel, setTileSel] = useState<TileRegion | null>(null)
  const [tileMarqueePreview, setTileMarqueePreview] = useState<TileRegion | null>(null)
  const [tileMoveDelta, setTileMoveDelta] = useState<{ dtx: number; dty: number } | null>(null)
  const decorImagesReady = useDecorImages()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTileSel(null)
        setTileMarqueePreview(null)
        setTileMoveDelta(null)
        setDrag(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const paintTile = useCallback(
    (tileX: number, tileY: number, layerName: 'ground' | 'collision') => {
      if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return
      const layer = getTileLayer(map, layerName)
      if (!layer) return
      const idx = tileY * map.width + tileX
      const next = { ...map, layers: map.layers.map((l) => ({ ...l })) }
      const target = getTileLayer(next, layerName)
      if (!target) return
      target.data = [...layer.data]
      if (layerName === 'ground') {
        target.data[idx] = groundGid
      } else {
        target.data[idx] = collisionBlocked ? GID_WALL : 0
      }
      onMapChange(next)
    },
    [map, groundGid, collisionBlocked, onMapChange],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
  const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true

    const w = map.width * TILE_SIZE
    const h = map.height * TILE_SIZE
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.clearRect(0, 0, w, h)

    const ground = getTileLayer(map, 'ground')
    if (showGround && ground) {
      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const gid = ground.data[ty * map.width + tx]
          ctx.fillStyle = gidFillColor(gid)
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    const collision = getTileLayer(map, 'collision')
    if (showCollision && collision) {
      for (let ty = 0; ty < map.height; ty++) {
        for (let tx = 0; tx < map.width; tx++) {
          const gid = collision.data[ty * map.width + tx]
          if (gid === 0) continue
          ctx.fillStyle = collisionFillColor(true)
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    if (showGrid) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)'
      ctx.lineWidth = 1
      for (let tx = 0; tx <= map.width; tx++) { ctx.beginPath(); ctx.moveTo(tx * TILE_SIZE + 0.5, 0); ctx.lineTo(tx * TILE_SIZE + 0.5, h); ctx.stroke() }
      for (let ty = 0; ty <= map.height; ty++) { ctx.beginPath(); ctx.moveTo(0, ty * TILE_SIZE + 0.5); ctx.lineTo(w, ty * TILE_SIZE + 0.5); ctx.stroke() }
    }

    const decor = getObjectGroup(map, 'decor')
    if (showDecor && decor) {
      for (const o of decor.objects) {
        const assetId = readDecorAssetId(o)
        const img = assetId ? getDecorImage(assetId) : null
        const selected = o.id === selectedObjectId
        if (img) {
          const seamless = assetId === 'river' || assetId === 'lake' || assetId === 'bush' || assetId === 'stones'
          ctx.save()
          if (!seamless) {
            ctx.shadowColor = 'rgba(15, 23, 42, 0.38)'
            ctx.shadowBlur = 5
            ctx.shadowOffsetY = 3
          }
          ctx.drawImage(img, o.x, o.y, o.width, o.height)
          ctx.restore()
        } else {
          ctx.fillStyle = selected ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.45)'
          ctx.fillRect(o.x, o.y, o.width, o.height)
        }
        if (selected) {
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2
          ctx.strokeRect(o.x, o.y, o.width, o.height)
        }
      }
      for (const fp of decorFootprintRects(decor.objects)) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'
        ctx.fillRect(fp.x, fp.y, fp.width, fp.height)
        ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)'
        ctx.lineWidth = 1
        ctx.strokeRect(fp.x, fp.y, fp.width, fp.height)
      }
    }

    const obstacles = getObjectGroup(map, 'obstacles')
    if (showObstacles && obstacles) {
      for (const o of obstacles.objects) {
        const selected = o.id === selectedObjectId
        ctx.fillStyle = selected ? 'rgba(127, 29, 29, 0.82)' : 'rgba(185, 28, 28, 0.58)'
        ctx.fillRect(o.x, o.y, o.width, o.height)
        ctx.strokeStyle = selected ? '#fde047' : '#991b1b'
        ctx.lineWidth = selected ? 2 : 1
        ctx.strokeRect(o.x, o.y, o.width, o.height)
      }
    }

    const portals = getObjectGroup(map, 'portals')
    if (showPortals && portals) {
      for (const o of portals.objects) {
        const selected = o.id === selectedObjectId
        ctx.fillStyle = selected ? 'rgba(96, 165, 250, 0.55)' : 'rgba(59, 130, 246, 0.4)'
        ctx.fillRect(o.x, o.y, o.width, o.height)
        ctx.strokeStyle = selected ? '#fbbf24' : '#2563eb'
        ctx.lineWidth = selected ? 2 : 1
        ctx.strokeRect(o.x, o.y, o.width, o.height)
        const label = readPortalProps(o).label
        ctx.fillStyle = '#e5e7eb'
        ctx.font = '11px system-ui'
        ctx.fillText(label, o.x + 4, o.y + 14)
      }
    }

    const npcs = getObjectGroup(map, 'npcs')
    if (showNpcs && npcs) {
      for (const o of npcs.objects) {
        const selected = o.id === selectedObjectId
        ctx.fillStyle = selected ? 'rgba(167, 139, 250, 0.6)' : 'rgba(139, 92, 246, 0.45)'
        ctx.fillRect(o.x, o.y, o.width, o.height)
        ctx.strokeStyle = selected ? '#fbbf24' : '#7c3aed'
        ctx.lineWidth = selected ? 2 : 1
        ctx.strokeRect(o.x, o.y, o.width, o.height)
        const npcProps = readNpcProps(o)
        const label = npcProps.label
        ctx.fillStyle = '#e5e7eb'
        ctx.font = '11px system-ui'
        ctx.fillText(label, o.x + 4, o.y + 14)
        const cx = o.x + o.width / 2
        const feetY = o.y + o.height
        const guild = resolveNpcGuildFromParts(
          npcProps.npcType,
          parseNpcConfigJson(npcProps.configJson),
        )
        const badgeY = feetY + GUILD_BADGE_OFFSET_Y
        ctx.font = '9px system-ui'
        const textW = ctx.measureText(guild.name).width
        const totalW = GUILD_ICON_SIZE + GUILD_BADGE_GAP + textW
        const left = cx - totalW / 2
        const iconStyle = guildIconCanvasStyle(guild.iconId)
        ctx.fillStyle = iconStyle.fill
        ctx.fillRect(left, badgeY - GUILD_ICON_SIZE / 2, GUILD_ICON_SIZE, GUILD_ICON_SIZE)
        ctx.fillStyle = '#0f172a'
        ctx.font = 'bold 8px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(iconStyle.letters, left + GUILD_ICON_SIZE / 2, badgeY + 3)
        ctx.textAlign = 'left'
        ctx.fillStyle = '#a5b4fc'
        ctx.font = '9px system-ui'
        ctx.fillText(guild.name, left + GUILD_ICON_SIZE + GUILD_BADGE_GAP, badgeY + 3)
      }
    }

    const mobSpots = getObjectGroup(map, 'mob_spots')
    if (showMobSpots && mobSpots) {
      for (const o of mobSpots.objects) {
        const selected = o.id === selectedObjectId
        ctx.fillStyle = selected ? 'rgba(244, 114, 182, 0.55)' : 'rgba(236, 72, 153, 0.35)'
        ctx.fillRect(o.x, o.y, o.width, o.height)
        ctx.strokeStyle = selected ? '#fbbf24' : '#db2777'
        ctx.lineWidth = selected ? 2 : 1
        ctx.strokeRect(o.x, o.y, o.width, o.height)
        const spotProps = readMobSpotProps(o)
        const label = `${spotProps.defId} ×${spotProps.count}`
        ctx.fillStyle = '#fce7f3'
        ctx.font = '11px system-ui'
        ctx.fillText(label, o.x + 4, o.y + 14)
        ctx.fillText(`${spotProps.spawnsPerMinute}/min`, o.x + 4, o.y + 28)
      }
    }

    if (previewRect) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h)
      ctx.setLineDash([])
    }

    const activeSel = tileMarqueePreview ?? tileSel
    if (activeSel) {
      const px = activeSel.tx * TILE_SIZE
      const py = activeSel.ty * TILE_SIZE
      const pw = activeSel.tw * TILE_SIZE
      const ph = activeSel.th * TILE_SIZE
      ctx.fillStyle = 'rgba(251, 191, 36, 0.2)'
      ctx.fillRect(px, py, pw, ph)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(px, py, pw, ph)
      ctx.setLineDash([])
    }

    if (tileSel && tileMoveDelta && (tileMoveDelta.dtx !== 0 || tileMoveDelta.dty !== 0)) {
      const destTx = tileSel.tx + tileMoveDelta.dtx
      const destTy = tileSel.ty + tileMoveDelta.dty
      const ground = getTileLayer(map, 'ground')
      if (ground) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.35)'
        for (let ry = 0; ry < tileSel.th; ry++) {
          for (let rx = 0; rx < tileSel.tw; rx++) {
            const sx = tileSel.tx + rx
            const sy = tileSel.ty + ry
            if (sx < 0 || sy < 0 || sx >= map.width || sy >= map.height) continue
            const dx = destTx + rx
            const dy = destTy + ry
            if (dx < 0 || dy < 0 || dx >= map.width || dy >= map.height) continue
            const gid = ground.data[sy * map.width + sx]
            ctx.fillStyle = gidFillColor(gid)
            ctx.globalAlpha = 0.55
            ctx.fillRect(dx * TILE_SIZE, dy * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            ctx.globalAlpha = 1
          }
        }
      }
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 2
      ctx.setLineDash([2, 2])
      ctx.strokeRect(
        destTx * TILE_SIZE,
        destTy * TILE_SIZE,
        tileSel.tw * TILE_SIZE,
        tileSel.th * TILE_SIZE,
      )
      ctx.setLineDash([])
    }
  }, [
    map,
    showGround,
    showCollision,
    showDecor,
    showObstacles,
    showPortals,
    showNpcs,
    showMobSpots,
    showGrid,
    selectedObjectId,
    previewRect,
    tileSel,
    tileMarqueePreview,
    tileMoveDelta,
    decorImagesReady,
  ])

  useEffect(() => {
    draw()
  }, [draw])

  const canvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const updateObjectInGroup = (groupName: ObjectGroupName, objectId: number, patch: Partial<TmjMapObject>) => {
    const next: TmjMap = {
      ...map,
      layers: map.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== groupName) return layer
        return {
          ...layer,
          objects: layer.objects.map((o) => (o.id === objectId ? { ...o, ...patch } : o)),
        }
      }),
    }
    onMapChange(next)
  }

  const placeNpc = (x: number, y: number) => {
    const draft: TmjMap = structuredClone(map)
    ensureObjectGroups(draft)
    const id = draft.nextobjectid
    const ox = Math.round(x - NPC_MARKER_W / 2)
    const oy = Math.round(y - NPC_MARKER_H / 2)
    const obj: TmjMapObject = {
      id,
      name: `${mapId}_npc_${id}`,
      type: 'npc',
      x: ox,
      y: oy,
      width: NPC_MARKER_W,
      height: NPC_MARKER_H,
    }
    writeNpcProps(obj, {
      npcId: `${mapId}_npc_${id}`,
      npcType: 'shop',
      label: 'NPC',
      facing: 'down',
      spriteKey: '',
      configJson: '{}',
    })
    const next: TmjMap = {
      ...draft,
      nextobjectid: draft.nextobjectid + 1,
      layers: draft.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== 'npcs') return layer
        return { ...layer, objects: [...layer.objects, obj] }
      }),
    }
    onMapChange(next)
    onSelectObject(obj.id)
  }

  const onPointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || (spaceDown && e.button === 0) || panning) return

    const { x, y } = canvasCoords(e.clientX, e.clientY)

    if (tool === 'select') {
      const decor = getObjectGroup(map, 'decor')?.objects ?? []
      const obstacles = getObjectGroup(map, 'obstacles')?.objects ?? []
      const portals = getObjectGroup(map, 'portals')?.objects ?? []
      const npcs = getObjectGroup(map, 'npcs')?.objects ?? []
      const mobSpots = getObjectGroup(map, 'mob_spots')?.objects ?? []
      const hit = hitObject([...mobSpots, ...npcs, ...portals, ...obstacles, ...decor], x, y)
      if (hit) {
        onSelectObject(hit.id)
        const group = objectGroupForHit(map, hit.id)
        setDrag({ kind: 'move', group, objectId: hit.id, offsetX: x - hit.x, offsetY: y - hit.y })
      } else {
        onSelectObject(null)
      }
      return
    }

    if (tool === 'ground') {
      setDrag({ kind: 'paint', layer: 'ground' })
      paintTile(snapTile(x), snapTile(y), 'ground')
      return
    }
    if (tool === 'collision') {
      setDrag({ kind: 'paint', layer: 'collision' })
      paintTile(snapTile(x), snapTile(y), 'collision')
      return
    }
    if (tool === 'obstacle') {
      const sx = snapTile(x) * TILE_SIZE
      const sy = snapTile(y) * TILE_SIZE
      if (obstacleMode === 'erase') {
        const hit = hitObject(getObjectGroup(map, 'obstacles')?.objects ?? [], x, y)
        if (hit) removeObject(hit.id)
        setDrag({ kind: 'paint', layer: 'collision' })
        return
      }
      setDrag({ kind: 'rect', group: 'obstacles', startX: sx, startY: sy })
      setPreviewRect({ x: sx, y: sy, w: TILE_SIZE, h: TILE_SIZE })
      return
    }
    if (tool === 'portal') {
      const sx = snapTile(x) * TILE_SIZE
      const sy = snapTile(y) * TILE_SIZE
      setDrag({ kind: 'rect', group: 'portals', startX: sx, startY: sy })
      setPreviewRect({ x: sx, y: sy, w: TILE_SIZE, h: TILE_SIZE })
      return
    }
    if (tool === 'mob_spot') {
      const sx = snapTile(x) * TILE_SIZE
      const sy = snapTile(y) * TILE_SIZE
      setDrag({ kind: 'rect', group: 'mob_spots', startX: sx, startY: sy })
      setPreviewRect({ x: sx, y: sy, w: TILE_SIZE, h: TILE_SIZE })
      return
    }
    if (tool === 'npc') {
      placeNpc(x, y)
    }

    if (tool === 'tiles') {
      const ptx = snapTile(x)
      const pty = snapTile(y)
      if (tileSel && pointerInTileRegion(ptx, pty, tileSel)) {
        setDrag({ kind: 'moveTiles', pointerStartTx: ptx, pointerStartTy: pty })
        setTileMoveDelta({ dtx: 0, dty: 0 })
      } else {
        setTileSel(null)
        setDrag({ kind: 'tileMarquee', startTx: ptx, startTy: pty })
        setTileMarqueePreview({ tx: ptx, ty: pty, tw: 1, th: 1 })
      }
    }
  }

  const onPointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return
    const { x, y } = canvasCoords(e.clientX, e.clientY)

    if (drag.kind === 'paint') {
      if (tool === 'obstacle' && obstacleMode === 'erase') {
        const hit = hitObject(getObjectGroup(map, 'obstacles')?.objects ?? [], ...(() => { const p = canvasCoords(e.clientX, e.clientY); return [p.x, p.y] as [number, number] })())
        if (hit) removeObject(hit.id)
        return
      }
      paintTile(snapTile(x), snapTile(y), drag.layer)
      return
    }

    if (drag.kind === 'move') {
      updateObjectInGroup(drag.group, drag.objectId, {
        x: snapTile(x - drag.offsetX) * TILE_SIZE,
        y: snapTile(y - drag.offsetY) * TILE_SIZE,
      })
      return
    }

    if (drag.kind === 'rect') {
      const ex = snapTile(x) * TILE_SIZE
      const ey = snapTile(y) * TILE_SIZE
      const rx = Math.min(drag.startX, ex)
      const ry = Math.min(drag.startY, ey)
      const rw = Math.max(TILE_SIZE, Math.abs(ex - drag.startX) + TILE_SIZE)
      const rh = Math.max(TILE_SIZE, Math.abs(ey - drag.startY) + TILE_SIZE)
      setPreviewRect({ x: rx, y: ry, w: rw, h: rh })
      return
    }

    if (drag.kind === 'tileMarquee') {
      const ptx = snapTile(x)
      const pty = snapTile(y)
      setTileMarqueePreview(tileRegionFromPoints(drag.startTx, drag.startTy, ptx, pty))
      return
    }

    if (drag.kind === 'moveTiles' && tileSel) {
      const ptx = snapTile(x)
      const pty = snapTile(y)
      setTileMoveDelta({
        dtx: ptx - drag.pointerStartTx,
        dty: pty - drag.pointerStartTy,
      })
    }
  }

  const removeObject = (objectId: number) => {
    onMapChange({ ...map, layers: map.layers.map((layer) => layer.type === 'objectgroup' ? { ...layer, objects: layer.objects.filter((o) => o.id !== objectId) } : layer) })
  }

  const finishRect = (
    group: 'obstacles' | 'portals' | 'mob_spots',
    rect: { x: number; y: number; w: number; h: number },
  ) => {
    const id = map.nextobjectid
    const obj: TmjMapObject = {
      id,
      name:
        group === 'obstacles'
          ? `obstacle_${id}`
          : group === 'portals'
            ? `portal_${id}`
            : `${mapId}_spot_${id}`,
      type: group === 'obstacles' ? 'obstacle' : group === 'portals' ? 'portal' : 'mob_spot',
      x: rect.x,
      y: rect.y,
      width: rect.w,
      height: rect.h,
    }
    if (group === 'portals') {
      writePortalProps(obj, {
        portalId: `portal_${id}`,
        targetMapId: 'prontera',
        targetX: 320,
        targetY: 320,
        label: 'Warp',
        mode: 'both',
      })
    }
    if (group === 'mob_spots') {
      writeMobSpotProps(obj, {
        spotId: `${mapId}_spot_${id}`,
        defId: 'poring',
        count: 1,
        spawnsPerMinute: 7.5,
        canLure: true,
        lureRadius: 0,
      })
    }
    const next: TmjMap = {
      ...map,
      nextobjectid: map.nextobjectid + 1,
      layers: map.layers.map((layer) => {
        if (layer.type !== 'objectgroup' || layer.name !== group) return layer
        return { ...layer, objects: [...layer.objects, obj] }
      }),
    }
    onMapChange(next)
    onSelectObject(obj.id)
  }

  const onPointerUp = () => {
    if (drag?.kind === 'rect' && previewRect) {
      finishRect(drag.group, previewRect)
    }
    if (drag?.kind === 'tileMarquee' && tileMarqueePreview) {
      setTileSel(tileMarqueePreview)
      setTileMarqueePreview(null)
    }
    if (drag?.kind === 'moveTiles' && tileSel && tileMoveDelta) {
      const { dtx, dty } = tileMoveDelta
      if (dtx !== 0 || dty !== 0) {
        onMapChange(moveTileRegion(map, tileSel, dtx, dty))
        setTileSel({
          tx: tileSel.tx + dtx,
          ty: tileSel.ty + dty,
          tw: tileSel.tw,
          th: tileSel.th,
        })
      }
      setTileMoveDelta(null)
    }
    setDrag(null)
    setPreviewRect(null)
  }

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DECOR_DRAG_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const onDrop = (e: React.DragEvent) => {
    const assetId = e.dataTransfer.getData(DECOR_DRAG_MIME) as DecorAssetId
    if (!assetId) return
    e.preventDefault()
    const { x, y } = canvasCoords(e.clientX, e.clientY)
    const next = addDecorToMap(map, assetId, x, y)
    onMapChange(next)
    const decor = getObjectGroup(next, 'decor')
    const placed = decor?.objects[decor.objects.length - 1]
    if (placed) onSelectObject(placed.id)
  }

  return (
    <canvas
      ref={canvasRef}
      className="map-admin-canvas"
      onMouseDown={onPointerDown}
      onMouseMove={onPointerMove}
      onMouseUp={onPointerUp}
      onMouseLeave={onPointerUp}
      onDragOver={onDragOver}
      onDrop={onDrop}
    />
  )
}
