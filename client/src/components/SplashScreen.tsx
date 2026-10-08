import { motion } from 'motion/react'
import { overlayMotion } from './motion/motionPresets'
import { PreGameBackdrop } from './PreGameBackdrop'

export type SplashPhase = 'boot' | 'session' | 'world' | 'map'

const PHASE_SUBTITLE: Record<SplashPhase, string> = {
  boot: 'Starting up…',
  session: 'Loading character…',
  world: 'Preparing world…',
  map: 'Loading map',
}

type Props = {
  phase: SplashPhase
  headline?: string
  detail?: string
  progress?: number
}

export function SplashScreen({ phase, headline, detail, progress }: Props) {
  const showProgress = progress !== undefined && phase === 'map'
  const progressPct = showProgress ? Math.round(Math.min(1, Math.max(0, progress)) * 100) : 0

  const subtitle =
    phase === 'map' && headline
      ? headline
      : phase === 'world' && detail === 'dungeon'
        ? 'Checking instance…'
        : PHASE_SUBTITLE[phase]

  return (
    <motion.div
      className="splash-screen"
      role="status"
      aria-live="polite"
      aria-busy="true"
      {...overlayMotion}
    >
      <PreGameBackdrop animateTiles />
      <div className="splash-screen__content">
        <p className="splash-screen__title">ROK-MMORPG</p>
        <p className="splash-screen__subtitle">{subtitle}</p>
        {phase === 'map' && detail ? <p className="splash-screen__detail muted small">{detail}</p> : null}
        {showProgress ? (
          <div className="splash-screen__progress-wrap" aria-label={`Loading ${progressPct} percent`}>
            <div className="splash-screen__progress-track">
              <div className="splash-screen__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        ) : (
          <div className="splash-screen__spinner" aria-hidden />
        )}
      </div>
    </motion.div>
  )
}
