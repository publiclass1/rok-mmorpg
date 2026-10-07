import { useEffect, useRef, useState } from 'react'
import type { MinimapPayload, MinimapWorldRect } from '../game/world/minimapTypes'
import { minimapToWorld, worldRectToMinimap, worldToMinimap } from '../game/world/minimapGeometry'
import { emitGameEvent } from '../game/events'
import { useModalDrag } from './motion/useModalDrag'

const PAD = 6
const COMPACT_SIZE = 136
const EXPANDED_MAX = 280
const HUD_MARGIN = 10

type Props = {
  data: MinimapPayload | null
}

function fullWorldRect(data: MinimapPayload): MinimapWorldRect {
  return { x: 0, y: 0, width: data.worldWidth, height: data.worldHeight }
}

function expandedPanelSize(data: MinimapPayload): { width: number; height: number } {
  const ww = Math.max(data.worldWidth, 1)
  const wh = Math.max(data.worldHeight, 1)
  const aspect = ww / wh
  if (aspect >= 1) {
    return { width: EXPANDED_MAX, height: Math.max(120, Math.round(EXPANDED_MAX / aspect)) }
  }
  return { width: Math.max(120, Math.round(EXPANDED_MAX * aspect)), height: EXPANDED_MAX }
}

function minimapInitialPosition(panel: HTMLElement) {
  const w = panel.offsetWidth
  return {
    x: Math.max(HUD_MARGIN, window.innerWidth - w - HUD_MARGIN),
    y: HUD_MARGIN,
  }
}

function MinimapRadar({
  data,
  width,
  height,
  expanded,
}: {
  data: MinimapPayload
  width: number
  height: number
  expanded: boolean
}) {
  const innerW = width - PAD * 2
  const innerH = height - PAD * 2
  const view = expanded ? fullWorldRect(data) : data.view
  const mode = expanded ? 'fit' : 'stretch'
  const toMap = (wx: number, wy: number) => worldToMinimap(wx, wy, view, innerW, innerH, PAD, mode)
  const rectToMap = (rect: MinimapWorldRect) =>
    worldRectToMinimap(rect, view, innerW, innerH, PAD, mode)
  const local = toMap(data.localPlayer.x, data.localPlayer.y)
  const mobR = expanded ? 4 : 2.5
  const remoteR = expanded ? 4.5 : 3
  const npcR = expanded ? 3.5 : 2.5
  const playerR = expanded ? 6 : 4
  const cameraRect = expanded ? rectToMap(data.view) : null

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const svg = e.currentTarget
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const local = pt.matrixTransform(ctm.inverse())
    const world = minimapToWorld(local.x, local.y, view, innerW, innerH, PAD, mode)
    const wx = Math.max(0, Math.min(data.worldWidth, world.x))
    const wy = Math.max(0, Math.min(data.worldHeight, world.y))
    emitGameEvent('minimapMove', { x: wx, y: wy })
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="game-hud-minimap-svg game-hud-minimap-svg--interactive"
      onClick={handleClick}
    >
      <title>Click to move</title>
      <rect
        x={PAD}
        y={PAD}
        width={innerW}
        height={innerH}
        rx={4}
        fill="#0b1220"
        stroke="#334155"
        strokeWidth={1}
      />
      {data.blockedTiles.map((t, i) => {
        const r = rectToMap(t)
        return (
          <rect
            key={`w-${i}`}
            x={r.x}
            y={r.y}
            width={Math.max(0.5, r.width)}
            height={Math.max(0.5, r.height)}
            fill="#475569"
            opacity={0.85}
          />
        )
      })}
      {data.obstacles.map((o, i) => {
        const r = rectToMap(o)
        return (
          <rect
            key={`o-${i}`}
            x={r.x}
            y={r.y}
            width={Math.max(0.5, r.width)}
            height={Math.max(0.5, r.height)}
            fill="#78716c"
            stroke="#44403c"
            strokeWidth={0.5}
          />
        )
      })}
      {data.npcs.map((n) => {
        const p = toMap(n.x, n.y)
        return <circle key={`n-${n.npcId}`} cx={p.x} cy={p.y} r={npcR} fill="#fbbf24" stroke="#78350f" strokeWidth={0.75} />
      })}
      {data.mobs.map((m) => {
        const p = toMap(m.x, m.y)
        return <circle key={`m-${m.spawnIndex}`} cx={p.x} cy={p.y} r={mobR} fill="#f472b6" />
      })}
      {data.remotes.map((r) => {
        const p = toMap(r.x, r.y)
        return <circle key={r.characterId} cx={p.x} cy={p.y} r={remoteR} fill="#60a5fa" />
      })}
      {cameraRect && cameraRect.width > 0 && cameraRect.height > 0 && (
        <rect
          x={cameraRect.x}
          y={cameraRect.y}
          width={cameraRect.width}
          height={cameraRect.height}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1}
          strokeDasharray="3 2"
          opacity={0.9}
        />
      )}
      <circle cx={local.x} cy={local.y} r={playerR} fill="#4ade80" stroke="#14532d" strokeWidth={1} />
    </svg>
  )
}

export function Minimap({ data }: Props) {
  const [expanded, setExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    emitGameEvent('minimapUi', { expanded })
  }, [expanded])

  const panelSize =
    data && expanded ? expandedPanelSize(data) : { width: COMPACT_SIZE, height: COMPACT_SIZE }
  const pos = useModalDrag(panelRef, true, minimapInitialPosition, [
    Boolean(data),
    data?.mapId,
    panelSize.width,
    panelSize.height,
    expanded,
  ])

  if (!data || data.view.width <= 0 || data.view.height <= 0) return null

  const panelStyle = pos
    ? { position: 'fixed' as const, left: pos.x, top: pos.y, margin: 0, visibility: 'visible' as const }
    : { position: 'fixed' as const, left: 0, top: 0, margin: 0, visibility: 'hidden' as const }

  return (
    <div
      ref={panelRef}
      className={`game-hud-minimap${expanded ? ' game-hud-minimap--expanded' : ''}`}
      style={panelStyle}
      aria-label="Minimap"
    >
      <div className="game-hud-minimap-header modal-drag-handle" title="Drag to move minimap">
        <span className="game-hud-minimap-title">Map</span>
        <button
          type="button"
          className="game-hud-minimap-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Restore minimap size' : 'Maximize minimap'}
          title={expanded ? 'Restore size' : 'Maximize'}
        >
          {expanded ? '▢' : '⤢'}
        </button>
      </div>
      <MinimapRadar data={data} width={panelSize.width} height={panelSize.height} expanded={expanded} />
    </div>
  )
}
