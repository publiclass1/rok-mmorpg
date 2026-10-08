import Phaser from 'phaser'
import {
  DEFAULT_CHARACTER_APPEARANCE,
  type CharacterAppearance,
} from '../character/characterAppearance'
import type { EquipSlot } from '../character/characterState'
import { resolveJobAvatarKey } from '../player/playerJobAvatar'
import { capturePlayerSpriteSnapshot } from '../player/playerHudPortrait'
import {
  createPlayerDisplay,
  setPlayerAppearance,
  setPlayerJobAvatar,
  updatePlayerEquipmentLayers,
  type PlayerDisplay,
} from '../player/playerSprites'

const PREVIEW_SCENE_KEY = 'PlayerPreviewScene'
const PREVIEW_READY_EVENT = 'preview-scene-ready'

class PlayerPreviewScene extends Phaser.Scene {
  display!: PlayerDisplay

  constructor() {
    super(PREVIEW_SCENE_KEY)
  }

  create() {
    this.display = createPlayerDisplay(this, 0, 0, DEFAULT_CHARACTER_APPEARANCE, 'novice')
    this.game.events.emit(PREVIEW_READY_EVENT, this)
  }
}

let readyPromise: Promise<PlayerPreviewScene> | null = null
let previewHost: HTMLDivElement | null = null

function ensurePreviewHost(): HTMLDivElement {
  if (previewHost?.isConnected) return previewHost
  previewHost = document.createElement('div')
  previewHost.setAttribute('aria-hidden', 'true')
  previewHost.style.cssText =
    'position:fixed;left:-10000px;top:0;width:64px;height:64px;overflow:hidden;visibility:hidden;pointer-events:none;'
  document.body.appendChild(previewHost)
  return previewHost
}

function ensurePreviewScene(): Promise<PlayerPreviewScene> {
  if (readyPromise) return readyPromise

  readyPromise = new Promise((resolve) => {
    // HEADLESS has no renderer; character sheets use Graphics.generateTexture().
    new Phaser.Game({
      type: Phaser.CANVAS,
      parent: ensurePreviewHost(),
      width: 64,
      height: 64,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      scene: [PlayerPreviewScene],
      callbacks: {
        preBoot: (game) => {
          game.events.once(PREVIEW_READY_EVENT, (scene: PlayerPreviewScene) => {
            resolve(scene)
          })
        },
      },
    })
  })

  return readyPromise
}

export type PlayerPreviewParams = {
  appearance: CharacterAppearance
  jobId?: string
  equipment: Record<EquipSlot, string | null>
}

let latestParams: PlayerPreviewParams | null = null
let mutex: Promise<unknown> = Promise.resolve()

function applyPreviewParams(display: PlayerDisplay, params: PlayerPreviewParams) {
  const avatarKey = resolveJobAvatarKey(params.jobId ?? 'novice')
  if (display.avatarKey !== avatarKey) {
    setPlayerJobAvatar(display, avatarKey)
  }
  setPlayerAppearance(display, params.appearance)
  updatePlayerEquipmentLayers(display, params.equipment)
}

async function captureWithRetries(display: PlayerDisplay): Promise<string | null> {
  const delays = [0, 50, 150, 400]
  let last: string | null = null
  for (const ms of delays) {
    if (ms > 0) {
      await new Promise((r) => window.setTimeout(r, ms))
    }
    last = capturePlayerSpriteSnapshot(display)
    if (last) return last
  }
  return last
}

async function runPreviewRender(params: PlayerPreviewParams): Promise<string | null> {
  const scene = await ensurePreviewScene()
  applyPreviewParams(scene.display, params)
  return captureWithRetries(scene.display)
}

/**
 * Render an in-world-accurate player sprite for UI previews.
 * Concurrent calls coalesce to the latest parameters.
 */
export function renderPlayerPreview(params: PlayerPreviewParams): Promise<string | null> {
  latestParams = params
  const run = mutex.then(async () => {
    let batch = latestParams
    latestParams = null
    if (!batch) return null
    while (latestParams) {
      batch = latestParams
      latestParams = null
    }
    return runPreviewRender(batch)
  })
  mutex = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}
