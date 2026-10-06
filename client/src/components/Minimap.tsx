import type { MinimapPayload } from '../game/world/minimapTypes'

const SIZE = 136
const PAD = 6

type Props = {
  data: MinimapPayload | null
}

function layout(data: MinimapPayload) {
  const inner = SIZE - PAD * 2
  const scale = inner / Math.max(data.worldWidth, data.worldHeight, 1)
  const mapW = data.worldWidth * scale
  const mapH = data.worldHeight * scale
  const offX = PAD + (inner - mapW) / 2
  const offY = PAD + (inner - mapH) / 2
  const toMap = (wx: number, wy: number) => ({
    x: offX + wx * scale,
    y: offY + wy * scale,
  })
  return { scale, offX, offY, mapW, mapH, toMap }
}

export function Minimap({ data }: Props) {
  if (!data || data.worldWidth <= 0 || data.worldHeight <= 0) return null

  const { offX, offY, mapW, mapH, toMap } = layout(data)
  const view = data.view
  const viewX = offX + view.x * (mapW / data.worldWidth)
  const viewY = offY + view.y * (mapH / data.worldHeight)
  const viewW = view.width * (mapW / data.worldWidth)
  const viewH = view.height * (mapH / data.worldHeight)
  const local = toMap(data.localPlayer.x, data.localPlayer.y)

  return (
    <div className="game-hud-minimap" aria-label="Minimap">
      <span className="game-hud-minimap-title">Map</span>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="game-hud-minimap-svg">
        <rect x={PAD} y={PAD} width={SIZE - PAD * 2} height={SIZE - PAD * 2} rx={4} fill="#0b1220" />
        <rect x={offX} y={offY} width={mapW} height={mapH} fill="#1e293b" stroke="#334155" strokeWidth={1} />
        <rect
          x={viewX}
          y={viewY}
          width={Math.max(2, viewW)}
          height={Math.max(2, viewH)}
          fill="none"
          stroke="#f8fafc"
          strokeWidth={1.25}
          strokeDasharray="3 2"
          opacity={0.9}
        />
        {data.mobs.map((m) => {
          const p = toMap(m.x, m.y)
          return <circle key={`m-${m.spawnIndex}`} cx={p.x} cy={p.y} r={2.5} fill="#f472b6" />
        })}
        {data.remotes.map((r) => {
          const p = toMap(r.x, r.y)
          return <circle key={r.characterId} cx={p.x} cy={p.y} r={3} fill="#60a5fa" />
        })}
        <circle cx={local.x} cy={local.y} r={4} fill="#4ade80" stroke="#14532d" strokeWidth={1} />
      </svg>
    </div>
  )
}
