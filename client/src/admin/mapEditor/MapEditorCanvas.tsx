import { useCallback, useEffect, useRef, useState } from 'react'
import {
  GID_WALL,
  TILE_SIZE,
  addDecorToMap,
  getObjectGroup,
  getTileLayer,
  type TmjMap,
  type TmjMapObject,
} from '../../lib/tmj'
import { DECOR_DRAG_MIME, type DecorAssetId } from '../../lib/mapDecor/catalog'
import { readDecorAssetId } from '../../lib/mapDecor/decorProps'
import { getDecorImage, useDecorImages } from '../../lib/mapDecor/useDecorImages'
import { readPortalProps, writePortalProps } from '../../lib/tmj/properties'
import { collisionFillColor, gidFillColor } from './tileColors'

export type EditorTool = 'ground' | 'collision' | 'obstacle' | 'portal' | 'select'

type ObjectGroupName = 'obstacles' | 'portals' | 'decor'

type Props = {
  map: TmjMap
  tool: EditorTool
  groundGid: number
  collisionBlocked: boolean
  showGround: boolean
  showCollision: boolean
  showDecor: boolean
  showObstacles: boolean
  showPortals: boolean
  selectedObjectId: number | null
  onSelectObject: (id: number | null) => void
  onMapChange: (map: TmjMap) => void
}

type DragState =
  | { kind: 'paint'; layer: 'ground' | 'collision' }
  | { kind: 'rect'; group: 'obstacles' | 'portals'; startX: number; startY: number }
  | { kind: 'move'; group: ObjectGroupName; objectId: number; offsetX: number; offsetY: number }

function snapTile(px: number): number {
  return Math.floor(px / TILE_SIZE)
}

function hitObject(objects: TmjMapObject[], x: number, y: number): TmjMapObject | null {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i]
    if (x >= o.x && x <= o.x + o.width && y >= o.y && y <= o.y + o.height) return o
  }
  return null
}

function objectGroupForHit(map: TmjMap, objectId: number): ObjectGroupName {
  const portals = getObjectGroup(map, 'portals')?.objects ?? []
  if (portals.some((p) => p.id === objectId)) return 'portals'
  const decor = getObjectGroup(map, 'decor')?.objects ?? []
  if (decor.some((d) => d.id === objectId)) return 'decor'
  return 'obstacles'
}

export function MapEditorCanvas({
  map,
  tool,
  groundGid,
  collisionBlocked,
  showGround,
  showCollision,
  showDecor,
  showObstacles,
  showPortals,
  selectedObjectId,
  onSelectObject,
  onMapChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [previewRect, setPreviewRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const decorImagesReady = useDecorImages()

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

    const w = map.width * TILE_SIZE
    const h = map.height * TILE_SIZE
    canvas.width = w
    canvas.height = h

    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, w, h)

    const ground = getTileLayer(map, 'ground')
    const collision = getTileLayer(map, 'collision')

    if (showGround && ground) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const gid = ground.data[y * map.width + x]
          ctx.fillStyle = gidFillColor(gid)
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    if (showCollision && collision) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const gid = collision.data[y * map.width + x]
          const blocked = gid !== 0
          ctx.fillStyle = collisionFillColor(blocked)
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        }
      }
    }

    const decorGroup = getObjectGroup(map, 'decor')
    if (showDecor && decorGroup) {
      for (const o of decorGroup.objects) {
        const assetId = readDecorAssetId(o)
        const img = assetId ? getDecorImage(assetId) : undefined
        const selected = o.id === selectedObjectId
        if (img) {
          ctx.drawImage(img, o.x, o.y, o.width, o.height)
        } else {
          ctx.fillStyle = 'rgba(168, 85, 247, 0.35)'
          ctx.fillRect(o.x, o.y, o.width, o.height)
        }
        if (selected) {
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 2
          ctx.strokeRect(o.x, o.y, o.width, o.height)
        }
      }
    }

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)'
    ctx.lineWidth = 1
    for (let x = 0; x <= map.width; x++) {
      ctx.beginPath()
      ctx.moveTo(x * TILE_SIZE, 0)
      ctx.lineTo(x * TILE_SIZE, h)
      ctx.stroke()
    }
    for (let y = 0; y <= map.height; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * TILE_SIZE)
      ctx.lineTo(w, y * TILE_SIZE)
      ctx.stroke()
    }

    const obstacles = getObjectGroup(map, 'obstacles')
    if (showObstacles && obstacles) {
      for (const o of obstacles.objects) {
        const selected = o.id === selectedObjectId
        ctx.fillStyle = selected ? 'rgba(120, 113, 108, 0.85)' : 'rgba(120, 113, 108, 0.65)'
        ctx.fillRect(o.x, o.y, o.width, o.height)
        ctx.strokeStyle = selected ? '#fbbf24' : '#44403c'
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

    if (previewRect) {
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.strokeRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h)
      ctx.setLineDash([])
    }
  }, [
    map,
    showGround,
    showCollision,
    showDecor,
    showObstacles,
    showPortals,
    selectedObjectId,
    previewRect,
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

  const onPointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = canvasCoords(e.clientX, e.clientY)

    if (tool === 'select') {
      const decor = getObjectGroup(map, 'decor')?.objects ?? []
      const obstacles = getObjectGroup(map, 'obstacles')?.objects ?? []
      const portals = getObjectGroup(map, 'portals')?.objects ?? []
      const hit = hitObject([...portals, ...obstacles, ...decor], x, y)
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
      setDrag({ kind: 'rect', group: 'obstacles', startX: sx, startY: sy })
      setPreviewRect({ x: sx, y: sy, w: TILE_SIZE, h: TILE_SIZE })
      return
    }
    if (tool === 'portal') {
      const sx = snapTile(x) * TILE_SIZE
      const sy = snapTile(y) * TILE_SIZE
      setDrag({ kind: 'rect', group: 'portals', startX: sx, startY: sy })
      setPreviewRect({ x: sx, y: sy, w: TILE_SIZE, h: TILE_SIZE })
    }
  }

  const onPointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drag) return
    const { x, y } = canvasCoords(e.clientX, e.clientY)

    if (drag.kind === 'paint') {
      paintTile(snapTile(x), snapTile(y), drag.layer)
      return
    }

    if (drag.kind === 'move') {
      updateObjectInGroup(drag.group, drag.objectId, {
        x: Math.round(x - drag.offsetX),
        y: Math.round(y - drag.offsetY),
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
    }
  }

  const finishRect = (group: 'obstacles' | 'portals', rect: { x: number; y: number; w: number; h: number }) => {
    const id = map.nextobjectid
    const obj: TmjMapObject = {
      id,
      name: group === 'obstacles' ? `obstacle_${id}` : `portal_${id}`,
      type: group === 'obstacles' ? 'obstacle' : 'portal',
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
