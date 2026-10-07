import type {
  NpcObjectNpcType,
  NpcObjectProps,
  TmjMapObject,
  TmjObjectProperty,
  PortalObjectProps,
} from './types'

export function getObjectProperty(obj: TmjMapObject, name: string): string | number | boolean | undefined {
  const prop = obj.properties?.find((p) => p.name === name)
  return prop?.value
}

export function setObjectProperties(obj: TmjMapObject, entries: Record<string, string | number | boolean>): void {
  const map = new Map<string, TmjObjectProperty>()
  for (const p of obj.properties ?? []) {
    map.set(p.name, p)
  }
  for (const [name, value] of Object.entries(entries)) {
    const type = typeof value === 'number' ? 'float' : typeof value === 'boolean' ? 'bool' : 'string'
    map.set(name, { name, type, value })
  }
  obj.properties = [...map.values()]
}

export function readPortalProps(obj: TmjMapObject): PortalObjectProps {
  const portalId = String(getObjectProperty(obj, 'portalId') ?? obj.name ?? `portal_${obj.id}`)
  const targetMapId = String(getObjectProperty(obj, 'targetMapId') ?? '')
  const targetX = Number(getObjectProperty(obj, 'targetX') ?? 0)
  const targetY = Number(getObjectProperty(obj, 'targetY') ?? 0)
  const label = String(getObjectProperty(obj, 'label') ?? 'Warp')
  const modeRaw = String(getObjectProperty(obj, 'mode') ?? 'both')
  const mode = modeRaw === 'walk' || modeRaw === 'npc' ? modeRaw : 'both'
  return { portalId, targetMapId, targetX, targetY, label, mode }
}

export function writePortalProps(obj: TmjMapObject, props: PortalObjectProps): void {
  obj.name = props.portalId
  obj.type = 'portal'
  setObjectProperties(obj, {
    portalId: props.portalId,
    targetMapId: props.targetMapId,
    targetX: props.targetX,
    targetY: props.targetY,
    label: props.label,
    mode: props.mode,
  })
}

const NPC_TYPES: NpcObjectNpcType[] = [
  'teleport',
  'storage',
  'save',
  'job_master',
  'shop',
  'healer',
  'dungeon',
]

function parseNpcType(raw: string): NpcObjectNpcType {
  return NPC_TYPES.includes(raw as NpcObjectNpcType) ? (raw as NpcObjectNpcType) : 'shop'
}

export function readNpcProps(obj: TmjMapObject): NpcObjectProps {
  const npcId = String(getObjectProperty(obj, 'npcId') ?? obj.name ?? `npc_${obj.id}`)
  const npcType = parseNpcType(String(getObjectProperty(obj, 'npcType') ?? 'shop'))
  const label = String(getObjectProperty(obj, 'label') ?? 'NPC')
  const facingRaw = String(getObjectProperty(obj, 'facing') ?? 'down')
  const facing =
    facingRaw === 'up' || facingRaw === 'left' || facingRaw === 'right' ? facingRaw : 'down'
  const spriteKey = String(getObjectProperty(obj, 'spriteKey') ?? '')
  const configJson = String(getObjectProperty(obj, 'configJson') ?? '{}')
  return { npcId, npcType, label, facing, spriteKey, configJson }
}

export function writeNpcProps(obj: TmjMapObject, props: NpcObjectProps): void {
  obj.name = props.npcId
  obj.type = 'npc'
  setObjectProperties(obj, {
    npcId: props.npcId,
    npcType: props.npcType,
    label: props.label,
    facing: props.facing,
    spriteKey: props.spriteKey,
    configJson: props.configJson,
  })
}
